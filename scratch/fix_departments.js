const fs = require('fs');
const path = require('path');

const depts = ['hospital', 'it', 'job-center', 'social-media', 'spims', 'sukoon', 'welfare'];

depts.forEach(dept => {
  const filePath = path.join(__dirname, '..', 'apps', 'web', 'src', 'app', 'departments', dept, 'dashboard', 'profile', 'page.tsx');
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Add showSalaryBreakdownModal state if not present
  if (!content.includes('showSalaryBreakdownModal')) {
    content = content.replace(
      /const \[salaryRecords, setSalaryRecords\] = useState<(?:SalarySlip\[\]|any\[\])>\(\[\]\);/,
      (match) => `${match}\n  const [showSalaryBreakdownModal, setShowSalaryBreakdownModal] = useState(false);`
    );
  }

  // 2. Fetch contributions daily logs in fetchMetrics
  if (!content.includes(`${dept === 'job-center' ? 'jobcenter' : dept === 'social-media' ? 'media' : dept}_contributions`)) {
    // Check if fetchForCandidates is used (like in IT)
    if (content.includes('fetchForCandidates')) {
      content = content.replace(
        /const \[\s*attSnap,\s*dutySnap,\s*dressSnap,\s*taskSnap,\s*fineSnap,\s*growthSnap,\s*salarySnap\s*\] = await Promise\.all\(\[\s*fetchForCandidates\(`${prefix}_attendance`\),\s*fetchForCandidates\(`${prefix}_duty_logs`\),\s*fetchForCandidates\(`${prefix}_dress_logs`\),\s*fetchForCandidates\(`${prefix}_special_tasks`\),\s*fetchForCandidates\(`${prefix}_fines`\),\s*fetchForCandidates\(`${prefix}_growth_points`\),\s*fetchForCandidates\(`${prefix}_salary_records`\)\s*\]\);/g,
        `const [
        attSnap,
        dutySnap,
        dressSnap,
        taskSnap,
        fineSnap,
        growthSnap,
        contribSnap,
        salarySnap
      ] = await Promise.all([
        fetchForCandidates(\`\${prefix}_attendance\`),
        fetchForCandidates(\`\${prefix}_duty_logs\`),
        fetchForCandidates(\`\${prefix}_dress_logs\`),
        fetchForCandidates(\`\${prefix}_special_tasks\`),
        fetchForCandidates(\`\${prefix}_fines\`),
        fetchForCandidates(\`\${prefix}_growth_points\`),
        fetchForCandidates(\`\${prefix}_contributions\`),
        fetchForCandidates(\`\${prefix}_salary_records\`)
      ]);`
      );

      // In IT page, search for mergeAndSort calls
      content = content.replace(
        /setGrowthHistory\(mergeAndSort\(growthSnap, 'date'\) as any\);/g,
        `const monthlyGpDocs = growthSnap.docs.map((d: any) => d.data());
      const contribRows = contribSnap.docs
        .map((d: any) => d.data())
        .filter((item: any) => item.status === 'yes' || item.isApproved === true)
        .map((item: any) => ({
          id: item.date,
          points: 1,
          reason: item.link ? \`Contribution Link: \${item.link}\` : 'Daily Growth Contribution',
          date: item.date,
          month: item.date.slice(0, 7),
          category: 'Growth Point'
        }));

      monthlyGpDocs.forEach((gpDoc: any) => {
        const extraPoints = Number(gpDoc.extra || 0);
        if (extraPoints > 0) {
          contribRows.push({
            id: \`\${gpDoc.month}_extra\`,
            points: extraPoints,
            reason: \`Monthly Bonus/Extra Points\`,
            date: \`\${gpDoc.month}-28\`,
            month: gpDoc.month,
            category: 'Growth Point Bonus'
          });
        }
      });

      contribRows.sort((a, b) => b.date.localeCompare(a.date));
      setGrowthHistory(contribRows as any);`
      );
    } else {
      // Direct getDocs calls (like hospital, job-center, sukoon, welfare, social-media, spims)
      const prefix = dept === 'job-center' ? 'jobcenter' : dept === 'social-media' ? 'media' : dept;
      content = content.replace(
        /const \[\s*attSnap1,\s*attSnap2,\s*dutySnap1,\s*dutySnap2,\s*dressSnap1,\s*dressSnap2,\s*taskSnap1,\s*taskSnap2,\s*fineSnap1,\s*fineSnap2,\s*growthSnap1,\s*growthSnap2,\s*salarySnap1,\s*salarySnap2\s*\] = await Promise\.all\(\[\s*getDocs\(query\(collection\(db, `\${prefix}_attendance`\),\s*where\('staffId',\s*'==',\s*rawId\)\)\)\.catch\(\(\) => \({ docs: \[\] } as any\)\),\s*getDocs\(query\(collection\(db, `\${prefix}_attendance`\),\s*where\('staffId',\s*'==',\s*prefixedId\)\)\)\.catch\(\(\) => \({ docs: \[\] } as any\)\),[\s\S]+?salarySnap1,\s*salarySnap2\s*\]\);/g,
        `const [
        attSnap1, attSnap2,
        dutySnap1, dutySnap2,
        dressSnap1, dressSnap2,
        taskSnap1, taskSnap2,
        fineSnap1, fineSnap2,
        growthSnap1, growthSnap2,
        contribSnap1, contribSnap2,
        salarySnap1, salarySnap2
      ] = await Promise.all([
        getDocs(query(collection(db, \`\${prefix}_attendance\`), where('staffId', '==', rawId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, \`\${prefix}_attendance\`), where('staffId', '==', prefixedId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, \`\${prefix}_duty_logs\`), where('staffId', '==', rawId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, \`\${prefix}_duty_logs\`), where('staffId', '==', prefixedId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, \`\${prefix}_dress_logs\`), where('staffId', '==', rawId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, \`\${prefix}_dress_logs\`), where('staffId', '==', prefixedId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, \`\${prefix}_special_tasks\`), where('staffId', '==', rawId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, \`\${prefix}_special_tasks\`), where('staffId', '==', prefixedId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, \`\${prefix}_fines\`), where('staffId', '==', rawId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, \`\${prefix}_fines\`), where('staffId', '==', prefixedId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, \`\${prefix}_growth_points\`), where('staffId', '==', rawId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, \`\${prefix}_growth_points\`), where('staffId', '==', prefixedId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, \`\${prefix}_contributions\`), where('staffId', '==', rawId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, \`\${prefix}_contributions\`), where('staffId', '==', prefixedId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, \`\${prefix}_salary_records\`), where('staffId', '==', rawId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, \`\${prefix}_salary_records\`), where('staffId', '==', prefixedId))).catch(() => ({ docs: [] } as any)),
      ]);`
      );

      // Replace setGrowthHistory with contribution mapping
      content = content.replace(
        /setGrowthHistory\(mergeAndSort\(growthSnap1,\s*growthSnap2,\s*'date'\)\s*as\s*any\);/g,
        `const monthlyGpDocs = [...growthSnap1.docs, ...growthSnap2.docs].map((d: any) => d.data());
      const contribRows = [...contribSnap1.docs, ...contribSnap2.docs]
        .map((d: any) => d.data())
        .filter((item: any) => item.status === 'yes' || item.isApproved === true)
        .map((item: any) => ({
          id: item.date,
          points: 1,
          reason: item.link ? \`Contribution Link: \${item.link}\` : 'Daily Growth Contribution',
          date: item.date,
          month: item.date.slice(0, 7),
          category: 'Growth Point'
        }));

      monthlyGpDocs.forEach((gpDoc: any) => {
        const extraPoints = Number(gpDoc.extra || 0);
        if (extraPoints > 0) {
          contribRows.push({
            id: \`\${gpDoc.month}_extra\`,
            points: extraPoints,
            reason: \`Monthly Bonus/Extra Points\`,
            date: \`\${gpDoc.month}-28\`,
            month: gpDoc.month,
            category: 'Growth Point Bonus'
          });
        }
      });

      contribRows.sort((a, b) => b.date.localeCompare(a.date));
      setGrowthHistory(contribRows as any);`
      );
    }
  }

  // 3. Replace salaryDetails implementation
  // Find where const salaryDetails = useMemo starts and ends
  const startIdx = content.indexOf('const salaryDetails = useMemo');
  if (startIdx !== -1) {
    const endIdx = content.indexOf('}, [profile, attendance, fines]);', startIdx);
    if (endIdx !== -1) {
      const fullMatch = content.substring(startIdx, endIdx + '}, [profile, attendance, fines]);'.length);
      
      const newSalaryDetails = `const salaryDetails = useMemo(() => {
    if (!profile) {
      return {
        dailyWage: 0,
        presentDays: 0,
        lateDays: 0,
        paidLeaves: 0,
        unpaidLeaves: 0,
        absentDays: 0,
        payableDays: 0,
        unpaidDays: 0,
        earnings: 0,
        absentDeduction: 0,
        estimatedSalary: 0,
        fines: 0,
        payableDatesList: [] as { date: string; status: string }[],
        deductedDatesList: [] as { date: string; status: string; deduction: number }[]
      };
    }

    const monthlySalary = Number(profile.monthlySalary || profile.salary || 0);
    
    // Days in current month
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const totalDaysCount = new Date(year, month + 1, 0).getDate();
    const currentMonthKey = \`\${year}-\${String(month + 1).padStart(2, '0')}\`;

    const days = [];
    for (let d = 1; d <= totalDaysCount; d++) {
      days.push(\`\${currentMonthKey}-\${String(d).padStart(2, '0')}\`);
    }

    const dailyWage = monthlySalary / totalDaysCount;

    const attendanceMap: Record<string, any> = {};
    attendance.forEach(a => {
      if (a.date) attendanceMap[a.date] = a;
    });

    let presentDays = 0;
    let lateDays = 0;
    let paidLeaves = 0;
    let unpaidLeaves = 0;
    let absentDays = 0;
    let unmarkedDays = 0;

    const payableDatesList: { date: string; status: string }[] = [];
    const deductedDatesList: { date: string; status: string; deduction: number }[] = [];

    const todayStr = today.toISOString().slice(0, 10);

    days.forEach(dayStr => {
      const att = attendanceMap[dayStr];
      const status = att ? att.status : 'unmarked';
      const isPast = dayStr < todayStr;

      if (status === 'present') {
        presentDays++;
        payableDatesList.push({ date: dayStr, status: 'Present' });
      } else if (status === 'late') {
        lateDays++;
        payableDatesList.push({ date: dayStr, status: 'Late' });
      } else if (status === 'leave' || status === 'paid_leave') {
        paidLeaves++;
        payableDatesList.push({ date: dayStr, status: 'Paid Leave' });
      } else if (status === 'unpaid_leave') {
        unpaidLeaves++;
        deductedDatesList.push({ date: dayStr, status: 'Unpaid Leave', deduction: dailyWage });
      } else if (status === 'absent') {
        absentDays++;
        deductedDatesList.push({ date: dayStr, status: 'Absent', deduction: dailyWage });
      } else {
        if (isPast) {
          unmarkedDays++;
          deductedDatesList.push({ date: dayStr, status: 'Unmarked (Past)', deduction: dailyWage });
        }
      }
    });

    const payableDays = presentDays + lateDays + paidLeaves;
    const unpaidDaysTotal = absentDays + unpaidLeaves + unmarkedDays;

    const earnings = payableDays * dailyWage;
    const absentDeduction = unpaidDaysTotal * dailyWage;
    const totalFines = fines.reduce((a, c) => a + (Number(c.amount) || 0), 0);
    const estimatedSalary = Math.floor(Math.max(0, earnings - totalFines));

    return {
      dailyWage,
      presentDays,
      lateDays,
      paidLeaves,
      unpaidLeaves,
      absentDays,
      payableDays,
      unpaidDays: unpaidDaysTotal,
      earnings,
      absentDeduction,
      estimatedSalary,
      fines: totalFines,
      payableDatesList,
      deductedDatesList
    };
  }, [profile, attendance, fines]);`;

      content = content.replace(fullMatch, newSalaryDetails);
    }
  }

  // 4. Update the Clickable Cards in the Finance Tab
  // Est. Retainable Net or Estimated Payable
  content = content.replace(
    /<div className="bg-(?:teal|orange|cyan|indigo|purple|amber)-600 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden shadow-.* flex flex-col justify-between">/g,
    (match) => match.replace('p-6 rounded-2xl shadow-lg', 'p-6 rounded-2xl shadow-lg cursor-pointer hover:scale-[1.01] transition-transform').replace('opacity-70 mb-1">Estimated Payable</p>', 'opacity-70 mb-1">Estimated Payable (Click for Breakdown)</p>').replace('opacity-70 mb-1">Est. Retainable Net</p>', 'opacity-70 mb-1">Est. Retainable Net (Click for Breakdown)</p>')
  );
  // Also add onClick handler to this card
  content = content.replace(
    /className="bg-(?:teal|orange|cyan|indigo|purple|amber)-600 text-white p-6 rounded-2xl shadow-lg cursor-pointer hover:scale-\[1\.01\] transition-transform relative overflow-hidden shadow-.* flex flex-col justify-between"/g,
    (match) => `${match} onClick={() => setShowSalaryBreakdownModal(true)}`
  );

  // Total Monthly Salary card
  content = content.replace(
    /className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm"/g,
    'className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm cursor-pointer hover:border-teal-200 transition-colors" onClick={() => setShowSalaryBreakdownModal(true)}'
  );
  content = content.replace(
    /className="bg-white\/70 backdrop-blur-xl border border-white p-6 rounded-[2rem] shadow-sm flex flex-col justify-between"/g,
    'className="bg-white/70 backdrop-blur-xl border border-white p-6 rounded-[2rem] shadow-sm flex flex-col justify-between cursor-pointer hover:border-teal-200 transition-colors" onClick={() => setShowSalaryBreakdownModal(true)}'
  );
  content = content.replace(
    /className={`p-6 rounded-3xl \${glassStyle} text-slate-900`}/g,
    'className={`p-6 rounded-3xl ${glassStyle} text-slate-900 cursor-pointer hover:border-teal-200 transition-colors`} onClick={() => setShowSalaryBreakdownModal(true)}'
  );

  // 5. Append modal before </main>
  if (!content.includes('Salary Calculation Breakdown Modal')) {
    const modalHTML = `
      {/* Salary Calculation Breakdown Modal */}
      {showSalaryBreakdownModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 text-xs text-slate-900">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-teal-600">Salary Calculation Breakdown</h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                  Cycle: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button 
                onClick={() => setShowSalaryBreakdownModal(false)}
                className="p-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
              >
                <span className="font-bold">✕</span>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-8 overflow-y-auto space-y-6 flex-1">
              {/* Top Overview Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-teal-50/30 rounded-2xl border border-teal-100/50">
                  <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest mb-1">Monthly Base Salary</p>
                  <p className="text-lg font-black text-gray-900">Rs. {Number(profile?.monthlySalary || profile?.salary || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100/50">
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Est. Retainable Net</p>
                  <p className="text-lg font-black text-emerald-600">Rs. {salaryDetails.estimatedSalary.toLocaleString()}</p>
                </div>
              </div>

              {/* Calculations Formula */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                <p className="text-[9px] font-black text-black uppercase tracking-widest">Calculation Formula</p>
                <div className="space-y-1 font-mono text-gray-600">
                  <div className="flex justify-between">
                    <span>Base Daily Rate:</span>
                    <span>Rs. {Number(profile?.monthlySalary || profile?.salary || 0).toLocaleString()} / {salaryDetails.payableDatesList.length + salaryDetails.deductedDatesList.length} = Rs. {Math.round(salaryDetails.dailyWage).toLocaleString()} / Day</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Payable Days Earned ({salaryDetails.payableDays} Days):</span>
                    <span>+ Rs. {Math.round(salaryDetails.earnings).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-rose-500">
                    <span>Unmarked / Absent Deductions ({salaryDetails.unpaidDays} Days):</span>
                    <span>- Rs. {Math.round(salaryDetails.absentDeduction).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-rose-500">
                    <span>Total Fines:</span>
                    <span>- Rs. {salaryDetails.fines.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-gray-200 my-2 pt-2 flex justify-between font-black text-gray-900">
                    <span>Till Date Net:</span>
                    <span>Rs. {salaryDetails.estimatedSalary.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Grid lists for Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Payable Dates List */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Payable Dates ({salaryDetails.payableDatesList.length})
                  </h4>
                  <div className="border border-gray-100 rounded-2xl overflow-hidden max-h-[200px] overflow-y-auto space-y-1 p-2 bg-gray-50/50">
                    {salaryDetails.payableDatesList.length === 0 ? (
                      <p className="text-[10px] text-gray-400 italic text-center py-4">No payable dates recorded</p>
                    ) : (
                      salaryDetails.payableDatesList.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 rounded-xl bg-white border border-gray-100">
                          <span className="font-bold text-gray-700">{formatDateDMY(item.date)}</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 font-bold text-[9px] uppercase">{item.status}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Deductible/Unpaid Dates List */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    Deductions / Absent ({salaryDetails.deductedDatesList.length})
                  </h4>
                  <div className="border border-gray-100 rounded-2xl overflow-hidden max-h-[200px] overflow-y-auto space-y-1 p-2 bg-gray-50/50">
                    {salaryDetails.deductedDatesList.length === 0 ? (
                      <p className="text-[10px] text-gray-400 italic text-center py-4">No deducted dates recorded</p>
                    ) : (
                      salaryDetails.deductedDatesList.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 rounded-xl bg-white border border-gray-100">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-700">{formatDateDMY(item.date)}</span>
                            <span className="text-[8px] text-rose-400 uppercase font-black">{item.status}</span>
                          </div>
                          <span className="font-black text-rose-500">-Rs. {Math.round(item.deduction).toLocaleString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-100 text-center text-[10px] text-gray-400 italic">
              All marked leaves are fully paid. Deductions only apply to absences and past unmarked days.
            </div>
          </div>
        </div>
      )}
    `;

    // Insert modal before </main>
    content = content.replace('</main>', `${modalHTML}\n      </main>`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Successfully updated: ${filePath}`);
});
