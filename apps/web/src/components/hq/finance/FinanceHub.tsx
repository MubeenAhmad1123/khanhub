'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCcw, LayoutGrid, Activity, DollarSign, Wallet, ShieldCheck, Sparkles } from 'lucide-react';
import { DeptBreakdown } from '@/lib/hq/superadmin/finance';
import { FinancePipesOverlay } from './FinancePipes';
import { DeptHubNode } from './DeptHubNode';
import { FinanceDrillDown } from './FinanceDrillDown';
import { cn } from '@/lib/utils';

interface FinanceHubProps {
  departments: DeptBreakdown[];
  onUpdate: () => Promise<void>;
}

export const FinanceHub: React.FC<FinanceHubProps> = ({ departments, onUpdate }) => {
  const [selectedDept, setSelectedDept] = useState<DeptBreakdown | null>(null);
  const [viewMode, setViewMode] = useState<'hub' | 'grid'>('hub');
  const [syncing, setSyncing] = useState(false);
  
  // Refs for pipe connections
  const containerRef = useRef<HTMLDivElement>(null);
  const totalCardRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleDeptClick = (dept: DeptBreakdown) => setSelectedDept(dept);
  const handleSync = async () => {
    setSyncing(true);
    await onUpdate();
    setSyncing(false);
  };

  const grandTotal = departments.reduce((acc, r) => acc + r.totalIncome, 0);

  if (!departments || departments.length === 0) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center bg-white dark:bg-black rounded-[3rem] border border-border">
        <div className="flex flex-col items-center gap-4">
          <RefreshCcw className="w-10 h-10 animate-spin text-primary/40" />
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Initializing Ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-2xl md:rounded-[3rem] overflow-hidden",
        "flex flex-col items-center p-6 md:p-10 transition-colors duration-700"
      )}
    >
      {/* Top Section: Controls */}
      <div className="w-full flex flex-wrap justify-between items-center gap-4 mb-12 z-20">
        <div className="flex bg-zinc-100 dark:bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <button 
            onClick={() => setViewMode('hub')}
            className={cn(
              "px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
              viewMode === 'hub' ? "bg-white dark:bg-zinc-800 shadow-sm text-primary" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            Digital Hub
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={cn(
              "px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
              viewMode === 'grid' ? "bg-white dark:bg-zinc-800 shadow-sm text-primary" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            Data Grid
          </button>
        </div>

        <button 
          onClick={handleSync}
          disabled={syncing}
          className="rounded-2xl border-2 px-6 h-11 text-[10px] font-bold uppercase tracking-widest gap-2 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center justify-center transition-all disabled:opacity-50 border-zinc-200 dark:border-zinc-800"
        >
          <RefreshCcw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
          Sync Ledger
        </button>
      </div>

      {/* Waterfall Layout Container */}
      <div className="w-full max-w-7xl flex flex-col items-center relative min-h-[500px]">
        {/* Animated Pipes Layer */}
        {viewMode === 'hub' && (
          <FinancePipesOverlay 
            containerRef={containerRef}
            sourceRef={totalCardRef}
            targetRefs={nodeRefs}
            depts={departments.map(d => d.deptId)}
          />
        )}

        {/* TOP: Grand Total Card */}
        <div className="z-10 mb-20 md:mb-24 w-full flex justify-center">
          <motion.div 
            ref={totalCardRef}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={cn(
              "w-full max-w-md p-8 rounded-3xl md:rounded-[2.5rem] relative overflow-hidden",
              "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-2xl",
              "border-4 border-zinc-800 dark:border-zinc-200"
            )}
          >
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-white/10 dark:bg-zinc-100 border border-white/20 dark:border-zinc-200">
                <Sparkles className="w-3.5 h-3.5 text-primary fill-primary/20" />
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Global Revenue</span>
              </div>
              <h1 className="text-sm font-bold opacity-60 uppercase tracking-widest mb-2">Grand Total Balance</h1>
              <div className="flex items-baseline gap-3 mb-6">
                <span className="text-xl font-bold opacity-40">RS.</span>
                <span className="text-5xl md:text-6xl font-bold tracking-tighter tabular-nums">
                  {grandTotal.toLocaleString()}
                </span>
              </div>
              
              <div className="w-full grid grid-cols-2 gap-4 pt-6 border-t border-white/10 dark:border-zinc-100">
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-50 mb-1">Stability</span>
                  <span className="text-lg font-bold text-emerald-400 dark:text-emerald-600">98.4%</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-50 mb-1">Active Nodes</span>
                  <span className="text-lg font-bold">{departments.length} Units</span>
                </div>
              </div>
            </div>
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <DollarSign className="w-24 h-24" />
            </div>
          </motion.div>
        </div>

        {/* BOTTOM: Department Row/Grid */}
        <div className={cn(
          "w-full z-10 transition-all duration-1000",
          viewMode === 'hub' 
            ? "flex flex-wrap justify-center gap-6" 
            : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        )}>
          {departments.map((dept, index) => (
            <motion.div
              key={dept.deptId}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                viewMode === 'hub' ? "w-[calc(50%-12px)] md:w-64 lg:w-72" : "w-full"
              )}
            >
              <DeptHubNode
                dept={dept}
                index={index}
                innerRef={(el) => (nodeRefs.current[dept.deptId] = el)}
                onClick={handleDeptClick}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="w-full mt-12 pt-8 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap justify-between items-center gap-4 text-muted-foreground z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Real-time Stream Active</span>
          </div>
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Global Ledger Encrypted</span>
          </div>
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">
          Last Synchronized: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Drill-down Detail Modal */}
      <AnimatePresence>
        {selectedDept && (
          <FinanceDrillDown
            dept={selectedDept}
            onClose={() => setSelectedDept(null)}
            onUpdate={onUpdate}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
