const admin = require('firebase-admin');

const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDf3fRjQ0a1iHNP
MPam9m1MqgT0KPwHRXfYE+nIVnml/0HAveHXtW7jmRVMSZ6fJjSh4AeXQO0lQs16
7hOXtf0LpMZ8fKWHjsghk92KkuH3Qg/Yl58I9TY1I+ytmu+T3456wiKeo+SYC5se
6ARmOQCm/O/YORf+iskV/FsPuAu4ct9jh4S9R7gxbNie6b7E7ZyBdFJsveqNjPRa
LtwgTFOpjEzu/byVurGQgz+mLQ/W3XvpAYG44fCwCYr0eh+ZBer4KfqJo+qte3Pc
e2HgmRfjpmj6GeGqE+boeQLymDEb2CKEYpeEmBMOPB64Upy3iuXiv3iKlcU06qJE
XxtdaLy5AgMBAAECggEAAniH//3Nbqd+OPuIsrhkOxpin5yW24WwGERv/3QPjP4k
6E8Fim9INV7f1fhiCyOiz76R7DYdPUdgI+EzeiiHeDG/tMNb4lBf8vIh5o5rpl
7mAOCKKcNziZniOS+AYu+Q/iI0TFJcsgVSupEMUZoBOJRNEB1h9gr3YaPdwsKkb6
WI4yrVZyu1T+iUSOB0p0I2xsyAQWZNqrvo9w/YVWIAJaAFwldOZ8c+pOnLKp55aL
MDhQHwJCD6uZ+4CkakVEqIgdjeRkeiRsm7ygA4JIs6oBv6SJJFn9T0uSrlEFoLy2
Yxu8ELsoTAlvW+DleFUfGzkEdDMaAg0h5TApJ2IzYQKBgQDzFuIuPRIfxzKYDvJT
y1AnFeCrE0oathDlQKtjdqYmy3TNFu7C/y+dDvnEeHWJEdZ0RbzyGXNCQtP7r+iM
RWRyfSwTIO23fYdfBbVWU4FXvP3vLEs5CLkGKrl3IEqGcLPhbihdPDtT0bZyu+FN
Blf4ReB880dMRLGFtLCrmbywLQKBgQDrwbfG+Y7+a7177XyA+Pj4piCtF41igIQa
7twcEVlh82TisF4U0rq74noxrhdXukBTV3hZH6bt68uB5nELVd3Hl705g908b5NQ
edjF5mkTsZ1buh+LxFijaazqPQ43nN1PEixdCaPf2JOSCgl9gJ70GO8kNvZkPTWX
YAAwOHUKPQKBgGOzC/sI4ykTauXAo5TIe0w8hdPEao1ABPfxqRl3LTgWFAaVlEF3
phCVds0k1pfsL/eqLo9g7svLWuQMRqVZRJRMUEpcJAMwwdewIKqSPyc8BS4WDZgL
ws8LsNtx6/7ttGkN5BIxROfgyCKQehw8MNJL3oGAyco3FlQPQrJusFvVAoGBANed
nihi+cRsbKmdHIhFKo1m1hjkIS1SFOUzwm/pHm7nLwr7YkpL0z7e6QAtjrxGa0+3l
F7pbCm6asrsRKN43H+jFTFhn01TMrqxxY+JLAlrynHoh1WwcnPyHT4/DW1ddbcI9
WrmUcX3uM7ji2R8hHT8d9sjmQ54VpQfW0xVG7TP5AoGAInhWsiFHt9O0WHn6I5mW
kJJllKz00rKI9zxlwFXRxVVe7YbXp0HXes8XGNMdLQi0/KvNQCTzt5cE7wxqvRu6
QKsfgWaeSrY0yUSRJk726kl8vsU0vaWvzdglim5ip3wuUT3AXb5Hek/CDEc0Bxld
hIXyIMDqnmYsvzSSpRLRvnE=
-----END PRIVATE KEY-----`;

const serviceAccount = {
  projectId: "khanhub-5e552",
  clientEmail: "firebase-adminsdk-fbsvc@khanhub-5e552.iam.gserviceaccount.com",
  privateKey: privateKey
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function check() {
  console.log('--- REHAB USERS ---');
  const snap = await db.collection('rehab_users').limit(10).get();
  snap.forEach(doc => {
    console.log(doc.id, doc.data());
  });
  
  console.log('\n--- HQ USERS ---');
  const hqSnap = await db.collection('hq_users').limit(10).get();
  hqSnap.forEach(doc => {
    console.log(doc.id, doc.data());
  });
}

check().catch(console.error);
