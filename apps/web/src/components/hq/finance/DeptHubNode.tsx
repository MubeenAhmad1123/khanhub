'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertCircle, ArrowUpRight, Zap } from 'lucide-react';
import { DeptBreakdown } from '@/lib/hq/superadmin/finance';
import { cn } from '@/lib/utils';

interface DeptHubNodeProps {
  dept: DeptBreakdown;
  onClick: (dept: DeptBreakdown) => void;
  innerRef: React.RefObject<HTMLDivElement>;
}

export const DeptHubNode: React.FC<DeptHubNodeProps> = ({ dept, onClick, innerRef }) => {
  const isHealthy = dept.totalIncome > dept.totalExpense;
  
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ y: -8, scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      className="relative z-10"
    >
      <div 
        ref={innerRef}
        onClick={() => onClick(dept)}
        className={cn(
          "w-72 p-8 cursor-pointer transition-all duration-500 border-2 rounded-[2.5rem]",
          "bg-background/80 backdrop-blur-3xl border-border/50 hover:border-primary/50",
          "group shadow-2xl hover:shadow-primary/20 overflow-hidden relative"
        )}
      >
        {/* Animated Glow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-2">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic">
              Terminal: {dept.deptName}
            </h3>
            <div className="text-3xl font-black tracking-tighter text-black dark:text-white leading-none">
              <span className="text-[10px] block opacity-40 mb-1 not-italic tracking-widest font-bold">RS.</span>
              {dept.totalIncome.toLocaleString()}
            </div>
          </div>
          <div className={cn(
            "p-3 rounded-2xl shadow-lg transition-transform duration-500 group-hover:rotate-12",
            isHealthy ? "bg-emerald-500/20 text-emerald-500" : "bg-amber-500/20 text-amber-500"
          )}>
            <ArrowUpRight className="w-5 h-5" strokeWidth={3} />
          </div>
        </div>

        {/* Breakdown Sparkles */}
        <div className="space-y-5">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
            <span className="text-muted-foreground flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" /> Stability Index
            </span>
            <span className="text-emerald-500">
              {Math.round(dept.percentOfTotal)}% Global
            </span>
          </div>
          
          <div className="w-full bg-muted/50 h-2 rounded-full overflow-hidden p-[1px]">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${dept.percentOfTotal}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
            />
          </div>

          <div className="flex items-center justify-between">
             {dept.pendingCount > 0 ? (
               <div className="flex items-center gap-2 text-[10px] text-amber-500 font-black uppercase tracking-widest animate-pulse">
                 <AlertCircle className="w-4 h-4" /> {dept.pendingCount} Items Due
               </div>
             ) : (
               <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                 <Zap className="w-4 h-4 text-emerald-500 fill-emerald-500" /> All Verified
               </div>
             )}
             <div className="text-[10px] text-primary hover:text-primary/70 transition-colors font-black uppercase tracking-widest border-b-2 border-primary/20 pb-0.5">
               Drill Down
             </div>
          </div>
        </div>

        {/* Tiny Decorative Dots */}
        <div className="absolute -bottom-2 -right-2 opacity-10 rotate-45">
          <svg width="60" height="60" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" />
            <circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="1 5" />
          </svg>
        </div>
      </div>
    </motion.div>
  );
};
