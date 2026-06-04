// src/components/hq/finance/AmountBreakdownModal.tsx

'use client';

import React from 'react';
import { Dialog, DialogOverlay, DialogContent } from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { X, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { DailyDeptBreakdown } from '@/lib/hq/superadmin/finance';
import { cn } from '@/lib/utils';

interface AmountBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: DailyDeptBreakdown[];
}

export default function AmountBreakdownModal({ isOpen, onClose, departments }: AmountBreakdownModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogOverlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90]" />
      <DialogContent asChild>
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[100]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-4xl max-h-[85vh] bg-white rounded-[2rem] sm:rounded-[3rem] border border-gray-100 shadow-2xl p-6 sm:p-10 overflow-y-auto relative text-gray-900"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-1 block">
                  Consolidated Ledger Summary
                </span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 uppercase">
                  Amount Breakdown
                </h2>
              </div>
              <button 
                onClick={onClose} 
                className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-100 hover:text-rose-600 transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Department Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {departments.map((dept) => {
                const net = dept.income - dept.expense;
                const isNetPositive = net >= 0;
                return (
                  <div 
                    key={dept.deptId} 
                    className="p-6 sm:p-8 border border-gray-100 bg-gray-50/50 rounded-2xl sm:rounded-[2rem] shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
                    
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest block mb-0.5">
                          Terminal code: {dept.deptId}
                        </span>
                        <h3 className="font-black text-xl text-gray-900 uppercase tracking-tight">
                          {dept.deptName}
                        </h3>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-white border border-gray-100 text-[8px] font-black uppercase tracking-widest text-gray-500">
                        {dept.txCount} Trans.
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm font-bold text-gray-500">
                        <span>Total Inflow</span>
                        <span className="text-emerald-600 font-black tabular-nums">
                          Rs. {dept.income.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-bold text-gray-500">
                        <span>Total Outflow</span>
                        <span className="text-rose-500 font-black tabular-nums">
                          Rs. {dept.expense.toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="h-px bg-gray-100 my-4" />
                      
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                          Net Balance
                        </span>
                        <span className={cn(
                          "text-base font-black tabular-nums",
                          isNetPositive ? "text-emerald-700" : "text-rose-700"
                        )}>
                          Rs. {net.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
