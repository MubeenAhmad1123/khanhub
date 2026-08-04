const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const lineMatch = envContent.match(/FIREBASE_PRIVATE_KEY="(.*)"/);
let rawKey = lineMatch ? lineMatch[1] : '';

const cleanPem = rawKey
  .replace(/\\n/g, '\n')
  .replace(/\\(.)/g, '$1')
  .trim();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: 'khanhub-5e552',
      clientEmail: 'firebase-adminsdk-fbsvc@khanhub-5e552.iam.gserviceaccount.com',
      privateKey: cleanPem
    })
  });
}

const db = admin.firestore();

const staffUpdates = [
  {
    id: '74',
    name: 'Mrs. Asyah Kanwal',
    dressCodeConfig: [
      { key: 'black_ot_kit', label: 'Black OT Kit' },
      { key: 'white_overall', label: 'White Overall' },
      { key: 'hijab_cap', label: 'Hijab / Cap' },
      { key: 'black_shoes', label: 'Black Shoes' },
      { key: 'card', label: 'Employee Card' }
    ]
  },
  {
    id: '54',
    name: 'Kashmala Nazar',
    dressCodeConfig: [
      { key: 'black_uniform', label: 'Black Uniform' },
      { key: 'lab_coat', label: 'Lab Coat' },
      { key: 'hijab', label: 'Hijab' },
      { key: 'black_shoes', label: 'Black Shoes' },
      { key: 'card', label: 'Employee Card' }
    ]
  },
  {
    id: '64',
    name: 'Sobia Javed',
    dressCodeConfig: [
      { key: 'black_uniform', label: 'Black Uniform' },
      { key: 'white_overall', label: 'White Overall' },
      { key: 'hijab', label: 'Hijab' },
      { key: 'black_shoes', label: 'Black Shoes' },
      { key: 'card', label: 'Employee Card' }
    ]
  },
  {
    id: '69',
    name: 'Mubashra Kiran',
    dressCodeConfig: [
      { key: 'black_uniform', label: 'Black Uniform' },
      { key: 'lab_coat', label: 'Lab Coat' },
      { key: 'hijab', label: 'Hijab' },
      { key: 'black_shoes', label: 'Black Shoes' },
      { key: 'card', label: 'Employee Card' }
    ]
  },
  {
    id: '57',
    name: 'Nimra',
    dressCodeConfig: [
      { key: 'black_uniform', label: 'Black Uniform' },
      { key: 'white_overall', label: 'White Overall' },
      { key: 'hijab', label: 'Hijab' },
      { key: 'black_shoes', label: 'Black Shoes' },
      { key: 'card', label: 'Employee Card' }
    ]
  },
  {
    id: '47',
    name: 'Israr',
    dressCodeConfig: [
      { key: 'clean_apron_uniform', label: 'Clean Apron / Uniform' },
      { key: 'gloves', label: 'Gloves' },
      { key: 'black_shoes', label: 'Black Shoes' },
      { key: 'card', label: 'Employee Card' }
    ]
  },
  {
    id: '67',
    name: 'Faisal Noor',
    dressCodeConfig: [
      { key: 'black_pa_uniform', label: 'Black PA Uniform' },
      { key: 'black_shoes', label: 'Black Shoes' },
      { key: 'card', label: 'Employee Card' }
    ]
  },
  {
    id: '73',
    name: 'Muhammad Yameen',
    dressCodeConfig: [
      { key: 'office_uniform', label: 'Office Uniform' },
      { key: 'black_shoes', label: 'Black Shoes' },
      { key: 'card', label: 'Employee Card' }
    ]
  },
  {
    id: '51',
    name: 'Mubeen Ahmad',
    dressCodeConfig: [
      { key: 'dress_pant', label: 'Dress Pant' },
      { key: 'dress_shirt', label: 'Dress Shirt' },
      { key: 'black_shoes', label: 'Black Shoes' },
      { key: 'card', label: 'Employee Card' }
    ]
  },
  {
    id: '46',
    name: 'Nahid Irfan',
    dressCodeConfig: [
      { key: 'card', label: 'Employee Card' }
    ]
  },
  {
    id: '65',
    name: 'Mehwish Batool',
    dressCodeConfig: [
      { key: 'black_uniform', label: 'Black Uniform' },
      { key: 'lab_coat', label: 'Lab Coat' },
      { key: 'hijab', label: 'Hijab' },
      { key: 'black_shoes', label: 'Black Shoes' },
      { key: 'card', label: 'Employee Card' }
    ]
  },
  {
    id: '42',
    name: 'Saif Ullah Kamran',
    dressCodeConfig: [
      { key: 'dress_pant', label: 'Dress Pant' },
      { key: 'dress_shirt', label: 'Dress Shirt' },
      { key: 'black_shoes', label: 'Black Shoes' },
      { key: 'card', label: 'Employee Card' }
    ]
  },
  {
    id: '60',
    name: 'Muhammad Khalid Javed',
    dressCodeConfig: [
      { key: 'security_uniform', label: 'Security Uniform' },
      { key: 'security_cap', label: 'Security Cap' },
      { key: 'whistle', label: 'Whistle' },
      { key: 'torch', label: 'Torch' },
      { key: 'black_shoes', label: 'Black Shoes' },
      { key: 'card', label: 'Employee Card' }
    ]
  },
  {
    id: '66',
    name: 'Zaheer Abbas',
    dressCodeConfig: [
      { key: 'security_uniform', label: 'Security Uniform' },
      { key: 'security_cap', label: 'Security Cap' },
      { key: 'whistle', label: 'Whistle' },
      { key: 'torch', label: 'Torch' },
      { key: 'black_shoes', label: 'Black Shoes' },
      { key: 'card', label: 'Employee Card' }
    ]
  },
  {
    id: '72',
    name: 'Rehan Fazal',
    dressCodeConfig: [
      { key: 'dress_pant', label: 'Dress Pant' },
      { key: 'dress_shirt', label: 'Dress Shirt' },
      { key: 'black_shoes', label: 'Black Shoes' },
      { key: 'card', label: 'Employee Card' }
    ]
  },
  {
    id: '71',
    name: 'Noor Maham',
    dressCodeConfig: [
      { key: 'card', label: 'Employee Card' }
    ]
  }
];

