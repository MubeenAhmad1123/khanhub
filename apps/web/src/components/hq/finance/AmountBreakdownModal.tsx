// src/components/hq/finance/AmountBreakdownModal.tsx

'use client';

import React from 'react';
import { Dialog, DialogOverlay, DialogContent } from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DailyDeptBreakdown } from '@/lib/hq/superadmin/finance';

interface AmountBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: DailyDeptBreakdown[];
}

export default function AmountBreakdownModal({ isOpen, onClose, departments }: AmountBreakdownModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogOverlay className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      <DialogContent asChild>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-10 md:inset-20 lg:inset-32 bg-white rounded-2xl shadow-xl p-8 overflow-auto"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black">Amount Breakdown</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {departments.map((dept) => (
              <div key={dept.deptId} className="p-6 border rounded-xl shadow-sm">
                <h3 className="font-black text-lg mb-2">{dept.deptName}</h3>
                <p className="text-sm">Income: Rs. {dept.income.toLocaleString()}</p>
                <p className="text-sm">Expense: Rs. {dept.expense.toLocaleString()}</p>
                <p className="text-sm">Transfers: {dept.txCount}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
