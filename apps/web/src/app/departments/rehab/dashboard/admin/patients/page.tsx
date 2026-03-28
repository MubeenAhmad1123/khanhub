'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Heart, Plus, Search, ChevronRight, User, Calendar, Package, Loader2 
} from 'lucide-react';

export default function PatientsListPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const sessionData = localStorage.getItem('rehab_session');
    if (!sessionData) {
      router.push('/departments/rehab/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/rehab/login');
      return;
    }
    setSession(parsed);
    fetchPatients();
  }, [router]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      // No where/orderBy — avoids index issues
      const snap = await getDocs(collection(db, 'rehab_patients'));
      
      const all = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || '',
          photoUrl: data.photoUrl || null,
          admissionDate: data.admissionDate?.toDate?.() 
            ? data.admissionDate.toDate() 
            : data.admissionDate 
              ? new Date(data.admissionDate) 
              : new Date(),
          packageAmount: Number(data.packageAmount) || 60000,
          diagnosis: data.diagnosis || '',
          isActive: data.isActive !== false, // default true
          fatherName: data.fatherName || '',
          phone: data.phone || '',
          age: data.age || '',
          createdAt: data.createdAt?.toDate?.()
            ? data.createdAt.toDate()
            : new Date(),
        };
      })
      // Sort newest first client-side
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      // Only active ones
      .filter(p => p.isActive !== false);

      setPatients(all);
    } catch (err: any) {
      console.error('Fetch patients error:', err?.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalActive = patients.length;
  const newThisMonth = patients.filter(p => {
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);
    return p.admissionDate >= firstOfMonth;
  }).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Heart className="w-6 h-6 text-teal-600" />
              Patients
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage all active patients</p>
          </div>
          <Link 
            href="/departments/rehab/dashboard/admin/patients/new"
            className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add Patient
          </Link>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Active</p>
              <p className="text-2xl font-bold text-gray-900">{totalActive}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">New This Month</p>
              <p className="text-2xl font-bold text-gray-900">{newThisMonth}</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
            placeholder="Search patients by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Patient Grid */}
        {filteredPatients.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No patients found</h3>
            <p className="text-gray-500 text-sm">
              {searchQuery ? "Try adjusting your search query." : "Add your first patient to get started."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPatients.map(patient => (
              <Link 
                href={`/departments/rehab/dashboard/admin/patients/${patient.id}`} 
                key={patient.id}
                className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-teal-900/5 hover:border-teal-200 transition-all active:scale-[0.98] group flex flex-col h-full relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-500">
                        <ChevronRight size={16} />
                    </div>
                </div>
                
                <div className="flex items-center gap-4 mb-5">
                    <div className="relative">
                        {patient.photoUrl ? (
                            <img src={patient.photoUrl} alt={patient.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md font-black text-[10px] text-gray-300 flex items-center justify-center bg-gray-50" />
                        ) : (
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 text-teal-700 flex items-center justify-center font-black text-2xl border border-teal-200/50 shadow-inner">
                                {patient.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-black text-gray-900 truncate leading-tight">
                            {patient.name}
                        </h3>
                        <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mt-1">
                            Active Patient
                        </p>
                    </div>
                </div>

                <div className="mt-auto space-y-3 pt-4 border-t border-gray-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            <Calendar size={12} className="text-teal-400" />
                            {patient.admissionDate instanceof Date 
                                ? patient.admissionDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) 
                                : 'No date'
                            }
                        </div>
                        <div className="text-[11px] font-black text-gray-900 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100/50">
                            PKR {patient.packageAmount?.toLocaleString() || 0}
                        </div>
                    </div>
                    <div className="text-xs font-medium text-gray-500 line-clamp-1 italic bg-gray-50/50 p-2 rounded-xl border border-gray-100/50">
                        "{patient.diagnosis || "No diagnosis specified"}"
                    </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
