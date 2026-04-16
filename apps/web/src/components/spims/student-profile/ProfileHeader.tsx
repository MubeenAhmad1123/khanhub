// src/components/spims/student-profile/ProfileHeader.tsx
'use client';

import React from 'react';
import { User, Wallet, Calendar, GraduationCap } from 'lucide-react';
import type { SpimsStudent } from '@/types/spims';

interface ProfileHeaderProps {
  student: SpimsStudent;
}

export default function ProfileHeader({ student }: ProfileHeaderProps) {
  const balance = Number(student.remaining) || 0;
  const isPending = balance > 0;

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] bg-white border border-gray-100 shadow-xl shadow-gray-200/50">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#1D9E75]/5 rounded-full -mr-32 -mt-32 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/5 rounded-full -ml-24 -mb-24 blur-3xl" />

      <div className="relative p-6 md:p-10">
        <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
          {/* Avatar Section */}
          <div className="relative group">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] bg-gradient-to-br from-[#1D9E75] to-teal-700 flex items-center justify-center text-white shadow-2xl shadow-[#1D9E75]/30 transform group-hover:rotate-3 transition-transform duration-500">
              {student.name ? (
                <span className="text-3xl md:text-5xl font-black">{student.name.charAt(0)}</span>
              ) : (
                <User size={48} />
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-xl shadow-lg border border-gray-50">
              <div className="bg-gray-100 px-2 py-1 rounded-lg text-[9px] font-black text-gray-500 uppercase tracking-widest">
                ID: {student.rollNo}
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-[#1D9E75]/10 text-[#1D9E75] text-[10px] font-black uppercase tracking-widest rounded-full">
                  {student.status || 'Active'}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-full">
                  {student.course}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">
                {student.name}
              </h1>
              <p className="text-gray-400 font-bold flex items-center gap-2 text-sm mt-1 uppercase tracking-wider">
                <GraduationCap size={16} />
                Session {student.session} • Roll No {student.rollNo}
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                <div className="flex items-center gap-3 text-gray-400 mb-1">
                  <Wallet size={14} className="text-[#1D9E75]" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">Current Balance</span>
                </div>
                <p className={`text-xl font-black ${isPending ? 'text-amber-600' : 'text-[#1D9E75]'}`}>
                  Rs {balance.toLocaleString()}
                </p>
              </div>

              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                <div className="flex items-center gap-3 text-gray-400 mb-1">
                  <Calendar size={14} className="text-[#1D9E75]" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">Joined On</span>
                </div>
                <p className="text-xl font-black text-gray-900">
                  {student.admissionDate 
                    ? (typeof (student.admissionDate as any).toDate === 'function' 
                        ? (student.admissionDate as any).toDate() 
                        : new Date(student.admissionDate as any)
                      ).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) 
                    : 'N/A'}
                </p>
              </div>

              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                <div className="flex items-center gap-3 text-gray-400 mb-1">
                  <User size={14} className="text-[#1D9E75]" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">Parent Contact</span>
                </div>
                <p className="text-xl font-black text-gray-900 truncate">
                  {student.fatherContact || '---'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
