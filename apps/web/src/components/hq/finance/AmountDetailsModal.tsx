// src/components/hq/finance/AmountDetailsModal.tsx

'use client';

import React from 'react';
import { Dialog, DialogOverlay, DialogContent } from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface DepartmentInfo {
  deptName: string;
  income: number;
  expense: number;
}

interface AmountDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandIncome: number;
  grandExpense: number;
  departments: DepartmentInfo[];
}

export const AmountDetailsModal: React.FC<AmountDetailsModalProps> = ({
  isOpen,
  onClose,
  grandIncome,
  grandExpense,
  departments,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogOverlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]" />
      <DialogContent asChild>
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[100]">
          <motion.div
            className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl p-8 overflow-y-auto max-h-[80vh] text-gray-900"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition p-2 rounded-full hover:bg-gray-100"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-2xl font-black mb-6 text-gray-900 uppercase tracking-tight">
              Amount Breakdown
            </h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl shadow-sm">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Total Income</p>
                <p className="text-xl font-black text-emerald-950">Rs. {grandIncome.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl shadow-sm">
                <p className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-1">Total Expense</p>
                <p className="text-xl font-black text-rose-950">Rs. {grandExpense.toLocaleString()}</p>
              </div>
            </div>
            
            <h3 className="text-lg font-black mb-4 text-gray-800 uppercase tracking-tight">
              Department Details
            </h3>
            
            <div className="space-y-4">
              {departments.map((dept, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-4 bg-gray-50 border border-gray-100 rounded-xl"
                >
                  <span className="font-bold text-gray-800 uppercase text-xs tracking-wider">{dept.deptName}</span>
                  <div className="flex gap-6 text-xs font-black">
                    <span className="text-emerald-700">
                      Inflow: Rs. {dept.income.toLocaleString()}
                    </span>
                    <span className="text-rose-700">
                      Outflow: Rs. {dept.expense.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
