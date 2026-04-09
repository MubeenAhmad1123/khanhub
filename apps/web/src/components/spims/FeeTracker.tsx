'use client';

import React from 'react';
import type { SpimsFeeTrackerRecord } from '@/types/spims';
import { formatDateDMY } from '@/lib/utils';

export default function FeeTracker({ feeRecord }: { feeRecord: SpimsFeeTrackerRecord | null }) {
  if (!feeRecord) return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 italic text-gray-400">
      No fee record found for this student.
    </div>
  );

  const percent = Math.min(100, (feeRecord.totalPaid / feeRecord.totalCourseFee) * 100);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Total Fee Paid</h3>
          <p className="text-3xl font-black text-gray-900">{feeRecord.totalPaid.toLocaleString()} <span className="text-sm font-normal text-gray-500">/ {feeRecord.totalCourseFee.toLocaleString()} PKR</span></p>
        </div>
        <div className="text-right">
          <span className={`text-xs font-bold px-2 py-1 rounded-md ${feeRecord.totalRemaining <= 0 ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
            {feeRecord.totalRemaining <= 0 ? 'Fully Paid' : `Remaining: ${feeRecord.totalRemaining.toLocaleString()} PKR`}
          </span>
        </div>
      </div>
      
      <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden mb-6">
        <div 
          className="h-full bg-[#1D9E75] transition-all duration-500" 
          style={{ width: `${percent || 0}%` }}
        />
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment History</h4>
        {feeRecord.payments.length === 0 ? (
          <p className="text-sm text-gray-500">No payments recorded yet.</p>
        ) : (
          feeRecord.payments.map((payment, idx) => {
            const dateStr = formatDateDMY(payment.date);
            return (
              <div key={idx} className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-semibold text-gray-700">{payment.amount.toLocaleString()} PKR</p>
                  <p className="text-xs text-gray-400">{dateStr}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded bg-blue-100 text-blue-600`}>
                  {payment.paymentType}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
