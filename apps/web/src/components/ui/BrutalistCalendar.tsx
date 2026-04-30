'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
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
    const offset = selectedDate.getTimezoneOffset();
    const adjustedDate = new Date(selectedDate.getTime() - (offset * 60 * 1000));
    const isoString = adjustedDate.toISOString().split('T')[0];
    onChange(isoString);
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
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const isoString = now.toISOString().split('T')[0];
    onChange(isoString);
    setIsOpen(false);
  };

  const days = [];
  const totalDays = daysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const startDay = firstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

  for (let i = 0; i < startDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-10 md:h-12" />);
  }

  for (let d = 1; d <= totalDays; d++) {
    const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
    const isToday = new Date().toDateString() === dateObj.toDateString();
    
    // Correct way to compare ISO dates for selection check
    const offset = dateObj.getTimezoneOffset();
    const adjustedDate = new Date(dateObj.getTime() - (offset * 60 * 1000));
    const dayIso = adjustedDate.toISOString().split('T')[0];
    const isSelected = value === dayIso;
    
    days.push(
      <button
        key={d}
        type="button"
        onClick={() => handleDateClick(d)}
        className={cn(
          "h-10 md:h-12 w-full flex items-center justify-center text-[10px] md:text-xs font-black uppercase transition-all rounded-xl border-2",
          isSelected 
            ? "bg-indigo-600 border-indigo-600 text-white shadow-[4px_4px_0px_0px_rgba(79,70,229,0.2)] scale-95" 
            : isToday
              ? "bg-indigo-50 border-indigo-200 text-indigo-600"
              : "bg-white border-transparent text-zinc-600 hover:border-zinc-200 hover:bg-zinc-50"
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
  const years = Array.from({ length: 120 }, (_, i) => currentYear - i); // Last 120 years

  return (
    <div className={cn("relative", className)}>
      {label && <label className="text-[10px] font-black uppercase text-zinc-400 mb-2 block px-1 tracking-widest">{label}</label>}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-12 bg-white border-2 border-zinc-200 rounded-2xl px-4 flex items-center justify-between group hover:border-indigo-600 transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <CalendarIcon size={18} className="text-zinc-400 group-hover:text-indigo-600 transition-colors" />
          <span className="text-xs font-black uppercase tracking-widest text-zinc-900">
            {value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Select Date'}
          </span>
        </div>
        <div className="w-6 h-6 rounded-lg bg-zinc-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
          <ChevronRight size={14} className={cn("text-zinc-400 group-hover:text-indigo-600 transition-transform", isOpen && "rotate-90")} />
        </div>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[200]" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-3 bg-white border-4 border-zinc-900 rounded-[2rem] p-6 shadow-[8px_8px_0px_0px_rgba(24,24,27,1)] z-[201] animate-in slide-in-from-top-4 duration-300 w-[320px] md:w-[360px]">
            <div className="flex items-center justify-between mb-6">
              <button type="button" onClick={prevMonth} className="w-10 h-10 border-2 border-zinc-900 rounded-xl flex items-center justify-center hover:bg-zinc-50 active:scale-90 transition-all">
                <ChevronLeft size={18} />
              </button>
              <div className="text-center flex flex-col items-center">
                <select 
                  value={currentDate.getFullYear()} 
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="bg-transparent text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] outline-none cursor-pointer hover:text-indigo-600"
                >
                  {years.map(y => <option key={y} value={y} className="text-black font-sans">{y}</option>)}
                  {/* Also allow future years for joining dates etc */}
                  {Array.from({ length: 10 }, (_, i) => currentYear + 1 + i).map(y => <option key={y} value={y} className="text-black font-sans">{y}</option>)}
                </select>
                <p className="text-sm font-black uppercase tracking-widest">{monthNames[currentDate.getMonth()]}</p>
              </div>
              <button type="button" onClick={nextMonth} className="w-10 h-10 border-2 border-zinc-900 rounded-xl flex items-center justify-center hover:bg-zinc-50 active:scale-90 transition-all">
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="text-center text-[9px] font-black uppercase text-zinc-400 py-2">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days}
            </div>

            <div className="mt-6 pt-4 border-t-2 border-zinc-100 flex items-center justify-between">
              <button 
                type="button" 
                onClick={goToToday}
                className="text-[9px] font-black uppercase tracking-widest bg-zinc-900 text-white px-3 py-1.5 rounded-lg hover:scale-105 transition-all"
              >
                Today
              </button>
              <button 
                type="button" 
                onClick={() => setIsOpen(false)}
                className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors"
              >
                Close Portal
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
