'use client';

import React from 'react';
import LeadsCRM from '@/components/shared/LeadsCRM';

export default function RehabLeadsPage() {
  return (
    <div className="p-4 md:p-10 space-y-6 max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight">Leads & Call Manager</h1>
        <p className="text-gray-500 font-bold mt-1 uppercase text-xs tracking-widest">Rehab Department CRM</p>
      </div>
      
      <div className="w-full max-w-full overflow-x-hidden">
        <LeadsCRM department="rehab" />
      </div>
    </div>
  );
}