async function main() {
  console.log('Starting staff uniform configuration update...');
  let totalUpdated = 0;

  const allCollections = ['hospital_users', 'rehab_users', 'spims_users', 'it_users', 'jobcenter_users', 'media_users', 'hq_users', 'sukoon_users', 'welfare_users'];

  for (const update of staffUpdates) {
    console.log(`Processing Staff ID ${update.id}: ${update.name}`);

    for (const colName of allCollections) {
      const colRef = db.collection(colName);
      
      // Direct doc ID
      const directDocRef = colRef.doc(update.id);
      const directSnap = await directDocRef.get();
      if (directSnap.exists) {
        await directDocRef.set({ dressCodeConfig: update.dressCodeConfig }, { merge: true });
        console.log(`  ✓ Updated direct doc ${colName}/${update.id}`);
        totalUpdated++;
      }

      // Prefixed doc ID e.g. hospital_74
      const prefix = colName.replace('_users', '');
      const prefixedDocRef = colRef.doc(`${prefix}_${update.id}`);
      const prefixedSnap = await prefixedDocRef.get();
      if (prefixedSnap.exists) {
        await prefixedDocRef.set({ dressCodeConfig: update.dressCodeConfig }, { merge: true });
        console.log(`  ✓ Updated prefixed doc ${colName}/${prefix}_${update.id}`);
        totalUpdated++;
      }

      // Query by customId
      const q1 = await colRef.where('customId', '==', update.id).get();
      for (const d of q1.docs) {
        await d.ref.set({ dressCodeConfig: update.dressCodeConfig }, { merge: true });
        console.log(`  ✓ Updated customId doc ${colName}/${d.id}`);
        totalUpdated++;
      }

      // Query by staffId
      const q2 = await colRef.where('staffId', '==', update.id).get();
      for (const d of q2.docs) {
        await d.ref.set({ dressCodeConfig: update.dressCodeConfig }, { merge: true });
        console.log(`  ✓ Updated staffId doc ${colName}/${d.id}`);
        totalUpdated++;
      }

      // Query by name (case-insensitive fuzzy check)
      const q3 = await colRef.get();
      for (const d of q3.docs) {
        const data = d.data();
        const dName = String(data.name || data.displayName || '').toLowerCase().trim();
        const updateName = update.name.toLowerCase().trim();
        if (dName && (dName === updateName || dName.includes(updateName) || updateName.includes(dName))) {
          await d.ref.set({ dressCodeConfig: update.dressCodeConfig }, { merge: true });
          console.log(`  ✓ Updated name-matched doc ${colName}/${d.id} (${data.name})`);
          totalUpdated++;
        }
      }
    }
  }

  console.log(`\n🎉 Successfully updated ${totalUpdated} staff document instances across all collections in Firestore!`);
  process.exit(0);
}

main().catch(err => {
  console.error('Error updating staff uniforms:', err);
  process.exit(1);
});
