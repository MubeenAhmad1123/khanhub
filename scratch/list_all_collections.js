const fs = require('fs');
const https = require('https');

const configPath = 'C:\\Users\\premier\\.config\\configstore\\firebase-tools.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const projectId = 'khanhub-5e552';
const token = config.tokens.access_token;

function listCols(pageToken = '') {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ pageToken, pageSize: 300 });
    const req = https.request({
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${projectId}/databases/(default)/documents:listCollectionIds`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  let allCols = [];
  let pageToken = '';
  do {
    const res = await listCols(pageToken);
    allCols = allCols.concat(res.collectionIds || []);
    pageToken = res.nextPageToken;
  } while (pageToken);

  console.log(`Total Root Collections: ${allCols.length}`);
  const staffOrUserCols = allCols.filter(c => c.includes('staff') || c.includes('user'));
  console.log('Staff/User Collections:', staffOrUserCols);
}
run();
