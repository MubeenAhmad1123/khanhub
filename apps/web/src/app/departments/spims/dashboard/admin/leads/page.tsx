'use client';

import React from 'react';
import LeadsCRM from '@/components/shared/LeadsCRM';

export default function SpimsLeadsPage() {
  return (
    <div className="p-6 md:p-10 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Leads & Call Manager</h1>
        <p className="text-gray-500 font-bold mt-1 uppercase text-xs tracking-widest">SPIMS Enrollment CRM</p>
      </div>
      
      <LeadsCRM department="spims" />
    </div>
  );
}
