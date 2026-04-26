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
        whileHover={{ scale: 1.02, rotateX: 2, rotateY: 2 }}
        className="relative z-10 w-full max-w-xl mx-auto mb-6 perspective-1000"
      >
        <div className="relative rounded-[2.5rem] bg-white border-4 border-black p-10 text-center overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] group">
          
          {/* Animated background pulse (Subtle) */}
          <motion.div 
            animate={{ 
              opacity: [0.02, 0.05, 0.02],
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10" 
          />
          
          <div className="absolute inset-0 opacity-5 bg-[linear-gradient(rgba(0,0,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.1)_1px,transparent_1px)] bg-[size:30px_30px]" />
          
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[2px] bg-black shadow-[0_0_15px_rgba(0,0,0,0.2)]" />
          
          <div className="relative z-10">
            <motion.p 
              initial={{ letterSpacing: "0.2em", opacity: 0 }}
              animate={{ letterSpacing: "0.4em", opacity: 0.7 }}
              transition={{ delay: 0.3, duration: 1 }}
              className="text-[11px] font-black uppercase text-black mb-2"
            >
              Real-Time Revenue Command
            </motion.p>
            
            <div className="flex flex-col items-center justify-center gap-2 mb-8">
              <div className="relative">
                <span className="text-[11px] font-bold text-black/40 uppercase tracking-widest block mb-1">Available Liquidity</span>
                <p className="text-6xl md:text-7xl font-black tracking-tighter text-black leading-none">
                  Rs. {totalToday.toLocaleString()}
                </p>
                <div className="absolute -top-6 -right-10">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-8 h-8 text-black opacity-10" />
                  </motion.div>
                </div>
              </div>

              {totalPendingToday > 0 && (
                <motion.div 
                  initial={{ opacity: 0, filter: "blur(10px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  className="mt-4 px-6 py-2 rounded-full bg-amber-100 border-2 border-black"
                >
                  <p className="text-[11px] font-black text-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Pending Pipeline: Rs. {totalPendingToday.toLocaleString()}
                  </p>
                </motion.div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 max-w-lg mx-auto">
              {departments.map((d, index) => (
                <motion.div 
                  key={d.deptId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + (index * 0.1) }}
                  className="flex flex-col items-center p-3 rounded-2xl bg-gray-50 border-2 border-black"
                >
                  <span className="text-[8px] font-bold text-black/30 uppercase tracking-widest mb-1">{d.deptName}</span>
                  <span className="text-[10px] font-black text-black">Rs. {d.totalIncome.toLocaleString()}</span>
                </motion.div>
              ))}
            </div>

            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-black/30 animate-pulse">Revenue Flow System Active</p>
          </div>
          
          {/* Bottom interactive dot */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-black shadow-[0_0_20px_rgba(0,0,0,0.5)] z-20" />
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
