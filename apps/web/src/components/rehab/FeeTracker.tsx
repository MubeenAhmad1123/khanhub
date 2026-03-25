'use client';

import React from 'react';
import type { FeeRecord } from '@/types/rehab';

export default function FeeTracker({ feeRecord }: { feeRecord: FeeRecord | null }) {
  if (!feeRecord) return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 italic text-gray-400">
      No fee record found for this month.
    </div>
  );

  const percent = Math.min(100, (feeRecord.amountPaid / feeRecord.packageAmount) * 100);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Monthly Fee</h3>
          <p className="text-3xl font-black text-gray-900">{feeRecord.amountPaid.toLocaleString()} <span className="text-sm font-normal text-gray-500">/ {feeRecord.packageAmount.toLocaleString()} PKR</span></p>
        </div>
        <div className="text-right">
          <span className={`text-xs font-bold px-2 py-1 rounded-md ${feeRecord.amountRemaining <= 0 ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
            {feeRecord.amountRemaining <= 0 ? 'Fully Paid' : `Remaining: ${feeRecord.amountRemaining.toLocaleString()} PKR`}
          </span>
        </div>
      </div>
      
      <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden mb-6">
        <div 
          className="h-full bg-[#1D9E75] transition-all duration-500" 
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment History ({feeRecord.month})</h4>
        {feeRecord.payments.length === 0 ? (
          <p className="text-sm text-gray-500">No payments recorded yet.</p>
        ) : (
          feeRecord.payments.map((payment, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="font-semibold text-gray-700">{payment.amount.toLocaleString()} PKR</p>
                <p className="text-xs text-gray-400">{payment.date.toLocaleDateString()}</p>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                payment.status === 'approved' ? 'bg-green-100 text-green-600' : 
                payment.status === 'pending' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
              }`}>
                {payment.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
