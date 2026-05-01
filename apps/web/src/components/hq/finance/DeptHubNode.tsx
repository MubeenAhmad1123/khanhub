'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, TrendingUp, ShieldCheck, Activity } from 'lucide-react';
import { DeptBreakdown } from '@/lib/hq/superadmin/finance';

interface DeptHubNodeProps {
  dept: DeptBreakdown;
  index: number;
  onClick: (dept: DeptBreakdown) => void;
  innerRef: React.RefObject<HTMLDivElement>;
}

export const DeptHubNode: React.FC<DeptHubNodeProps> = ({ 
  dept, 
  index, 
  onClick, 
  innerRef 
}) => {
  const isHealthy = dept.totalIncome > dept.totalExpense;
  const displayIndex = (index + 1).toString().padStart(2, '0');

  // Colors for different departments
  const accentColors = [
    'text-cyan-400',
    'text-indigo-400',
    'text-emerald-400',
    'text-amber-400',
    'text-pink-400',
    'text-violet-400'
  ];
  const accentColor = accentColors[index % accentColors.length];
  const glowShadow = accentColor.replace('text-', 'shadow-');

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="relative w-64 md:w-72 mt-20"
    >
      {/* Target Dot — pipe target point */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-indigo-400 opacity-60 z-20" />

      <div 
        ref={innerRef}
        onClick={() => onClick(dept)}
        className="relative h-[340px] p-6 rounded-[2.5rem] bg-white border border-gray-100 cursor-pointer overflow-hidden group shadow-2xl shadow-gray-200/50 transition-all duration-500 hover:-translate-y-2"
      >
        {/* Hover Highlight Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        {/* 1. Header: Dept ID Badge */}
        <div className="flex justify-between items-start mb-6">
          <div className="px-3 py-1 rounded-full bg-gray-50 border border-gray-100">
            <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase tabular-nums">ID-{displayIndex}</span>
          </div>
          <motion.div 
            animate={{ rotate: [0, 5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className={`w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100 ${accentColor}`}
          >
            <ShieldCheck className="w-5 h-5 opacity-80" />
          </motion.div>
        </div>

        {/* 2. Body: Name & Earnings */}
        <div className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">{dept.deptName}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-[12px] font-bold text-gray-400 uppercase">Rs.</span>
            <h3 className="text-3xl font-black text-gray-900 tracking-tighter tabular-nums leading-none">
              {dept.totalIncome.toLocaleString()}
            </h3>
          </div>
        </div>

        {/* 3. Metrics: Progress & Pulse */}
        <div className="space-y-6">
          {/* Progress Bar Layer */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Stability</span>
              <span className={`text-[11px] font-black text-gray-800`}>9{8 + (index % 2)}%</span>
            </div>
            <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${90 + (index * 2)}%` }}
                transition={{ duration: 1.5, delay: 0.5 }}
                className={`h-full bg-indigo-500`}
              />
            </div>
          </div>

          {/* Activity Pulse */}
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
              <Activity className={`w-3 h-3 text-indigo-500 animate-pulse`} />
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Live Flow</span>
            </div>
            <div className="flex -space-x-1">
              {[1,2,3].map(i => (
                <div key={i} className="w-5 h-5 rounded-full bg-gray-100 border border-white flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-300" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Bottom: Visit Detail Button */}
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 group-hover:bg-indigo-600 group-hover:border-indigo-600 group-hover:text-white transition-all duration-500">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-800 group-hover:text-white transition-colors">Open Ledger</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-gray-600 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
