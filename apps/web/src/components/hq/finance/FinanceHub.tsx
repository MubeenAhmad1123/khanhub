'use client';

import React, { useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { DeptBreakdown } from '@/lib/hq/superadmin/finance';
import { FinancePipesOverlay } from './FinancePipes';
import { DeptHubNode } from './DeptHubNode';
import { FinanceDrillDown } from './FinanceDrillDown';

interface FinanceHubProps {
  departments: DeptBreakdown[];
  onUpdate: () => Promise<void>;
}

export const FinanceHub: React.FC<FinanceHubProps> = ({ departments, onUpdate }) => {
  const [selectedDept, setSelectedDept] = useState<DeptBreakdown | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const totalCardRef = useRef<HTMLDivElement>(null);
  const deptRefs = useRef<React.RefObject<HTMLDivElement>[]>([]);

  // Update refs when departments change
  if (deptRefs.current.length !== departments.length) {
    deptRefs.current = departments.map(() => React.createRef<HTMLDivElement>());
  }

  const totalToday = useMemo(() => 
    departments.reduce((acc, d) => acc + d.totalIncome, 0), 
  [departments]);

  const totalPendingToday = useMemo(() => 
    departments.reduce((acc, d) => acc + d.pendingAmount, 0),
  [departments]);

  if (!departments || departments.length === 0) return null;

  return (
    <div ref={containerRef} className="relative w-full flex flex-col items-center gap-0 px-4 py-8 md:px-8 bg-transparent">
      
      {/* 1. Grand Total Card */}
      <motion.div
        ref={totalCardRef}
        initial={{ opacity: 0, y: -40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ scale: 1.01 }}
        className="relative z-10 w-full max-w-5xl mx-auto mb-12 perspective-2000"
      >
        <div className="relative rounded-[3rem] bg-white border border-gray-100 p-12 lg:p-16 text-center overflow-hidden shadow-2xl shadow-gray-200/60 group">
          
          {/* Animated background pulse (Subtle) */}
          <motion.div 
            animate={{ 
              opacity: [0.03, 0.08, 0.03],
              scale: [1, 1.02, 1]
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10" 
          />
          
          <div className="absolute inset-0 opacity-5 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
          
          <div className="relative z-10">
            <motion.p 
              initial={{ letterSpacing: "0.2em", opacity: 0 }}
              animate={{ letterSpacing: "0.4em", opacity: 0.7 }}
              transition={{ delay: 0.3, duration: 1 }}
              className="text-[12px] font-black uppercase text-indigo-600 mb-4"
            >
              Real-Time Revenue Command
            </motion.p>
            
            <div className="flex flex-col items-center justify-center gap-4 mb-12">
              <div className="relative">
                <span className="text-[13px] font-bold text-gray-400 uppercase tracking-[0.2em] block mb-3">Available Liquidity Matrix</span>
                <p className="text-7xl md:text-8xl font-black tracking-tighter text-gray-900 leading-none">
                  Rs. {totalToday.toLocaleString()}
                </p>
                <div className="absolute -top-6 -right-12">
                  <motion.div
                    animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-10 h-10 text-indigo-500 opacity-20" />
                  </motion.div>
                </div>
              </div>

              {totalPendingToday > 0 && (
                <motion.div 
                  initial={{ opacity: 0, filter: "blur(10px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  className="mt-6 px-8 py-3 rounded-full bg-amber-50 border border-amber-200/50 shadow-sm"
                >
                  <p className="text-[12px] font-black text-amber-700 uppercase tracking-[0.2em] flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    Pending Pipeline Flow: Rs. {totalPendingToday.toLocaleString()}
                  </p>
                </motion.div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 mb-12 max-w-4xl mx-auto">
              {departments.map((d, index) => (
                <motion.div 
                  key={d.deptId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + (index * 0.1) }}
                  className="flex flex-col items-center px-6 py-4 rounded-[1.5rem] bg-gray-50/80 border border-gray-100/60 hover:bg-gray-100 hover:border-gray-200 transition-all cursor-default"
                >
                  <span className="text-[9px] font-bold opacity-50 uppercase tracking-widest mb-1 text-gray-500">{d.deptName}</span>
                  <span className="text-[14px] font-black text-gray-800">Rs. {d.totalIncome.toLocaleString()}</span>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-6">
               <div className="h-px w-12 bg-gray-100" />
               <p className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-300">System Synchronization Active</p>
               <div className="h-px w-12 bg-gray-100" />
            </div>
          </div>
          
        </div>
      </motion.div>

      {/* 2. Pipe SVG Overlay */}
      <FinancePipesOverlay
        totalCardRef={totalCardRef}
        deptRefs={deptRefs.current}
        containerRef={containerRef}
        deptIds={departments.map(d => d.deptId)}
      />

      {/* 3. Dept Cards Row */}
      <div className="flex flex-row flex-wrap justify-center gap-3 md:gap-5 w-full relative z-10 mt-0">
        {departments.map((dept, idx) => (
          <DeptHubNode
            key={dept.deptId}
            dept={dept}
            index={idx}
            innerRef={deptRefs.current[idx]}
            onClick={setSelectedDept}
          />
        ))}
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
