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
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-cyan-400/30 border border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)] z-20" />

      <div 
        ref={innerRef}
        onClick={() => onClick(dept)}
        className="relative h-[340px] p-6 rounded-[2.5rem] bg-[#0d1f2d] dark:bg-[#0a1628] border border-white/5 cursor-pointer overflow-hidden group shadow-2xl transition-all duration-500 hover:border-cyan-400/30"
      >
        {/* Hover Highlight Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        {/* 1. Header: Dept ID Badge */}
        <div className="flex justify-between items-start mb-8">
          <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <span className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase tabular-nums">ID-{displayIndex}</span>
          </div>
          <motion.div 
            animate={{ rotate: [0, 10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className={`w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 ${accentColor}`}
          >
            <ShieldCheck className="w-5 h-5 opacity-60" />
          </motion.div>
        </div>

        {/* 2. Body: Name & Earnings */}
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2">{dept.deptName}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-[12px] font-bold text-cyan-400/60 uppercase">Rs.</span>
            <h3 className="text-3xl font-black text-white tracking-tighter tabular-nums leading-none">
              {dept.totalIncome.toLocaleString()}
            </h3>
          </div>
        </div>

        {/* 3. Metrics: Progress & Pulse */}
        <div className="space-y-6">
          {/* Progress Bar Layer */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Stability</span>
              <span className={`text-[11px] font-black ${accentColor}`}>9{8 + (index % 2)}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${90 + (index * 2)}%` }}
                transition={{ duration: 1.5, delay: 0.5 }}
                className={`h-full bg-gradient-to-r from-transparent via-${accentColor.split('-')[1]}-400 to-${accentColor.split('-')[1]}-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]`}
              />
            </div>
          </div>

          {/* Activity Pulse */}
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
              <Activity className={`w-3 h-3 ${accentColor} animate-pulse`} />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">Live Flow</span>
            </div>
            <div className="flex -space-x-2">
              {[1,2,3].map(i => (
                <div key={i} className="w-6 h-6 rounded-full bg-zinc-800 border-2 border-[#0d1f2d] flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-white/20" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Bottom: Visit Detail Button */}
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:border-cyan-400/30 transition-all duration-500">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 group-hover:text-white transition-colors">Open Ledger</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-400/10 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
