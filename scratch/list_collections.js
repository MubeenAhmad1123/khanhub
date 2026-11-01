const fs = require('fs');
const https = require('https');

const configPath = 'C:\\Users\\premier\\.config\\configstore\\firebase-tools.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const projectId = 'khanhub-5e552';
const token = config.tokens.access_token;

const postData = JSON.stringify({});

const options = {
  hostname: 'firestore.googleapis.com',
  path: `/v1/projects/${projectId}/databases/(default)/documents:listCollectionIds`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Collection IDs:', parsed.collectionIds);
    } catch (e) {
      console.log('Raw:', data);
    }
  });
});

req.on('error', console.error);
req.write(postData);
req.end();
