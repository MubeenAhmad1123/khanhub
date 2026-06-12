'use client';

import React from 'react';
import { Utensils } from 'lucide-react';

export default function FoodTab({ childId, session }: any) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
          <Utensils size={20} />
        </div>
        <h2 className="text-xl font-black text-gray-900">Nutrition & Food</h2>
      </div>
      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-12 text-center">
        <p className="text-gray-500 font-medium">Dietary plan coming soon...</p>
      </div>
    </div>
  );
}
