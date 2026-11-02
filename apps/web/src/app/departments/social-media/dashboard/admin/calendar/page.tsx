// apps/web/src/app/departments/social-media/dashboard/admin/calendar/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Calendar, Upload } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import CreationCalendarView from '@/components/upload/CreationCalendarView';
import { UploadingSheetView } from '@/components/upload/UploadingSheetView';
import { WhatsAppSheetView } from '@/components/upload/WhatsAppSheetView';

export default function MediaCalendarPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'creation' | 'uploading' | 'whatsapp'>(
    tabParam === 'whatsapp' ? 'whatsapp' : tabParam === 'uploading' ? 'uploading' : 'creation'
  );

  useEffect(() => {
    if (tabParam === 'uploading' || tabParam === 'creation' || tabParam === 'whatsapp') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: 'creation' | 'uploading' | 'whatsapp') => {
    setActiveTab(tab);
    router.replace(`${pathname}?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      {/* ── Sub-Navigation Tab Bar (Creation / Uploading / WhatsApp) ── */}
      <div className="bg-white p-2 rounded-3xl border border-gray-100 shadow-xs flex items-center justify-between gap-2 max-w-2xl mx-auto sm:mx-0 print:hidden">
        <button
          type="button"
          onClick={() => handleTabChange('creation')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-2xl text-xs font-black transition-all duration-200 select-none ${
            activeTab === 'creation'
              ? 'bg-indigo-600 text-white shadow-xs scale-100'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Calendar size={15} />
          <span>Creation Calendar</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('uploading')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-2xl text-xs font-black transition-all duration-200 select-none ${
            activeTab === 'uploading'
              ? 'bg-indigo-600 text-white shadow-xs scale-100'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Upload size={15} />
          <span>Uploading Sheet</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('whatsapp')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-2xl text-xs font-black transition-all duration-200 select-none ${
            activeTab === 'whatsapp'
              ? 'bg-emerald-600 text-white shadow-xs scale-100'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <FaWhatsapp size={15} className={activeTab === 'whatsapp' ? 'text-white' : 'text-[#25D366]'} />
          <span>WhatsApp Sheet</span>
        </button>
      </div>

      {/* ── Tab Views ── */}
      {activeTab === 'creation' ? (
        <CreationCalendarView />
      ) : activeTab === 'uploading' ? (
        <UploadingSheetView />
      ) : (
        <WhatsAppSheetView />
      )}
    </div>
  );
}
