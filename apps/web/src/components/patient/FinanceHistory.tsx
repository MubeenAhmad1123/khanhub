'use client';

import React from 'react';

type Payment = {
  date: string; // e.g. "28 12 2025"
  amount: number;
  type: 'Admission' | 'Monthly Fee' | 'Canteen' | 'Security' | 'Other';
  status: 'Approved' | 'Pending' | 'Rejected';
  note?: string;
  receivedBy?: string;
};

type MonthlyDetail = {
  month: string; // e.g. "December 2025"
  totalDue: number;
  totalPaid: number;
  remaining: number;
};

interface FinanceHistoryProps {
  payments: Payment[];
  monthlyDetails: MonthlyDetail[];
}

export default function FinanceHistory({ payments, monthlyDetails }: FinanceHistoryProps) {
  // Combine and sort events by date if necessary, but for this specific "Road/Timeline"
  // we follow the prompt's layout: alternating items.
  
  return (
    <div className="w-full py-12 px-4 sm:px-6 lg:px-8 bg-gray-50/50 rounded-3xl overflow-hidden shadow-sm border border-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Financial Journey</h2>
          <p className="text-gray-500 font-medium mt-2">A complete timeline of your payments and monthly balances</p>
        </div>

        {/* DESKTOP LAYOUT (Horizontal Road) */}
        <div className="hidden md:block relative min-h-[600px] py-20 px-10 overflow-x-auto no-scrollbar">
          {/* Legend */}
          <div className="absolute top-0 right-10 flex gap-6 text-[10px] font-black uppercase tracking-wider">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-teal-500 shadow-sm shadow-teal-200" />
                <span className="text-teal-600">Monthly Status</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-600 shadow-sm shadow-blue-200" />
                <span className="text-blue-600">Payment Entry</span>
             </div>
          </div>

          {/* The Road/Path */}
          <div className="absolute top-1/2 left-0 w-full h-4 bg-gray-200 rounded-full -translate-y-1/2 shadow-inner" />
          <div className="absolute top-1/2 left-0 w-full h-1 bg-white/40 border-t-2 border-dashed border-gray-300 -translate-y-1/2" />

          {/* Timeline Items */}
          <div className="relative flex justify-between items-center gap-40 min-w-max h-full">
            {monthlyDetails.map((detail, idx) => {
              const relatedPayments = payments.filter(p => {
                const [d, m, y] = p.date.split(' ');
                // Simple month matching for demo - in real app would be more robust
                return detail.month.includes(m === '12' ? 'December' : ''); 
              });

              return (
                <div key={idx} className="relative flex flex-col items-center">
                  {/* Monthly Card (ABOVE) */}
                  <div className="absolute bottom-[60px] animate-fade-in-up" style={{ animationDelay: `${idx * 200}ms` }}>
                    <div className="w-64 bg-white p-6 rounded-[2rem] shadow-xl shadow-teal-500/5 border border-teal-100 hover:-translate-y-2 transition-transform duration-500 group">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-teal-500 flex items-center justify-center text-white shadow-lg shadow-teal-200 group-hover:scale-110 transition-transform">
                          <span className="font-black text-xs">{idx + 1}</span>
                        </div>
                        <h3 className="font-black text-gray-900">{detail.month}</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-gray-400 uppercase tracking-widest">Total Due</span>
                          <span className="text-gray-900">Rs. {detail.totalDue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-gray-400 uppercase tracking-widest">Paid</span>
                          <span className="text-emerald-600">Rs. {detail.totalPaid.toLocaleString()}</span>
                        </div>
                        <div className="pt-3 border-t border-gray-100 flex justify-between text-sm font-black">
                          <span className="text-gray-900">Remaining</span>
                          <span className={detail.remaining > 0 ? 'text-red-500' : 'text-teal-600'}>
                            Rs. {detail.remaining.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {/* Connector Line */}
                      <div className="absolute -bottom-10 left-1/2 w-0.5 h-10 bg-gradient-to-t from-teal-500 to-transparent" />
                    </div>
                  </div>

                  {/* Road Point */}
                  <div className="w-10 h-10 rounded-full bg-white border-[6px] border-teal-500 shadow-lg shadow-teal-200 z-10 hover:scale-125 transition-transform cursor-pointer" />

                  {/* Payment Cards (BELOW) */}
                  <div className="absolute top-[60px] left-1/2 -translate-x-1/2 flex gap-6">
                    {relatedPayments.map((p, pIdx) => (
                      <div key={pIdx} className="w-72 bg-white p-6 rounded-[2rem] shadow-xl shadow-blue-500/5 border border-blue-100 hover:translate-y-2 transition-transform duration-500 group animate-fade-in-down" style={{ animationDelay: `${(idx * 200) + (pIdx * 100)}ms` }}>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">
                            {p.type}
                          </span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                            p.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                            p.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {p.status}
                          </span>
                        </div>
                        <div className="mb-4">
                          <p className="text-2xl font-black text-gray-900">Rs. {p.amount.toLocaleString()}</p>
                          <p className="text-xs font-bold text-gray-400 mt-1">{p.date}</p>
                        </div>
                        {p.note && (
                          <div className="p-3 bg-gray-50 rounded-2xl mb-3">
                            <p className="text-[11px] text-gray-600 font-medium leading-relaxed italic italic">"{p.note}"</p>
                          </div>
                        )}
                        <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-black">
                            {p.receivedBy?.[0] || 'K'}
                          </div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                            Received by <span className="text-gray-900">{p.receivedBy || 'Sir Khan'}</span>
                          </p>
                        </div>
                        {/* Connector Line */}
                        <div className="absolute -top-10 left-1/2 w-0.5 h-10 bg-gradient-to-b from-blue-500 to-transparent" />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MOBILE LAYOUT (Vertical Timeline) */}
        <div className="md:hidden relative pb-20">
          {/* Vertical Road */}
          <div className="absolute left-1/2 top-0 bottom-0 w-2 bg-gray-200 -translate-x-1/2 rounded-full overflow-hidden shadow-inner">
            <div className="absolute inset-0 w-0.5 left-1/2 h-full border-l-2 border-dashed border-gray-300 -translate-x-1/2" />
          </div>

          <div className="space-y-24 relative">
            {monthlyDetails.map((detail, idx) => {
              const relatedPayments = payments.filter(p => {
                const [, m] = p.date.split(' ');
                return detail.month.includes(m === '12' ? 'December' : '');
              });

              return (
                <div key={idx} className="relative">
                  {/* Road Point */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-0 w-8 h-8 rounded-full bg-white border-[4px] border-teal-500 shadow-lg shadow-teal-200 z-10" />

                  <div className="grid grid-cols-2 gap-4">
                    {/* Left: Monthly Info */}
                    <div className="pr-6 pt-10">
                      <div className="bg-white p-4 rounded-3xl shadow-lg border border-teal-50 shadow-teal-500/10 animate-fade-in-left">
                        <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest mb-1">Status</p>
                        <h3 className="font-black text-gray-900 text-sm mb-3">{detail.month}</h3>
                        <div className="space-y-1.5 pt-2 border-t border-gray-50">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-gray-400 font-bold uppercase">Paid</span>
                            <span className="text-emerald-600 font-black">Rs. {detail.totalPaid/1000}k</span>
                          </div>
                          <div className="flex justify-between text-[11px] pt-1 border-t border-gray-50">
                            <span className="text-gray-900 font-black">Rem.</span>
                            <span className="text-red-500 font-black">Rs. {detail.remaining/1000}k</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Payments */}
                    <div className="pl-6 pt-20 space-y-6">
                      {relatedPayments.map((p, pIdx) => (
                        <div key={pIdx} className="bg-white p-4 rounded-3xl shadow-lg border border-blue-50 shadow-blue-500/10 animate-fade-in-right">
                          <div className="flex justify-between items-start mb-2">
                             <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                {p.type}
                             </span>
                             <span className="text-[8px] font-bold text-gray-400">{p.date.split(' ').slice(0,2).join(' ')}</span>
                          </div>
                          <p className="text-base font-black text-gray-900">Rs. {p.amount.toLocaleString()}</p>
                          {p.note && <p className="text-[9px] text-gray-500 font-medium mt-1 mt-1 leading-tight line-clamp-2">"{p.note}"</p>}
                          <div className="mt-2 text-[8px] font-bold text-gray-400 uppercase tracking-wide">
                            by <span className="text-gray-900">{p.receivedBy || 'Sir Khan'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in-down { animation: fadeInDown 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in-left { animation: fadeInLeft 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in-right { animation: fadeInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
