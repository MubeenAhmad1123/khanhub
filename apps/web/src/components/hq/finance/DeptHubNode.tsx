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
        className="relative h-[340px] p-6 rounded-[2.5rem] bg-white border-4 border-black cursor-pointer overflow-hidden group shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-500 hover:-translate-y-2"
      >
        {/* Hover Highlight Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        {/* 1. Header: Dept ID Badge */}
        <div className="flex justify-between items-start mb-8">
          <div className="px-3 py-1 rounded-full bg-black/5 border-2 border-black">
            <span className="text-[10px] font-black tracking-[0.2em] text-black/60 uppercase tabular-nums">ID-{displayIndex}</span>
          </div>
          <motion.div 
            animate={{ rotate: [0, 10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className={`w-10 h-10 rounded-2xl bg-black/5 flex items-center justify-center border-2 border-black ${accentColor.replace('text-', 'text-black')}`}
          >
            <ShieldCheck className="w-5 h-5 opacity-60" />
          </motion.div>
        </div>

        {/* 2. Body: Name & Earnings */}
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black/40 mb-2">{dept.deptName}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-[12px] font-bold text-black/60 uppercase">Rs.</span>
            <h3 className="text-3xl font-black text-black tracking-tighter tabular-nums leading-none">
              {dept.totalIncome.toLocaleString()}
            </h3>
          </div>
        </div>

        {/* 3. Metrics: Progress & Pulse */}
        <div className="space-y-6">
          {/* Progress Bar Layer */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-[9px] font-black uppercase tracking-widest text-black/30">Stability</span>
              <span className={`text-[11px] font-black text-black`}>9{8 + (index % 2)}%</span>
            </div>
            <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden border border-black/10">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${90 + (index * 2)}%` }}
                transition={{ duration: 1.5, delay: 0.5 }}
                className={`h-full bg-black shadow-[0_0_10px_rgba(0,0,0,0.2)]`}
              />
            </div>
          </div>

          {/* Activity Pulse */}
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/5 border-2 border-black">
              <Activity className={`w-3 h-3 text-black animate-pulse`} />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-black/60">Live Flow</span>
            </div>
            <div className="flex -space-x-2">
              {[1,2,3].map(i => (
                <div key={i} className="w-6 h-6 rounded-full bg-white border-2 border-black flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-black/20" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Bottom: Visit Detail Button */}
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white border-2 border-black group-hover:bg-black group-hover:text-white transition-all duration-500">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-black group-hover:text-white transition-colors">Open Ledger</span>
            <div className="w-8 h-8 rounded-xl bg-black/5 flex items-center justify-center group-hover:bg-white/20">
              <ArrowUpRight className="w-4 h-4 text-black group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
