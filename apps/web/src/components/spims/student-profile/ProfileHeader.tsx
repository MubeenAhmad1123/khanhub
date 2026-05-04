// src/components/spims/student-profile/ProfileHeader.tsx
'use client';

import React from 'react';
import { User, Wallet, Calendar, GraduationCap, Phone } from 'lucide-react';
import type { SpimsStudent } from '@/types/spims';
import { formatDateDMY } from '@/lib/utils';

interface ProfileHeaderProps {
  student: SpimsStudent;
}

export default function ProfileHeader({ student }: ProfileHeaderProps) {
  const totalPkg = Number(student.totalPackage) || 0;

  return (
    <div className="relative overflow-hidden rounded-2xl md:rounded-[2.5rem] bg-white border border-gray-100 shadow-xl shadow-gray-200/50">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#1D9E75]/5 rounded-full -mr-32 -mt-32 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/5 rounded-full -ml-24 -mb-24 blur-3xl" />

      <div className="relative p-5 md:p-10">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start text-center md:text-left">
          {/* Avatar Section */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] bg-gradient-to-br from-[#1D9E75] to-teal-700 flex items-center justify-center text-white shadow-2xl shadow-[#1D9E75]/30 transform group-hover:rotate-3 transition-transform duration-500">
              {student.name ? (
                <span className="text-3xl md:text-5xl font-black">{student.name.charAt(0)}</span>
              ) : (
                <User size={48} />
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-white p-1.5 md:p-2 rounded-xl shadow-lg border border-gray-50">
              <div className="bg-gray-100 px-2 py-0.5 md:py-1 rounded-lg text-[8px] md:text-[9px] font-black text-gray-500 uppercase tracking-widest">
                ID: {student.rollNo}
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="flex-1 space-y-4 w-full">
            <div className="flex flex-col items-center md:items-start">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
                <span className="px-3 py-1 bg-[#1D9E75]/10 text-[#1D9E75] text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full">
                  {student.status || 'Active'}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full">
                  {student.course}
                </span>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full">
                  {student.session}
                </span>
              </div>
              <h1 className="text-2xl min-[400px]:text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-2">
                {student.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 text-gray-400 font-bold text-[10px] md:text-sm uppercase tracking-wider">
                <p className="flex items-center gap-1.5 bg-gray-50 md:bg-transparent px-3 py-1.5 md:p-0 rounded-lg">
                  <GraduationCap size={14} className="text-[#1D9E75]" />
                  Roll {student.rollNo}
                </p>
                <span className="hidden md:block w-1 h-1 rounded-full bg-gray-200" />
                <p className="flex items-center gap-1.5 bg-gray-50 md:bg-transparent px-3 py-1.5 md:p-0 rounded-lg">
                  <Phone size={14} className="text-[#1D9E75]" />
                  {student.contact || (student as any).phone || 'No Phone'}
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 pt-4">
              <div className="bg-gray-50/50 p-4 rounded-xl md:rounded-2xl border border-gray-100/50 flex flex-col items-center md:items-start">
                <div className="flex items-center gap-3 text-gray-400 mb-1">
                  <Wallet size={14} className="text-[#1D9E75]" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">Total Package</span>
                </div>
                <p className="text-xl font-black text-[#1D9E75]">
                  Rs {totalPkg.toLocaleString()}
                </p>
              </div>

              <div className="bg-gray-50/50 p-4 rounded-xl md:rounded-2xl border border-gray-100/50 flex flex-col items-center md:items-start">
                <div className="flex items-center gap-3 text-gray-400 mb-1">
                  <Calendar size={14} className="text-[#1D9E75]" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">Joined On</span>
                </div>
                <p className="text-lg md:text-xl font-black text-gray-900">
                  {formatDateDMY(student.admissionDate)}
                </p>
              </div>

              <div className="bg-gray-50/50 p-4 rounded-xl md:rounded-2xl border border-gray-100/50 flex flex-col items-center md:items-start sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-3 text-gray-400 mb-1">
                  <User size={14} className="text-[#1D9E75]" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">Guardian Contact</span>
                </div>
                <p className="text-lg md:text-xl font-black text-gray-900 truncate max-w-full">
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
