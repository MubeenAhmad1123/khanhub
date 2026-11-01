const fs = require('fs');

const file = 'apps/web/src/app/hq/dashboard/manager/reports/daily/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Check if FileText is in lucide-react import
if (!code.includes('FileText,')) {
  code = code.replace('Download,', 'Download, FileText,');
}

// 2. Check import DutyProformaModal
if (!code.includes('DutyProformaModal')) {
  code = code.replace(
    "import { toDate, downloadElementAsPng } from '@/lib/utils';",
    "import { toDate, downloadElementAsPng } from '@/lib/utils';\nimport { DutyProformaModal } from '@/components/shared/DutyProformaModal';"
  );
}

// 3. Add state
const stateTarget = 'const [downloading, setDownloading] = useState(false);';
const stateAddition = `const [downloading, setDownloading] = useState(false);
  const [proformaStaff, setProformaStaff] = useState<any | null>(null);
  const [isProformaModalOpen, setIsProformaModalOpen] = useState(false);
  const [isProformaPickerOpen, setIsProformaPickerOpen] = useState(false);
  const [proformaSearch, setProformaSearch] = useState('');`;

if (code.includes(stateTarget) && !code.includes('isProformaModalOpen')) {
  code = code.replace(stateTarget, stateAddition);
}

// 4. Add Top Bar Button right after handleDownloadImage button
const dlButtonTarget = `{downloading ? 'Processing...' : 'Download Report'}
                </button>`;
const dlButtonAddition = `{downloading ? 'Processing...' : 'Download Report'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsProformaPickerOpen(true)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3.5 bg-white border border-gray-100 text-gray-700 rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-gray-50 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                  title="Generate Monthly Duty & Performance Proforma"
                >
                  <FileText size={16} className="text-indigo-600" />
                  <span>Duty Proforma</span>
                </button>`;

if (code.includes(dlButtonTarget)) {
  code = code.replace(dlButtonTarget, dlButtonAddition);
} else {
  const crlfTarget = dlButtonTarget.replace(/\n/g, '\r\n');
  const crlfAddition = dlButtonAddition.replace(/\n/g, '\r\n');
  if (code.includes(crlfTarget)) {
    code = code.replace(crlfTarget, crlfAddition);
  } else {
    console.log('dlButtonTarget not found');
  }
}

// 5. Add Proforma Icon on Desktop Table Row
const rowNameTarget = `{row.name}
                                </a>`;
const rowNameAddition = `{row.name}
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProformaStaff({
                                      id: row.id,
                                      name: row.name,
                                      dept: row.department,
                                      designation: row.designation,
                                      duties: (row as any).duties || [],
                                      dutyConfig: (row as any).dutyConfig || []
                                    });
                                    setIsProformaModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold text-indigo-600 hover:text-indigo-700 underline uppercase tracking-wider"
                                  title="View Monthly Duty Proforma"
                                >
                                  <FileText size={11} /> Proforma Sheet
                                </button>`;

if (code.includes(rowNameTarget)) {
  code = code.replace(rowNameTarget, rowNameAddition);
} else {
  const crlfTarget = rowNameTarget.replace(/\n/g, '\r\n');
  const crlfAddition = rowNameAddition.replace(/\n/g, '\r\n');
  if (code.includes(crlfTarget)) {
    code = code.replace(crlfTarget, crlfAddition);
  } else {
    console.log('rowNameTarget not found');
  }
}

// 6. Add Modal and Picker at bottom
const bottomTarget = `      </div>
    </div>
  );
}`;
const modalsJSX = `
        {/* DUTY PROFORMA MODAL */}
        {isProformaModalOpen && proformaStaff && (
          <DutyProformaModal
            isOpen={isProformaModalOpen}
            onClose={() => {
              setIsProformaModalOpen(false);
              setProformaStaff(null);
            }}
            staff={proformaStaff}
          />
        )}

        {/* STAFF PICKER MODAL FOR PROFORMA */}
        {isProformaPickerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Monthly Duty &amp; Performance Proforma</h3>
                  <p className="text-xs text-gray-500 font-medium">Choose a staff profile to generate their printable sheet</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsProformaPickerOpen(false); setProformaSearch(''); }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="py-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={proformaSearch}
                    onChange={(e) => setProformaSearch(e.target.value)}
                    placeholder="Search staff by name, role or department..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="overflow-y-auto flex-1 divide-y divide-gray-50 -mx-2 px-2">
                {reportData
                  .filter(m => {
                    if (!proformaSearch) return true;
                    const q = proformaSearch.toLowerCase();
                    return (
                      (m.name || '').toLowerCase().includes(q) ||
                      (m.designation || '').toLowerCase().includes(q) ||
                      (m.department || '').toLowerCase().includes(q)
                    );
                  })
                  .map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setProformaStaff({
                          id: m.id,
                          name: m.name,
                          dept: m.department,
                          designation: m.designation,
                          duties: (m as any).duties || [],
                          dutyConfig: (m as any).dutyConfig || []
                        });
                        setIsProformaPickerOpen(false);
                        setIsProformaModalOpen(true);
                      }}
                      className="w-full text-left py-2.5 px-3 hover:bg-indigo-50/60 rounded-xl flex items-center justify-between transition-colors group"
                    >
                      <div>
                        <p className="text-xs font-bold text-gray-900 group-hover:text-indigo-600">{m.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{m.designation || 'Staff'} · <span className="uppercase">{m.department}</span></p>
                      </div>
                      <FileText size={14} className="text-gray-300 group-hover:text-indigo-600" />
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}`;

if (code.includes(bottomTarget)) {
  code = code.replace(bottomTarget, modalsJSX);
} else {
  const crlfTarget = bottomTarget.replace(/\n/g, '\r\n');
  const crlfAddition = modalsJSX.replace(/\n/g, '\r\n');
  if (code.includes(crlfTarget)) {
    code = code.replace(crlfTarget, crlfAddition);
  } else {
    console.log('bottomTarget not found');
  }
}

fs.writeFileSync(file, code, 'utf8');
console.log('daily/page.tsx updated successfully');
