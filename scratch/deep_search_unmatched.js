const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scratch/all_personnel_data.json', 'utf8'));

console.log('--- Deep Searching Unmatched and Special Roles ---\n');

const allDocs = [];
for (const col in data) {
  data[col].forEach(d => {
    allDocs.push({ col, ...d });
  });
}

function searchTerms(terms, desigTerms = []) {
  return allDocs.filter(d => {
    const name = String(d.name || d.displayName || '').toLowerCase();
    const desig = String(d.designation || d.role || '').toLowerCase();
    const nameMatch = terms.some(t => name.includes(t.toLowerCase()));
    const desigMatch = desigTerms.length === 0 || desigTerms.some(t => desig.includes(t.toLowerCase()));
    return nameMatch || (desigTerms.length > 0 && desigMatch && terms.length === 0);
  });
}

// 1. Qummar Iqbal (OT staff)
console.log('1. Search for Qummar / OT:');
const otDocs = allDocs.filter(d => {
  const n = (d.name || '').toLowerCase();
  const des = (d.designation || '').toLowerCase();
  return n.includes('qum') || n.includes('qam') || des.includes('ot');
});
otDocs.forEach(d => console.log(`  ${d.col}/${d._id} | Name: "${d.name}" | Desig: "${d.designation}" | Duties:`, Array.isArray(d.duties) ? d.duties.length : d.duties));

// 2. Sara / Accountant
console.log('\n2. Search for Sara / Accountant:');
const accDocs = allDocs.filter(d => {
  const n = (d.name || '').toLowerCase();
  const des = (d.designation || '').toLowerCase();
  return n.includes('sar') || des.includes('account');
});
accDocs.forEach(d => console.log(`  ${d.col}/${d._id} | Name: "${d.name}" | Desig: "${d.designation}" | Duties:`, Array.isArray(d.duties) ? d.duties.length : d.duties));

// 3. Amna / Sweeper
console.log('\n3. Search for Amna / Sweeper:');
const amnaDocs = allDocs.filter(d => {
  const n = (d.name || '').toLowerCase();
  const des = (d.designation || '').toLowerCase();
  return n.includes('amn') || des.includes('sweep') || des.includes('clean');
});
amnaDocs.forEach(d => console.log(`  ${d.col}/${d._id} | Name: "${d.name}" | Desig: "${d.designation}" | Duties:`, Array.isArray(d.duties) ? d.duties.length : d.duties));

// 4. Shehlal / Graphic Designer
console.log('\n4. Search for Shehlal / Designer:');
const desDocs = allDocs.filter(d => {
  const n = (d.name || '').toLowerCase();
  const des = (d.designation || '').toLowerCase();
  return n.includes('sheh') || n.includes('shah') || des.includes('design') || des.includes('graphic');
});
desDocs.forEach(d => console.log(`  ${d.col}/${d._id} | Name: "${d.name}" | Desig: "${d.designation}" | Duties:`, Array.isArray(d.duties) ? d.duties.length : d.duties));

// 5. Mahkaif Fatima / Intern
console.log('\n5. Search for Mahkaif / Intern:');
const mahDocs = allDocs.filter(d => {
  const n = (d.name || '').toLowerCase();
  const des = (d.designation || '').toLowerCase();
  return n.includes('mah') || n.includes('kaif') || des.includes('intern');
});
mahDocs.forEach(d => console.log(`  ${d.col}/${d._id} | Name: "${d.name}" | Desig: "${d.designation}" | Duties:`, Array.isArray(d.duties) ? d.duties.length : d.duties));

// 6. Mazar / Mazhar / Security
console.log('\n6. Search for Mazar / Mazhar / Security:');
const secDocs = allDocs.filter(d => {
  const n = (d.name || '').toLowerCase();
  const des = (d.designation || '').toLowerCase();
  return n.includes('maz') || des.includes('secur') || des.includes('guard');
});
secDocs.forEach(d => console.log(`  ${d.col}/${d._id} | Name: "${d.name}" | Desig: "${d.designation}" | Duties:`, Array.isArray(d.duties) ? d.duties.length : d.duties));

// 7. Medical Officer candidates
console.log('\n7. All Doctors / Medical Officers:');
const moDocs = allDocs.filter(d => {
  const des = (d.designation || '').toLowerCase();
  const n = (d.name || '').toLowerCase();
  return des.includes('medic') || des.includes('doctor') || des.includes('mo') || n.includes('dr');
});
moDocs.forEach(d => console.log(`  ${d.col}/${d._id} | Name: "${d.name}" | Desig: "${d.designation}" | Duties:`, Array.isArray(d.duties) ? d.duties.length : d.duties));
