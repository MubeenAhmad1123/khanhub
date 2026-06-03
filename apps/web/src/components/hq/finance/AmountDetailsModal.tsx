// src/components/hq/finance/AmountDetailsModal.tsx

'use client';

import React from 'react';
import { Dialog, DialogOverlay, DialogContent } from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
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
      <DialogOverlay asChild>
        <motion.div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      </DialogOverlay>
      <DialogContent asChild>
        <motion.div
          className="fixed inset-0 flex items-center justify-center p-4"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
        >
          <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl p-8 overflow-y-auto max-h-[80vh]">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl font-black mb-6 text-gray-900">Amount Breakdown</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-emerald-50 rounded-lg shadow">
                <p className="text-sm font-bold text-emerald-700">Total Income</p>
                <p className="text-xl font-black text-emerald-900">Rs. {grandIncome.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-rose-50 rounded-lg shadow">
                <p className="text-sm font-bold text-rose-700">Total Expense</p>
                <p className="text-xl font-black text-rose-900">Rs. {grandExpense.toLocaleString()}</p>
              </div>
            </div>
            <h3 className="text-xl font-black mb-4 text-gray-800">Department Details</h3>
            <div className="space-y-4">
              {departments.map((dept, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                >
                  <span className="font-medium text-gray-700">{dept.deptName}</span>
                  <span className="font-black text-gray-900">
                    Income: Rs. {dept.income.toLocaleString()}
                  </span>
                  <span className="font-black text-gray-900">
                    Expense: Rs. {dept.expense.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
