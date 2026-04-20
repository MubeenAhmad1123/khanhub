// apps/web/src/components/spims/StudentCard.tsx
'use client';

import { formatDateDMY } from '@/lib/utils';
import { SpimsStudent } from '@/types/spims';

export default function StudentCard({ student }: { student: SpimsStudent }) {
  const admStr = formatDateDMY(student.admissionDate);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-6">
      <div className="w-24 h-24 rounded-2xl bg-gray-100 overflow-hidden flex-shrink-0">
        {student.photoUrl ? (
          <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-2xl">
            {student.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="flex-1">
        <h3 className="text-xl font-bold text-gray-900">{student.name}</h3>
        <p className="text-gray-500 text-sm mb-2">
          Roll {student.rollNo} · {student.course} · {student.session}
        </p>
        <div className="flex gap-4 text-xs font-medium uppercase tracking-wider">
          <div className="flex flex-col">
            <span className="text-gray-400">Admitted</span>
            <span className="text-gray-700">{admStr || 'N/A'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-400">Package</span>
            <span className="text-[#1D9E75]">{student.totalPackage?.toLocaleString() || '0'} PKR</span>
          </div>
        </div>
      </div>
      <div
        className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
          student.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
        }`}
      >
        {student.status}
      </div>
    </div>
  );
}
