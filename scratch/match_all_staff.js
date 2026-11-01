const fs = require('fs');

const data = JSON.parse(fs.readFileSync('scratch/all_personnel_data.json', 'utf8'));

// The 22 target staff from prompt:
const targetPersons = [
  { index: 1, name: "Dr. Kashif", role: "HOSPITAL ADMIN", dept: "Khan Hub Hospital", hint: "hospital" },
  { index: 2, name: "Qummar Iqbal", role: "SENIOR OT STAFF", dept: "Khan Hub Hospital", hint: "hospital" },
  { index: 3, name: "NOT SPECIFIED", role: "MEDICAL OFFICER", dept: "Khan Hub Hospital", hint: "hospital", isMo: true },
  { index: 4, name: "Asia", role: "NURSING STAFF (NIGHT SHIFT)", dept: "Khan Hub Hospital", hint: "hospital" },
  { index: 5, name: "Sobia", role: "NURSING STAFF + MAINTENANCE STAFF LEADER", dept: "Khan Hub Hospital", hint: "hospital" },
  { index: 6, name: "Tasleem", role: "REHAB RECEPTIONIST / NURSING STAFF", dept: "Rehabilitation Center / Hospital", hint: "rehab" },
  { index: 7, name: "Nabia", role: "NURSING STAFF", dept: "Khan Hub Hospital", hint: "hospital" },
  { index: 8, name: "Mubashra", role: "RECEPTIONIST", dept: "Khan Hub Hospital", hint: "hospital" },
  { index: 9, name: "Sara", role: "ACCOUNTANT", dept: "Accounts / Hospital / Rehabilitation & Welfare", hint: "hq" },
  { index: 10, name: "Amna", role: "SWEEPER", dept: "Khan Hub Hospital", hint: "hospital" },
  { index: 11, name: "Mubeen", role: "IT ADMIN", dept: "Khan Hub IT Department", hint: "it" },
  { index: 12, name: "Shehlal", role: "GRAPHIC DESIGNER (INTERN)", dept: "Khan Hub IT Department - Marketing & Media Agency", hint: "media" },
  { index: 13, name: "Shahid Mahmood", role: "MARKETING MANAGER", dept: "Khan Hub Marketing & Media Agency", hint: "media" },
  { index: 14, name: "Muhammad Awais", role: "MANAGER", dept: "All Khan Hub Departments", hint: "hq" },
  { index: 15, name: "Miss Noor", role: "INSTRUCTOR", dept: "Khan Hub Educational Complex", hint: "spims" },
  { index: 16, name: "Kamran", role: "REHAB ADMIN", dept: "Khan Hub Rehabilitation Center", hint: "rehab" },
  { index: 17, name: "Mehwish", role: "PSYCHOLOGY STAFF", dept: "Khan Hub Rehabilitation Center", hint: "rehab" },
  { index: 18, name: "Mahkaif Fatima", role: "REHAB INTERN", dept: "Khan Hub Rehabilitation Center", hint: "rehab" },
  { index: 19, name: "Nahid Irfan", role: "ADMIN - JOB CENTER", dept: "Khan Hub Job Center", hint: "jobcenter" },
  { index: 20, name: "Faisal", role: "CEO PERSONAL ASSISTANT (PA) & DRIVER", dept: "Head Office", hint: "hq", alias: "Faisal Noor" },
  { index: 21, name: "Khalid", role: "SECURITY GUARD (HOSPITAL - NIGHT)", dept: "Khan Hub Private Limited - Security", hint: "hospital" },
  { index: 22, name: "Mazar", role: "SECURITY GUARD", dept: "Khan Hub Private Limited - Security", hint: "hospital" },
];

function normalize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

function matchScore(targetName, candidateName) {
  const t = normalize(targetName);
  const c = normalize(candidateName);
  if (!t || !c) return 0;
  if (t === c) return 100;
  if (c.includes(t) || t.includes(c)) return 80;

  // token match
  const tTokens = t.split(' ');
  const cTokens = c.split(' ');
  const matches = tTokens.filter(tok => cTokens.some(ct => ct === tok || (ct.length > 3 && ct.startsWith(tok))));
  if (matches.length > 0) {
    return 60 + matches.length * 10;
  }
  return 0;
}

const allCollections = Object.keys(data);

console.log('Searching across collections:', allCollections);

const results = [];

targetPersons.forEach(person => {
  if (person.isMo) {
    // Medical Officer search
    const candidates = [];
    allCollections.forEach(col => {
      data[col].forEach(doc => {
        const desig = normalize(doc.designation || doc.role);
        if (desig.includes('medical officer') || desig.includes('doctor') || desig.includes('dr')) {
          candidates.push({ col, doc, score: 90 });
        }
      });
    });
    results.push({ person, candidates, status: candidates.length === 1 ? 'MATCHED' : (candidates.length > 1 ? 'AMBIGUOUS' : 'NOT FOUND') });
    return;
  }

  const candidates = [];

  allCollections.forEach(col => {
    data[col].forEach(doc => {
      const docName = doc.name || doc.displayName || '';
      let score = matchScore(person.name, docName);
      if (person.alias && score < 70) {
        score = Math.max(score, matchScore(person.alias, docName));
      }

      if (score >= 60) {
        // Boost if designation or dept matches
        const desig = normalize(doc.designation || doc.role);
        const roleNorm = normalize(person.role);
        const deptMatches = col.includes(person.hint);
        
        candidates.push({
          col,
          doc,
          score: score + (deptMatches ? 15 : 0),
          deptMatches
        });
      }
    });
  });

  candidates.sort((a, b) => b.score - a.score);

  let status = 'NOT FOUND';
  if (candidates.length === 1) {
    status = 'MATCHED';
  } else if (candidates.length > 1) {
    // Check if one clearly dominates (score >= 85 and > second candidate by at least 15)
    if (candidates[0].score >= 85 && (candidates[0].score - candidates[1].score >= 15)) {
      status = 'MATCHED';
    } else {
      status = 'AMBIGUOUS';
    }
  }

  results.push({ person, candidates, status });
});

console.log('\n--- MATCHING RESULTS ---');
results.forEach(({ person, candidates, status }) => {
  console.log(`\n[${person.index}] ${person.name} (${person.role}) -> ${status}`);
  if (candidates.length > 0) {
    candidates.slice(0, 3).forEach(c => {
      const d = c.doc;
      const dutiesCount = Array.isArray(d.duties) ? d.duties.length : 0;
      console.log(`    Candidate: ${c.col}/${d._id} | Name: "${d.name || d.displayName}" | Desig: "${d.designation || d.role}" | Duties: ${dutiesCount} | Score: ${c.score}`);
    });
  }
});

fs.writeFileSync('scratch/match_results.json', JSON.stringify(results, null, 2));
