'use client';

import React, { useState, useEffect } from 'react';
import { markAttendance, hasMarkedToday } from '@/lib/job-center/attendance';

export default function AttendanceMarker({ staffId }: { staffId: string }) {
  const [marked, setMarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const today = new Date().toISOString().split('T')[0];
      const result = await hasMarkedToday(staffId, today);
      setMarked(result);
      setLoading(false);
    };
    checkStatus();
  }, [staffId]);

  const handleMark = async () => {
    setProcessing(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await markAttendance(staffId, today);
      setMarked(true);
    } catch (err) {
      alert('Error marking attendance');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="animate-pulse bg-gray-100 h-24 rounded-2xl w-full" />;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between gap-6">
      <div className="flex-1">
        <h3 className="text-lg font-bold text-gray-900">Today's Attendance</h3>
        <p className="text-sm text-gray-500">{marked ? 'You have successfully marked your attendance for today.' : 'Click the button below to mark your presence for today.'}</p>
      </div>
      <button
        disabled={marked || processing}
        onClick={handleMark}
        className={`px-8 py-4 rounded-xl font-black text-lg shadow-xl transition-all ${
          marked 
            ? 'bg-green-50 text-green-600 shadow-none cursor-default' 
            : 'bg-[#1D9E75] text-white hover:bg-[#1D9E75]/90 shadow-[#1D9E75]/20 active:scale-95'
        }`}
      >
        {processing ? 'Processing...' : marked ? 'PRESENT ✓' : 'MARK PRESENCE'}
      </button>
    </div>
  );
}
