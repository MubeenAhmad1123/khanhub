'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import { DeptBreakdown } from '@/lib/hq/superadmin/finance';
import { cn } from '@/lib/utils';

interface DeptHubNodeProps {
  dept: DeptBreakdown;
  index: number;
  onClick: (dept: DeptBreakdown) => void;
  innerRef: (el: HTMLDivElement | null) => void;
}

export const DeptHubNode: React.FC<DeptHubNodeProps> = ({ 
  dept, 
  index, 
  onClick, 
  innerRef 
}) => {
  const isHealthy = dept.totalIncome > dept.totalExpense;
  const displayIndex = (index + 1).toString().padStart(2, '0');

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      whileHover={{ y: -5 }}
      className="relative group h-full"
    >
      <div 
        ref={innerRef}
        onClick={() => onClick(dept)}
        className={cn(
          "w-full h-full min-h-[180px] p-6 cursor-pointer rounded-2xl md:rounded-3xl flex flex-col justify-between",
          "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-all duration-300",
          "hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 shadow-sm"
        )}
      >
        {/* Top: Index & Status */}
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-tighter uppercase tabular-nums">
            ID: {displayIndex}
          </span>
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:rotate-45",
            isHealthy ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
          )}>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        {/* Middle: Name & Main Metric */}
        <div className="my-4">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-tight mb-1">
            {dept.deptName}
          </h3>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">Rs.</span>
            <span className="text-2xl font-bold text-zinc-900 dark:text-white tabular-nums tracking-tight">
              {dept.totalIncome.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Bottom: Progress & Badges */}
        <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Growth</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-500 tabular-nums">
              {Math.round(dept.percentOfTotal)}%
            </span>
          </div>

          <div className="flex items-center justify-between mt-auto">
            {dept.pendingCount > 0 ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <AlertCircle className="w-2.5 h-2.5" />
                <span className="text-[9px] font-bold uppercase tracking-tight">{dept.pendingCount} Pending</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span className="text-[9px] font-bold uppercase tracking-tight">Cleared</span>
              </div>
            )}
            
            <div className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
               <ArrowUpRight className="w-3 h-3 text-zinc-400" />
            </div>
          </div>
        </div>

        {/* Background Accent Gradient */}
        <div className="absolute inset-0 rounded-2xl md:rounded-3xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>
    </motion.div>
  );
};
