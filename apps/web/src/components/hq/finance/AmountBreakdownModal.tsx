// src/components/hq/finance/AmountBreakdownModal.tsx

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  source: string;
  amount: number;
  category: string;
  status: string;
  type: string;
}

interface AmountBreakdownModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  transactions: Transaction[];
}

export default function AmountBreakdownModal({
  open,
  onClose,
  title,
  transactions,
}: AmountBreakdownModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8 relative"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            <h2 className="text-2xl font-black text-gray-900 mb-6">{title}</h2>

            {transactions.length === 0 ? (
              <p className="text-center text-gray-500">No transactions found.</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-3 text-xs font-black uppercase text-gray-600">
                      Source
                    </th>
                    <th className="p-3 text-xs font-black uppercase text-gray-600">
                      Amount (Rs.)
                    </th>
                    <th className="p-3 text-xs font-black uppercase text-gray-600">
                      Category
                    </th>
                    <th className="p-3 text-xs font-black uppercase text-gray-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-t border-gray-100">
                      <td className="p-3 text-sm font-medium text-gray-800">
                        {tx.source}
                      </td>
                      <td className="p-3 text-sm font-black text-gray-900">
                        {tx.amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-sm text-gray-600">{tx.category}</td>
                      <td className="p-3 text-sm font-black text-gray-700">
                        {tx.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
