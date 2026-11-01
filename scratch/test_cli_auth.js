const fs = require('fs');
const https = require('https');

const configPath = 'C:\\Users\\premier\\.config\\configstore\\firebase-tools.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const token = config.tokens.access_token;
const projectId = 'khanhub-5e552';

const options = {
  hostname: 'firestore.googleapis.com',
  path: `/v1/projects/${projectId}/databases/(default)/documents/hospital_staff?pageSize=1`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    const parsed = JSON.parse(data);
    if (parsed.documents) {
      console.log('Got document!', parsed.documents[0].name);
    } else {
      console.log('Response:', data);
    }
  });
});

req.on('error', console.error);
req.end();
