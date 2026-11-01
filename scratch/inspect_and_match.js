// scratch/inspect_and_match.js
const fs = require('fs');
const https = require('https');

const configPath = 'C:\\Users\\premier\\.config\\configstore\\firebase-tools.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const projectId = 'khanhub-5e552';

let accessToken = config.tokens.access_token;
const refreshToken = config.tokens.refresh_token;

// Function to refresh OAuth access token if needed
function refreshAccessToken() {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      client_id: config.clientId || '563584335869-fgrhgmd47bqnekij5i8b5pr03ho85qd6.apps.googleusercontent.com',
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }).toString();

    const options = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.access_token) {
            accessToken = parsed.access_token;
            // update file
            config.tokens.access_token = accessToken;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            resolve(accessToken);
          } else {
            resolve(accessToken); // try current
          }
        } catch (e) {
          resolve(accessToken);
        }
      });
    });
    req.on('error', () => resolve(accessToken));
    req.write(postData);
    req.end();
  });
}

function parseFirestoreValue(val) {
  if (!val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    const arr = val.arrayValue.values || [];
    return arr.map(parseFirestoreValue);
  }
  if ('mapValue' in val) {
    const fields = val.mapValue.fields || {};
    const res = {};
    for (const k in fields) {
      res[k] = parseFirestoreValue(fields[k]);
    }
    return res;
  }
  return null;
}

function parseFirestoreDoc(doc) {
  if (!doc) return null;
  const id = doc.name.split('/').pop();
  const fields = doc.fields || {};
  const data = { _id: id };
  for (const k in fields) {
    // Redact sensitive fields per safety rules
    const lk = k.toLowerCase();
    if (lk.includes('password') || lk.includes('pin') || lk.includes('cnic') || lk.includes('phone') || lk.includes('salary')) {
      data[k] = '[REDACTED]';
    } else {
      data[k] = parseFirestoreValue(fields[k]);
    }
  }
  return data;
}

function fetchCollection(colName, pageToken = '') {
  return new Promise((resolve, reject) => {
    let path = `/v1/projects/${projectId}/databases/(default)/documents/${colName}?pageSize=300`;
    if (pageToken) path += `&pageToken=${encodeURIComponent(pageToken)}`;

    const req = https.request({
      hostname: 'firestore.googleapis.com',
      path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 401) {
            return reject(new Error('401_UNAUTHORIZED'));
          }
          const parsed = JSON.parse(body);
          if (parsed.error) {
            return reject(new Error(parsed.error.message));
          }
          const docs = (parsed.documents || []).map(parseFirestoreDoc);
          resolve({ docs, nextPageToken: parsed.nextPageToken });
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function getAllDocs(colName) {
  let all = [];
  let pageToken = '';
  try {
    do {
      const res = await fetchCollection(colName, pageToken);
      all = all.concat(res.docs);
      pageToken = res.nextPageToken;
    } while (pageToken);
  } catch (err) {
    if (err.message === '401_UNAUTHORIZED') {
      await refreshAccessToken();
      return getAllDocs(colName);
    }
    console.error(`Error fetching collection ${colName}:`, err.message);
  }
  return all;
}

async function run() {
  console.log('Refreshing token...');
  await refreshAccessToken();

  const collections = [
    'hospital_staff',
    'rehab_staff',
    'hq_staff',
    'it_staff',
    'media_staff',
    'spims_staff',
    'jobcenter_staff',
    'job_center_staff',
    'welfare_staff',
    'sukoon_staff'
  ];

  console.log('\n======================================================');
  console.log('PHASE 1: INSPECTION OF EXISTING STAFF COLLECTIONS');
  console.log('======================================================');

  const allStaffByCol = {};

  for (const col of collections) {
    const docs = await getAllDocs(col);
    allStaffByCol[col] = docs;
    console.log(`\n--- Collection: ${col} (${docs.length} docs found) ---`);

    const samples = docs.slice(0, 3);
    if (samples.length === 0) {
      console.log('  (Collection is currently empty or not found)');
      continue;
    }

    samples.forEach((doc, idx) => {
      console.log(`  [Sample ${idx + 1}] ID: ${doc._id}`);
      console.log(`    employeeId : ${doc.employeeId || doc.staffId || doc.customId || 'NONE'}`);
      console.log(`    name       : ${doc.name || doc.displayName || 'NONE'}`);
      console.log(`    designation: ${doc.designation || doc.role || 'NONE'}`);
      console.log(`    department : ${doc.department || 'NONE'}`);
      
      const duties = doc.duties;
      if (!duties) {
        console.log(`    duties     : undefined / null`);
      } else if (Array.isArray(duties)) {
        console.log(`    duties     : Array (${duties.length} items)`);
        if (duties.length > 0) {
          console.log(`    duties[0]  :`, JSON.stringify(duties[0]));
        }
      } else {
        console.log(`    duties     : Non-array type (${typeof duties})`);
      }
    });
  }

  // Save the full inspection data to a local file for detailed matching
  fs.writeFileSync('scratch/all_staff_inspected.json', JSON.stringify(allStaffByCol, null, 2));
  console.log('\nSaved full staff dump to scratch/all_staff_inspected.json');
}

run().catch(console.error);
