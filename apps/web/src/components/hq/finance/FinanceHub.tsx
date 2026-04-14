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

  if (!departments || departments.length === 0) return null;

  return (
    <div ref={containerRef} className="relative w-full flex flex-col items-center gap-0 px-4 py-8 md:px-8 bg-transparent">
      
      {/* 1. Grand Total Card */}
      <motion.div
        ref={totalCardRef}
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md mx-auto mb-4"
      >
        <div className="relative rounded-[2rem] bg-[#0d1f2d] dark:bg-[#0a1628] border border-cyan-500/20 p-8 text-center overflow-hidden shadow-[0_0_80px_rgba(6,182,212,0.15)]">
          
          {/* Subtle grid background pattern */}
          <div className="absolute inset-0 opacity-5 bg-[linear-gradient(rgba(6,182,212,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.3)_1px,transparent_1px)] bg-[size:20px_20px]" />
          
          {/* Glow effect top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
          
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400/70 mb-1">Today's Grand Collection</p>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">
            Total Revenue: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          
          <div className="relative inline-block mb-4">
             <p className="text-5xl md:text-6xl font-black tracking-tighter text-white leading-none">
              Rs. {totalToday.toLocaleString()}
            </p>
            <motion.div 
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-4 -right-6"
            >
              <Sparkles className="w-5 h-5 text-cyan-400 opacity-50" />
            </motion.div>
          </div>

          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mb-4 opacity-70">
            {departments.map(d => (
              <div key={d.deptId} className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest">{d.deptName}:</span>
                <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">Rs. {d.totalIncome.toLocaleString()}</span>
              </div>
            ))}
          </div>

          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-400/50">Revenue Flow Activated</p>
          
          {/* Bottom dot — pipe origin point */}
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.8)] z-20" />
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
