const admin = require('d:/khanhub/node_modules/firebase-admin');
const fs = require('fs');

const envFile = fs.readFileSync('d:\\khanhub\\apps\\web\\.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const cleanLine = line.replace(/\r/g, '').trim();
  const match = cleanLine.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value;
  }
});

const projectId = env.FIREBASE_PROJECT_ID;
const clientEmail = env.FIREBASE_CLIENT_EMAIL;
const rawPrivateKey = env.FIREBASE_PRIVATE_KEY || '';

const cleanKey = rawPrivateKey
  .replace(/^["']|["']$/g, '') // Remove wrapping quotes
  .replace(/\\n/g, '\n')       // Replace literal \n with real newlines
  .replace(/\\/g, '')          // Strip all remaining backslashes
  .trim();                     // Remove any accidental whitespace

if (!projectId || !clientEmail || !cleanKey) {
  console.error("Missing credentials:", { projectId, clientEmail, hasKey: !!cleanKey });
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey: cleanKey,
  })
});

const db = admin.firestore();

function mergeActivities(activitiesList) {
  const merged = {};
  for (const list of activitiesList) {
    if (!Array.isArray(list)) continue;
    for (const act of list) {
      if (!act || !act.key) continue;
      const existing = merged[act.key];
      if (!existing) {
        merged[act.key] = { ...act };
      } else {
        const sCurrent = act.status;
        const sExisting = existing.status;
        if (sCurrent === 'done' || (sCurrent === 'not_done' && sExisting !== 'done')) {
          existing.status = sCurrent;
        }
        if (act.label && !existing.label) {
          existing.label = act.label;
        }
      }
    }
  }
  return Object.values(merged);
}

function mergeStrings(val1, val2) {
  const s1 = String(val1 || '').trim();
  const s2 = String(val2 || '').trim();
  if (!s1) return s2;
  if (!s2) return s1;
  if (s1 === s2) return s1;
  return `${s1}\n${s2}`;
}

function mergeTimestamps(ts1, ts2, type) {
  if (!ts1) return ts2;
  if (!ts2) return ts1;
  const d1 = ts1.toDate ? ts1.toDate() : new Date(ts1);
  const d2 = ts2.toDate ? ts2.toDate() : new Date(ts2);
  if (type === 'oldest') {
    return d1 < d2 ? ts1 : ts2;
  } else {
    return d1 > d2 ? ts1 : ts2;
  }
}

const collectionsToMigrate = [
  { name: 'rehab_daily_activities', entityIdKey: 'patientId' },
  { name: 'hospital_daily_activities', entityIdKey: 'patientId' },
  { name: 'jobcenter_daily_activities', entityIdKey: 'seekerId' },
  { name: 'sukoon_daily_activities', entityIdKey: 'clientId' },
  { name: 'welfare_daily_activities', entityIdKey: 'childId' }
];

async function migrateCollection({ name, entityIdKey }) {
  console.log(`\n==================================================`);
  console.log(`Starting migration for collection: ${name}`);
  console.log(`==================================================`);
  
  const snapshot = await db.collection(name).get();
  console.log(`Total documents found in ${name}: ${snapshot.size}`);
  
  const groups = {};
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const entityId = data[entityIdKey];
    const date = data.date;
    
    if (!entityId || !date) {
      console.warn(`Skipping doc ${doc.id} with missing ${entityIdKey} or date:`, data);
      return;
    }
    
    const key = `${entityId}_${date}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push({ id: doc.id, data });
  });

  let processedCount = 0;
  let mergedCount = 0;
  
  for (const [key, docs] of Object.entries(groups)) {
    const targetDocId = key;
    
    // We need to merge and write to targetDocId if:
    // 1. There are duplicate docs (docs.length > 1)
    // 2. The single doc's id is not equal to targetDocId (i.e. it was written with auto-ID)
    const needsMigration = docs.length > 1 || docs[0].id !== targetDocId;
    
    if (needsMigration) {
      console.log(`\nMigrating group key: ${key}`);
      console.log(`Current doc IDs:`, docs.map(d => d.id));
      
      // Initialize merge values from the first document
      let mergedData = { ...docs[0].data };
      
      // Merge other documents if any
      for (let i = 1; i < docs.length; i++) {
        const docData = docs[i].data;
        
        // Merge activities array
        mergedData.activities = mergeActivities([mergedData.activities, docData.activities]);
        
        // Merge notes fields
        mergedData.counsellingSessionNotes = mergeStrings(mergedData.counsellingSessionNotes, docData.counsellingSessionNotes);
        mergedData.vitalSignNotes = mergeStrings(mergedData.vitalSignNotes, docData.vitalSignNotes);
        mergedData.careerCounsellingNotes = mergeStrings(mergedData.careerCounsellingNotes, docData.careerCounsellingNotes);
        mergedData.placementStatusNotes = mergeStrings(mergedData.placementStatusNotes, docData.placementStatusNotes);
        mergedData.generalNotes = mergeStrings(mergedData.generalNotes, docData.generalNotes);
        
        // Merge markedBy
        mergedData.markedBy = mergeStrings(mergedData.markedBy, docData.markedBy);
        
        // Merge timestamps
        mergedData.createdAt = mergeTimestamps(mergedData.createdAt, docData.createdAt, 'oldest');
        mergedData.updatedAt = mergeTimestamps(mergedData.updatedAt, docData.updatedAt, 'newest');
      }
      
      // Ensure updatedAt exists
      if (!mergedData.updatedAt) {
        mergedData.updatedAt = admin.firestore.Timestamp.now();
      }
      
      // Set the merged document with the new deterministic ID
      await db.collection(name).doc(targetDocId).set(mergedData);
      console.log(`Written merged document with ID: ${targetDocId}`);
      
      // Delete old documents (but DO NOT delete the targetDocId if it was one of the documents)
      for (const doc of docs) {
        if (doc.id !== targetDocId) {
          await db.collection(name).doc(doc.id).delete();
          console.log(`Deleted old document ID: ${doc.id}`);
        }
      }
      
      processedCount++;
      if (docs.length > 1) {
        mergedCount += (docs.length - 1);
      }
    }
  }
  
  console.log(`\nFinished ${name}: Migrated/Merged ${processedCount} groups, deleted ${mergedCount} duplicates.`);
}

async function main() {
  for (const col of collectionsToMigrate) {
    await migrateCollection(col);
  }
  console.log("\nAll daily activities collections successfully migrated!");
}

main().catch(console.error);
