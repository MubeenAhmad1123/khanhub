'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SalarySlip } from '@/types/hq';
import { SalarySlipPrintable } from '@/components/hq/SalarySlipPrintable';
import { Loader2, AlertCircle } from 'lucide-react';
import { getDeptCollection, type StaffDept } from '@/lib/hq/superadmin/staff';

export default function StandalonePrintSalaryPage() {
  const { prefix, id } = useParams() as { prefix: string; id: string };
  const [slip, setSlip] = useState<SalarySlip | null>(null);
  const [staff, setStaff] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!prefix || !id) return;

    const fetchSlipAndStaff = async () => {
      try {
        const collectionName = `${prefix}_salary_records`;
        const docRef = doc(db, collectionName, id);
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
          setError('Salary record not found.');
          setLoading(false);
          return;
        }

        const slipData = { id: snap.id, ...snap.data() } as SalarySlip;
        setSlip(slipData);

        if (slipData.staffId) {
          try {
            const deptCollection = getDeptCollection(prefix as StaffDept);
            const staffRef = doc(db, deptCollection, slipData.staffId);
            const staffSnap = await getDoc(staffRef);
            if (staffSnap.exists()) {
              const sData = staffSnap.data();
              setStaff({
                designation: sData.designation || sData.role || 'Staff Member',
                joiningDate: sData.joiningDate || sData.createdAt || null,
                employeeId: sData.employeeId || sData.customId || null,
                monthlySalary: sData.monthlySalary || null,
              });
            }
          } catch (staffErr) {
            console.error('Failed to fetch staff details:', staffErr);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Failed to load slip:', err);
        setError('Error accessing payroll records. Please check connection.');
        setLoading(false);
      }
    };

    fetchSlipAndStaff();
  }, [prefix, id]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 space-y-4">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <p className="text-xs font-black uppercase tracking-widest text-gray-400 animate-pulse">
          Locating Financial Manifest...
        </p>
      </div>
    );
  }

  if (error || !slip) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-sm w-full bg-white p-8 rounded-[2rem] border border-red-100 text-center space-y-4">
          <AlertCircle className="mx-auto text-red-500" size={48} />
          <h3 className="text-lg font-bold text-red-900">Access Restricted or Not Found</h3>
          <p className="text-sm text-gray-500">{error || 'Unknown artifact reference.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white md:py-12">
      {/* Inject CSS for complete browser chrome removal and margin resetting */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0;
          }
          body {
            margin: 0.8cm !important;
            background-color: white !important;
          }
        }
      `}</style>

      <SalarySlipPrintable slip={slip} staff={staff} showActionControls={true} />
    </div>
  );
}
