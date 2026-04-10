"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Calendar, Clock, CheckCircle2, TrendingUp, DollarSign, Users } from 'lucide-react';

export type Payment = {
  id?: string;
  date: string;           // e.g. "28 12 2025"
  amount: number;         // e.g. 15000
  receivedBy: string;     // e.g. "Dilshad saab"
  verifiedByHQ: boolean;
  status: "Approved" | "Pending" | "Rejected";
};

export type MonthRecord = {
  label: string;          // e.g. "DEC 2025"
  package: number;
  totalPaid: number;
  remaining: number;
  payments: Payment[];
};

export type FinanceHistoryProps = {
  patientName: string;
  records: MonthRecord[];
};

const FinanceHistory: React.FC<FinanceHistoryProps> = ({ patientName, records }) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const totalPaidOverall = records.reduce((acc, curr) => acc + curr.totalPaid, 0);
  const totalRemainingOverall = records.reduce((acc, curr) => acc + curr.remaining, 0);

  // Flatten payments with their parent month index for positioning
  const allSteps: { type: 'month' | 'payment'; data: any; monthIndex: number; stepIndex: number }[] = [];
  records.forEach((record, mIdx) => {
    allSteps.push({ type: 'month', data: record, monthIndex: mIdx, stepIndex: 0 });
    record.payments.forEach((p, pIdx) => {
      allSteps.push({ type: 'payment', data: p, monthIndex: mIdx, stepIndex: pIdx + 1 });
    });
  });

  return (
    <div 
      ref={sectionRef}
      className="w-full min-h-screen bg-[#f0f4f8] py-12 px-6 overflow-hidden relative"
      style={{ 
        backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)', 
        backgroundSize: '30px 30px' 
      }}
    >
      <style jsx>{`
        @keyframes drawPath {
          to { stroke-dashoffset: 0; }
        }
        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeSlideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 5px #f97316; border-color: #f97316; }
          50% { box-shadow: 0 0 20px #fb923c; border-color: #fb923c; }
        }

        .animate-draw {
          stroke-dasharray: 2000;
          stroke-dashoffset: 2000;
          animation: drawPath 2.5s ease-in-out forwards;
          animation-play-state: ${isVisible ? 'running' : 'paused'};
        }
        .animate-pop {
          opacity: 0;
          animation: popIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          animation-play-state: ${isVisible ? 'running' : 'paused'};
        }
        .animate-card {
          opacity: 0;
          animation: fadeSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-play-state: ${isVisible ? 'running' : 'paused'};
        }
        .road-glow {
          filter: drop-shadow(0 0 8px rgba(79, 195, 247, 0.6));
        }
      `}</style>

      {/* Header Section */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center mb-16 transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div>
          <h1 className="text-4xl font-black text-[#1a3a5c] tracking-tight">
            FINANCE HISTORY: <span className="text-blue-600">PAYMENT JOURNEY</span>
          </h1>
          <p className="text-gray-500 font-medium flex items-center gap-2 mt-2">
            <Users size={16} /> Patient: {patientName}
          </p>
        </div>
        <div className="flex gap-4 mt-6 md:mt-0">
          <SummaryChip icon={<Calendar size={16} />} label="Total Months" value={records.length.toString()} />
          <SummaryChip icon={<DollarSign size={16} />} label="Total Paid" value={`PKR ${totalPaidOverall.toLocaleString('en-PK')}`} color="bg-green-100 text-green-700" />
          <SummaryChip icon={<TrendingUp size={16} />} label="Remaining" value={`PKR ${totalRemainingOverall.toLocaleString('en-PK')}`} color="bg-orange-100 text-orange-700" />
        </div>
      </div>

      {/* Timeline Section */}
      <div className="relative min-h-[600px] w-full">
        
        {/* Desktop View (Horizontal Wavy Road) */}
        <div className="hidden md:block relative w-full h-[600px]">
          {/* Main Road SVG */}
          <svg className="absolute top-1/2 left-0 w-full h-64 -translate-y-1/2 overflow-visible" preserveAspectRatio="none" viewBox="0 0 1200 200">
            <path 
              d="M 0 100 C 150 100, 150 0, 300 0 S 450 200, 600 100 S 750 0, 900 100 S 1050 200, 1200 100"
              fill="none"
              stroke="#1a3a5c"
              strokeWidth="12"
              strokeLinecap="round"
              className="animate-draw"
            />
            <path 
              d="M 0 100 C 150 100, 150 0, 300 0 S 450 200, 600 100 S 750 0, 900 100 S 1050 200, 1200 100"
              fill="none"
              stroke="#4fc3f7"
              strokeWidth="4"
              strokeLinecap="round"
              className="animate-draw road-glow"
              style={{ animationDelay: '0.2s' }}
            />
          </svg>

          {/* Nodes and Cards Mapping */}
          {allSteps.map((step, index) => {
            const xPos = (index / (allSteps.length - 1)) * 100;
            // Simplified Y calculation based on the cubic bezier points
            // Rough sine wave approximation for Y
            const yOffset = Math.sin((index / (allSteps.length - 1)) * Math.PI * 4) * 50;
            const isTop = index % 2 === 0;

            return (
              <div 
                key={index}
                className="absolute"
                style={{ 
                  left: `${xPos}%`, 
                  top: `calc(50% + ${yOffset}px)`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                {/* Node */}
                <div 
                  className={`w-4 h-4 rounded-full border-4 bg-white z-20 animate-pop ${index === allSteps.length - 1 ? 'border-orange-500' : 'border-[#1a3a5c]'}`}
                  style={{ 
                    animationDelay: `${0.5 + index * 0.3}s`,
                    ...(index === allSteps.length - 1 ? { animation: 'glowPulse 2s infinite' } : {})
                  }}
                />

                {/* Card Connector */}
                <div 
                  className={`absolute left-1/2 w-0.5 bg-gray-300 -translate-x-1/2 transition-all duration-1000 ${isVisible ? 'h-16' : 'h-0'}`}
                  style={{ 
                    top: isTop ? '-64px' : '16px',
                    transitionDelay: `${1 + index * 0.2}s`
                   }}
                />

                {/* Card Container */}
                <div 
                  className={`absolute left-1/2 -translate-x-1/2 w-64 animate-card`}
                  style={{ 
                    top: isTop ? '-220px' : '80px',
                    animationDelay: `${1.2 + index * 0.2}s`
                  }}
                >
                  {step.type === 'month' ? (
                    <MonthCard record={step.data} />
                  ) : (
                    <PaymentCard payment={step.data} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile View (Vertical Design) */}
        <div className="md:hidden flex flex-col items-center gap-12 relative px-4">
          <div 
            className={`absolute left-1/2 top-0 bottom-0 w-3 bg-[#1a3a5c] rounded-full -translate-x-1/2 origin-top transition-transform duration-[2.5s] ease-in-out ${isVisible ? 'scale-y-100' : 'scale-y-0'}`}
            style={{ 
              boxShadow: 'inset 0 0 5px #4fc3f7'
            }}
          />
          
          {records.map((month, mIdx) => (
            <div key={mIdx} className="w-full flex flex-col gap-8 relative">
              {/* Monthly Card (Left) */}
              <div 
                className="w-full pr-8 flex justify-start animate-card"
                style={{ animationDelay: `${mIdx * 0.5}s` }}
              >
                <div className="w-[85%] relative">
                  <MonthCard record={month} />
                  <div className="absolute right-[-32px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-4 border-[#1a3a5c] bg-white z-10" />
                </div>
              </div>

              {/* Payments Cards (Right) */}
              {month.payments.map((payment, pIdx) => (
                <div 
                  key={pIdx} 
                  className="w-full pl-8 flex justify-end animate-card"
                  style={{ animationDelay: `${mIdx * 0.5 + (pIdx + 1) * 0.3}s` }}
                >
                  <div className="w-[85%] relative">
                    <PaymentCard payment={payment} />
                    <div className={`absolute left-[-32px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-4 bg-white z-10 ${mIdx === records.length - 1 && pIdx === month.payments.length - 1 ? 'border-orange-500 animate-pulse' : 'border-[#1a3a5c]'}`} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SummaryChip = ({ icon, label, value, color = "bg-white text-[#1a3a5c]" }: { icon: any, label: string, value: string, color?: string }) => (
  <div className={`flex items-center gap-3 px-4 py-2 rounded-full shadow-sm border border-gray-100 ${color}`}>
    {icon}
    <div className="flex flex-col leading-none">
      <span className="text-[10px] uppercase font-bold opacity-60">{label}</span>
      <span className="text-sm font-black">{value}</span>
    </div>
  </div>
);

const MonthCard = ({ record }: { record: MonthRecord }) => (
  <div className="bg-white rounded-xl shadow-lg border-l-8 border-[#1a3a5c] p-4 group hover:shadow-xl transition-all duration-300">
    <div className="flex items-center gap-2 mb-3 text-[#1a3a5c]">
      <div className="p-2 bg-blue-50 rounded-lg">
        <Calendar size={18} className="text-blue-600" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Monthly Details</p>
        <h3 className="text-lg font-black leading-none">{record.label}</h3>
      </div>
    </div>
    
    <div className="space-y-2">
      <DataRow label="Package" value={`PKR ${record.package.toLocaleString('en-PK')}`} />
      <DataRow label="Total Paid" value={`PKR ${record.totalPaid.toLocaleString('en-PK')}`} color="text-green-600" />
      <div className="h-px bg-gray-100 my-1" />
      <DataRow label="Remaining" value={`PKR ${record.remaining.toLocaleString('en-PK')}`} color="text-orange-600" weight="font-black" />
    </div>
  </div>
);

const DataRow = ({ label, value, color = "text-gray-700", weight = "font-bold" }: { label: string, value: string, color?: string, weight?: string }) => (
  <div className="flex justify-between items-center text-xs">
    <span className="text-gray-500">{label}</span>
    <span className={`${color} ${weight}`}>{value}</span>
  </div>
);

const PaymentCard = ({ payment }: { payment: Payment }) => (
  <div className="bg-[#0f2744] rounded-2xl shadow-xl p-5 border border-white/5 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
    {/* Decorative Background Element */}
    <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/5 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors" />

    <div className="flex justify-between items-start mb-2">
      <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Payment</span>
      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
        payment.status === 'Approved' ? 'bg-green-500/20 text-green-400' : 
        payment.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' : 
        'bg-red-500/20 text-red-400'
      }`}>
        {payment.status}
      </span>
    </div>

    <h4 className="text-2xl font-black text-white mb-1">
      PKR {payment.amount.toLocaleString('en-PK')}
    </h4>
    
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
        <p className="text-[10px] text-gray-400">
          cash received by <span className="text-gray-200 font-bold">{payment.receivedBy}</span>
        </p>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-md">
          <Clock size={10} className="text-blue-300" />
          <span className="text-[10px] text-gray-300 font-medium">{payment.date}</span>
        </div>
        
        {payment.verifiedByHQ && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-green-400">
             <CheckCircle2 size={12} className="fill-green-400 text-[#0f2744]" />
             <span>VERIFIED BY HQ</span>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default FinanceHistory;
