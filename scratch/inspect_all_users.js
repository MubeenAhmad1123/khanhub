const fs = require('fs');
const https = require('https');

const configPath = 'C:\\Users\\premier\\.config\\configstore\\firebase-tools.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const projectId = 'khanhub-5e552';
const token = config.tokens.access_token;

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
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) return reject(new Error(parsed.error.message));
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
  do {
    const res = await fetchCollection(colName, pageToken);
    all = all.concat(res.docs);
    pageToken = res.nextPageToken;
  } while (pageToken);
  return all;
}

async function run() {
  const userCollections = [
    'hq_users',
    'hospital_users',
    'rehab_users',
    'spims_users',
    'it_users',
    'media_users',
    'jobcenter_users',
    'sukoon_users',
    'welfare_users',
    'hospital_staff',
    'spims_staff'
  ];

  const fullData = {};

  for (const col of userCollections) {
    const docs = await getAllDocs(col);
    fullData[col] = docs;
    console.log(`\n================ ${col} (${docs.length} docs) ================`);
    docs.forEach((d, i) => {
      if (i < 3) {
        console.log(`Sample [${i+1}] ID: ${d._id}`);
        console.log(`  employeeId : ${d.employeeId || d.customId || d.staffId || 'none'}`);
        console.log(`  name       : ${d.name || d.displayName}`);
        console.log(`  designation: ${d.designation || d.role}`);
        console.log(`  duties     :`, Array.isArray(d.duties) ? `Array (${d.duties.length})` : typeof d.duties);
        if (Array.isArray(d.duties) && d.duties.length > 0) {
          console.log(`  duties[0]  :`, JSON.stringify(d.duties[0]));
        }
      }
    });
  }

  fs.writeFileSync('scratch/all_personnel_data.json', JSON.stringify(fullData, null, 2));
  console.log('\nSaved all personnel data to scratch/all_personnel_data.json');
}

run().catch(console.error);
