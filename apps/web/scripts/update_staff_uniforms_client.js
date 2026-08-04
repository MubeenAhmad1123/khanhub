const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, collection, doc, getDoc, setDoc, getDocs, query, where } = require('firebase/firestore');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const parts = trimmed.split('=');
    const key = parts[0].trim();
    let val = parts.slice(1).join('=').trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    process.env[key] = val;
  }
});

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

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
      // Direct doc ID
      const directRef = doc(db, colName, update.id);
      const directSnap = await getDoc(directRef).catch(() => null);
      if (directSnap && directSnap.exists()) {
        await setDoc(directRef, { dressCodeConfig: update.dressCodeConfig }, { merge: true });
        console.log(`  ✓ Updated direct doc ${colName}/${update.id}`);
        totalUpdated++;
      }

      // Prefixed doc ID e.g. hospital_74
      const prefix = colName.replace('_users', '');
      const prefixedRef = doc(db, colName, `${prefix}_${update.id}`);
      const prefixedSnap = await getDoc(prefixedRef).catch(() => null);
      if (prefixedSnap && prefixedSnap.exists()) {
        await setDoc(prefixedRef, { dressCodeConfig: update.dressCodeConfig }, { merge: true });
        console.log(`  ✓ Updated prefixed doc ${colName}/${prefix}_${update.id}`);
        totalUpdated++;
      }

      // Query by customId
      const q1Snap = await getDocs(query(collection(db, colName), where('customId', '==', update.id))).catch(() => ({ docs: [] }));
      for (const d of q1Snap.docs) {
        await setDoc(d.ref, { dressCodeConfig: update.dressCodeConfig }, { merge: true });
        console.log(`  ✓ Updated customId doc ${colName}/${d.id}`);
        totalUpdated++;
      }

      // Query by staffId
      const q2Snap = await getDocs(query(collection(db, colName), where('staffId', '==', update.id))).catch(() => ({ docs: [] }));
      for (const d of q2Snap.docs) {
        await setDoc(d.ref, { dressCodeConfig: update.dressCodeConfig }, { merge: true });
        console.log(`  ✓ Updated staffId doc ${colName}/${d.id}`);
        totalUpdated++;
      }
    }
  }

  console.log(`Successfully updated ${totalUpdated} staff documents!`);
  process.exit(0);
}

main().catch(err => {
  console.error('Error updating staff uniforms:', err);
  process.exit(1);
});
