'use client';

import React from 'react';
import type { CanteenRecord } from '@/types/sukoon';
import { formatDateDMY } from '@/lib/utils';

export default function CanteenWallet({ canteenRecord }: { canteenRecord: CanteenRecord | null }) {
  if (!canteenRecord) return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 italic text-gray-400">
      No canteen record found for this month.
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 uppercase tracking-wider">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h3 className="text-xs font-bold text-gray-400 mb-1">Canteen Balance</h3>
          <p className={`text-4xl font-black ${canteenRecord.balance < 500 ? 'text-red-500' : 'text-[#1D9E75]'}`}>
            {canteenRecord.balance.toLocaleString()} <span className="text-sm font-normal text-gray-500">PKR</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400 font-bold mb-1">Deposited</p>
          <p className="text-lg font-bold text-gray-700">{canteenRecord.totalDeposited.toLocaleString()}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-bold text-gray-400">Recent Canteen Expenses</h4>
        {canteenRecord.transactions.filter(t => t.type === 'expense').length === 0 ? (
          <p className="text-sm text-gray-500 lowercase normal-case italic">No expenses recorded yet.</p>
        ) : (
          canteenRecord.transactions
            .filter(t => t.type === 'expense')
            .slice(0, 5)
            .map((t, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm p-4 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                <div>
                  <p className="font-bold text-gray-800 normal-case">{t.description}</p>
                  <p className="text-[10px] text-gray-400">{formatDateDMY(t.date)}</p>
                </div>
                <span className="font-black text-red-500">-{t.amount.toLocaleString()}</span>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
