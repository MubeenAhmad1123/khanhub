// d:\khanhub\apps\web\src\components\job-center\employer-profile\HireHistoryTab.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { JobSeeker } from '@/types/job-center';
import { 
  User, Calendar, MapPin, Search, Loader2, 
  ChevronRight, Award, GraduationCap, Building2
} from 'lucide-react';
import Link from 'next/link';
import { formatDateDMY } from '@/lib/utils';

interface HireHistoryTabProps {
  employerId: string;
}

export default function HireHistoryTab({ employerId }: HireHistoryTabProps) {
  const [hiredSeekers, setHiredSeekers] = useState<JobSeeker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHiredSeekers();
  }, [employerId]);

  const fetchHiredSeekers = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'jobcenter_seekers'), 
        where('employedAt', '==', employerId)
      );
      const snap = await getDocs(q);
      setHiredSeekers(snap.docs.map(d => ({ id: d.id, ...d.data() })) as JobSeeker[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 opacity-20" />
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Loading Hire History...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-gray-900">Placement History</h2>
        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5">Seekers successfully hired by this company</p>
      </div>

      {hiredSeekers.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-gray-900 font-black">No hires recorded</h3>
          <p className="text-gray-500 text-xs mt-1">No seekers have been placed with this employer through KhanHub yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hiredSeekers.map(seeker => (
            <Link 
              href={`/departments/job-center/dashboard/admin/seekers/${seeker.id}`}
              key={seeker.id} 
              className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:border-indigo-200 transition-all group relative overflow-hidden flex flex-col"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="text-indigo-500" size={18} />
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-lg">
                  {seeker.photoUrl ? (
                    <img src={seeker.photoUrl} alt={seeker.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    seeker.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h4 className="font-black text-gray-900 text-sm truncate max-w-[150px]">{seeker.name}</h4>
                  <p className="text-[10px] font-mono text-indigo-600 font-black">{seeker.seekerNumber}</p>
                </div>
              </div>

              <div className="space-y-2 mt-auto">
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                  <GraduationCap size={12} className="text-gray-300" />
                  <span>{seeker.education}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                  <Award size={12} className="text-gray-300" />
                  <span className="truncate">{seeker.skills?.join(', ') || 'No skills listed'}</span>
                </div>
                <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-gray-400 flex items-center gap-1"><Calendar size={12} /> Hired Date</span>
                  <span className="text-gray-700">{seeker.createdAt ? formatDateDMY(seeker.createdAt) : 'N/A'}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
