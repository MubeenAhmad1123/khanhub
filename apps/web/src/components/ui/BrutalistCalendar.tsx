'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrutalistCalendarProps {
  value: string; // ISO format YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  className?: string;
}

export function BrutalistCalendar({ value, onChange, label, className }: BrutalistCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(value ? new Date(value) : new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleDateClick = (day: number) => {
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    // Use local time for ISO string to avoid timezone shifts
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const setYear = (year: number) => {
    setCurrentDate(new Date(year, currentDate.getMonth(), 1));
  };

  const goToToday = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const days = [];
  const totalDays = daysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const startDay = firstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

  for (let i = 0; i < startDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-10 w-full" />);
  }

  for (let d = 1; d <= totalDays; d++) {
    const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
    const isToday = new Date().toDateString() === dateObj.toDateString();
    
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dayVal = String(dateObj.getDate()).padStart(2, '0');
    const dayIso = `${y}-${m}-${dayVal}`;
    const isSelected = value === dayIso;
    
    days.push(
      <button
        key={d}
        type="button"
        onClick={() => handleDateClick(d)}
        className={cn(
          "h-10 w-full flex items-center justify-center text-xs font-bold rounded-xl transition-all",
          isSelected 
            ? "bg-black text-white shadow-lg scale-90" 
            : isToday
              ? "bg-indigo-50 text-indigo-600 font-black"
              : "text-zinc-600 hover:bg-zinc-100"
        )}
      >
        {d}
      </button>
    );
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 130 }, (_, i) => (currentYear + 10) - i);

  return (
    <div className={cn("relative", className)}>
      {label && <label className="text-[10px] font-black uppercase text-zinc-400 mb-1.5 block px-1 tracking-widest">{label}</label>}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-11 bg-white border border-zinc-200 rounded-xl px-4 flex items-center justify-between group hover:border-black transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <CalendarIcon size={16} className="text-zinc-400 group-hover:text-black transition-colors" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-900">
            {value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Select Date'}
          </span>
        </div>
        <ChevronRight size={14} className={cn("text-zinc-300 group-hover:text-black transition-transform", isOpen && "rotate-90")} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[200]" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 bg-white border border-zinc-200 rounded-2xl p-5 shadow-2xl z-[201] animate-in zoom-in-95 duration-200 w-[300px]">
            <div className="flex items-center justify-between mb-4">
              <button type="button" onClick={prevMonth} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
                <ChevronLeft size={16} />
              </button>
              <div className="text-center">
                <select 
                  value={currentDate.getFullYear()} 
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="bg-transparent text-[10px] font-black uppercase text-zinc-400 tracking-widest outline-none cursor-pointer hover:text-black mb-0.5"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <p className="text-[11px] font-black uppercase tracking-widest text-zinc-900">{monthNames[currentDate.getMonth()]}</p>
              </div>
              <button type="button" onClick={nextMonth} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="text-center text-[9px] font-bold uppercase text-zinc-400">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days}
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-100">
              <button 
                type="button" 
                onClick={goToToday}
                className="w-full text-[10px] font-black uppercase tracking-widest bg-zinc-50 text-zinc-900 py-2.5 rounded-xl hover:bg-black hover:text-white transition-all"
              >
                Today
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
