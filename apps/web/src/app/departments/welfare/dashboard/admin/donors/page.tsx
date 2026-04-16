// src/app/departments/welfare/dashboard/admin/donors/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, query, orderBy, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Donor } from '@/types/welfare';
import { formatDateDMY } from '@/lib/utils';
import {
  Banknote, Search, Heart, Plus, Loader2, ArrowRight, X, User, Copy, CheckCircle2, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function DonorsRegistryPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');

  useEffect(() => {
    const sessionData = localStorage.getItem('welfare_session');
    if (!sessionData) {
      router.push('/departments/welfare/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/welfare/login');
      return;
    }
    setSession(parsed);
    fetchDonors();
  }, [router]);

  const fetchDonors = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'welfare_donors'),
        orderBy('serialNumber', 'desc')
      );
      const snapshot = await getDocs(q);
      const donorsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Donor[];
      
      setDonors(donorsData);
    } catch (error) {
      console.error('Error fetching donors:', error);
      toast.error('Failed to load donors');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
  };

  const filteredDonors = donors.filter(d => {
    const q = searchQuery.toLowerCase();
    const searchMatch = 
      d.fullName?.toLowerCase().includes(q) || 
      d.donorNumber?.toLowerCase().includes(q) || 
      d.contactNumber?.includes(q);
    
    if (filter === 'active') return searchMatch && d.isActive;
    if (filter === 'inactive') return searchMatch && !d.isActive;
    return searchMatch;
  });

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-3">
            <Banknote className="text-teal-600" size={32} />
            Donor Registry
          </h1>
          <p className="text-gray-500 font-medium mt-1">Manage welfare sponsors and benefactors.</p>
        </div>
        <Link 
          href="/departments/welfare/dashboard/admin/donors/new"
          className="flex items-center gap-2 px-5 py-3 bg-teal-600 text-white rounded-xl text-sm font-black hover:bg-teal-700 transition-all shadow-lg shadow-teal-100"
        >
          <Plus size={16} /> New Donor
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-sm p-4 md:p-6 flex flex-col md:flex-row items-center gap-4">
        <div className="flex bg-gray-50 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setFilter('active')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              filter === 'active' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('inactive')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              filter === 'inactive' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Inactive
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              filter === 'all' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All
          </button>
        </div>

        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name, ID, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {filteredDonors.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-gray-900 font-bold mb-1">No donors found</h3>
          <p className="text-gray-500 text-sm">Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDonors.map((donor) => (
            <div key={donor.id} className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col hover:border-teal-200 transition-colors group relative overflow-hidden">
              {!donor.isActive && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="bg-red-100 text-red-600 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest">Inactive</span>
                </div>
              )}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 font-black text-lg">
                    {donor.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 line-clamp-1">{donor.fullName}</h3>
                    <div className="flex items-center gap-2 mt-1 -ml-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-500">
                        {donor.donorNumber}
                      </span>
                    </div>
                  </div>
                </div>
                {donor.donationScope === 'specific_child' && donor.linkedChildName && (
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 tooltip-trigger" title={`Sponsors ${donor.linkedChildName}`}>
                    <Heart size={14} className="fill-blue-500" />
                  </div>
                )}
              </div>

              <div className="space-y-3 mb-6 flex-1">
                <div className="text-sm">
                  <span className="text-gray-400 text-xs">Contact:</span>
                  <div className="font-medium text-gray-900">{donor.contactNumber}</div>
                </div>
                <div className="text-sm flex gap-4">
                  <div>
                    <span className="text-gray-400 text-xs">Type:</span>
                    <div className="font-black text-gray-900 text-xs uppercase tracking-widest mt-0.5">
                      {donor.donationType.replace('_', ' ')}
                    </div>
                  </div>
                  {donor.donationType === 'monthly_retainer' && (
                    <div>
                      <span className="text-gray-400 text-xs">Pledged:</span>
                      <div className="font-bold text-teal-600 text-xs mt-0.5">
                        Rs {(donor.monthlyAmount || 0).toLocaleString()}/mo
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium">Joined {formatDateDMY(donor.createdAt)}</span>
                <Link
                  href={`/departments/welfare/dashboard/admin/donors/${donor.id}`}
                  className="w-8 h-8 rounded-full bg-gray-50 text-gray-600 flex items-center justify-center hover:bg-teal-500 hover:text-white transition-colors"
                >
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
