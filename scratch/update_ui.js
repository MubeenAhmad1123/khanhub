const fs = require('fs');

function updateStaffProfileReport() {
  const file = 'apps/web/src/components/hq/StaffProfileReport.tsx';
  let c = fs.readFileSync(file, 'utf8');
  const isCRLF = c.includes('\r\n');
  const normC = c.replace(/\r\n/g, '\n');

  const oldBlock = `{staff.dutyConfig && staff.dutyConfig.length > 0 ? (
                    staff.dutyConfig.map((item) => (
                      <span
                        key={item.key}
                        className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-gray-50 text-gray-700 border border-gray-200 rounded"
                      >
                        {item.label}
                      </span>
                    ))
                  ) : (`;

  const newBlock = `{(staff.dutyConfig?.length || staff.duties?.length) ? (
                    (staff.dutyConfig?.length
                      ? staff.dutyConfig
                      : staff.duties.map((d: any, idx: number) => ({
                          key: d.key || d.id || ('duty-' + idx),
                          label: typeof d === 'string' ? d : (d.label || d.name || d.dutyName || d.description || 'Duty item')
                        }))
                    ).map((item: any) => (
                      <span
                        key={item.key}
                        className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-gray-50 text-gray-700 border border-gray-200 rounded"
                      >
                        {item.label}
                      </span>
                    ))
                  ) : (`;

  if (!normC.includes(oldBlock)) {
    console.error('Old block not found in StaffProfileReport.tsx');
    return false;
  }

  let replaced = normC.replace(oldBlock, newBlock);
  if (isCRLF) {
    replaced = replaced.replace(/\n/g, '\r\n');
  }
  fs.writeFileSync(file, replaced, 'utf8');
  console.log('Updated StaffProfileReport.tsx');
  return true;
}

function updateHospitalStaffPage() {
  const file = 'apps/web/src/app/departments/hospital/dashboard/staff/page.tsx';
  let c = fs.readFileSync(file, 'utf8');
  const isCRLF = c.includes('\r\n');
  const normC = c.replace(/\r\n/g, '\n');

  const oldTarget = `const label = duty.label || duty.description || 'Duty item';`;
  const newTarget = `const label = duty.label || duty.name || duty.dutyName || duty.description || (typeof duty === 'string' ? duty : 'Duty item');`;

  if (!normC.includes(oldTarget)) {
    console.log('Target not found in hospital staff page');
    return false;
  }

  let replaced = normC.replace(oldTarget, newTarget);
  if (isCRLF) {
    replaced = replaced.replace(/\n/g, '\r\n');
  }
  fs.writeFileSync(file, replaced, 'utf8');
  console.log('Updated hospital staff page.tsx');
  return true;
}

function updateRehabStaffPage() {
  const file = 'apps/web/src/app/departments/rehab/dashboard/staff/page.tsx';
  let c = fs.readFileSync(file, 'utf8');
  const isCRLF = c.includes('\r\n');
  const normC = c.replace(/\r\n/g, '\n');

  const oldTarget = `const label = duty.label || duty.dutyName || duty.description || (typeof duty === 'string' ? duty : 'Unknown Duty');`;
  const newTarget = `const label = duty.label || duty.name || duty.dutyName || duty.description || (typeof duty === 'string' ? duty : 'Unknown Duty');`;

  if (!normC.includes(oldTarget)) {
    console.log('Target not found in rehab staff page');
    return false;
  }

  let replaced = normC.replace(oldTarget, newTarget);
  if (isCRLF) {
    replaced = replaced.replace(/\n/g, '\r\n');
  }
  fs.writeFileSync(file, replaced, 'utf8');
  console.log('Updated rehab staff page.tsx');
  return true;
}

updateStaffProfileReport();
updateHospitalStaffPage();
updateRehabStaffPage();
