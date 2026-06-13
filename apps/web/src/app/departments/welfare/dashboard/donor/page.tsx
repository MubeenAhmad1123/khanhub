'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Donor, Transaction } from '@/types/welfare';
import { formatDateDMY } from '@/lib/utils';
import { 
  Heart, Banknote, ShieldCheck, Mail, FileText, Loader2, Calendar, Phone, ArrowRight, User
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function DonorDashboardPage() {
  const router = useRouter();
  const [donor, setDonor] = useState<Donor | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const sessionStr = localStorage.getItem('welfare_session');
    if (!sessionStr) {
      router.push('/departments/welfare/login');
      return;
    }
    setSession(JSON.parse(sessionStr));
  }, [router]);

  useEffect(() => {
    if (session?.uid) {
      fetchDonorData();
    }
  }, [session]);

  const fetchDonorData = async () => {
    try {
      setLoading(true);
      // Find the donor profile linked to this user ID
      const donorQuery = query(
        collection(db, 'welfare_donors'),
        where('loginUserId', '==', session.uid)
      );
      const donorSnap = await getDocs(donorQuery);
      
      if (donorSnap.empty) {
        setLoading(false);
        return;
      }
      
      const donorData = { id: donorSnap.docs[0].id, ...donorSnap.docs[0].data() } as Donor;
      setDonor(donorData);

      // Fetch their transactions
      const txnQuery = query(
        collection(db, 'welfare_transactions'),
        where('donorId', '==', donorData.id),
        where('type', '==', 'income'),
        orderBy('createdAt', 'desc')
      );
      const txnSnap = await getDocs(txnQuery);
      setTransactions(txnSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    } catch (err) {
      console.error('Error fetching donor data:', err);
      toast.error('Failed to load your dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading your dashboard...</p>
      </div>
    );
  }

  if (!donor) {
    return (
      <div className="max-w-4xl mx-auto mt-10 p-10 bg-white rounded-[2rem] shadow-sm border border-gray-100 text-center">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <User className="text-rose-500" size={40} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Profile Not Linked</h2>
        <p className="text-gray-500 max-w-md mx-auto mb-8">
          Your login account is active, but it has not been linked to a donor profile. Please contact the welfare administration to link your account.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-[2.5rem] p-8 md:p-12 shadow-lg text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-4xl font-black border-4 border-white/30 shadow-xl shrink-0">
            {donor.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">Welcome, {donor.fullName}!</h1>
            <p className="text-teal-50 text-lg opacity-90 max-w-2xl">
              Thank you for your generous support to KhanHub Welfare. Your contributions make a real difference in the lives of those we serve.
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-6">
              <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-bold tracking-widest uppercase flex items-center gap-2">
                <Heart size={16} /> {donor.donorNumber}
              </span>
              <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
                <Calendar size={16} /> Member since {formatDateDMY(donor.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-8">
          {/* Sponsorship Status */}
          <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 text-indigo-600 mb-6 border-b border-gray-50 pb-6">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Heart size={20} />
              </div>
              <h3 className="text-xl font-black text-gray-900">Your Sponsorship</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Scope</p>
                <div className="font-bold text-gray-900">
                  {donor.donationScope === 'specific_child' ? 'Specific Child Sponsorship' : 'General Welfare Fund'}
                </div>
              </div>

              {donor.donationScope === 'specific_child' && donor.linkedChildName && (
                <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-100/50 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-indigo-400 mb-2 relative z-10">You are sponsoring</p>
                  <div className="font-black text-indigo-700 text-lg relative z-10">
                    {donor.linkedChildName}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Commitment Type</p>
                <div className="font-bold text-teal-600 uppercase tracking-widest text-sm">
                  {donor.donationType.replace('_', ' ')}
                </div>
              </div>

              {donor.donationType === 'monthly_retainer' && donor.monthlyAmount && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Monthly Pledge</p>
                  <div className="font-black text-gray-900 text-3xl">
                    Rs {donor.monthlyAmount.toLocaleString()}<span className="text-sm text-gray-400 font-medium">/mo</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
             <div className="flex items-center gap-3 text-emerald-600 mb-6 border-b border-gray-50 pb-6">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <User size={20} />
              </div>
              <h3 className="text-xl font-black text-gray-900">Profile Details</h3>
            </div>
            <div className="space-y-4 text-sm font-medium text-gray-600">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gray-400" />
                {donor.contactNumber}
              </div>
              {donor.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {donor.email}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Donation History */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm h-full">
            <div className="p-8 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-teal-600">
                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                  <Banknote size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Donation History</h3>
                  <p className="text-sm font-medium text-gray-500 mt-1">Your past contributions</p>
                </div>
              </div>
              <div className="bg-teal-50 px-4 py-2 rounded-xl text-center">
                <p className="text-[10px] uppercase tracking-widest font-bold text-teal-500 mb-0.5">Total Donations</p>
                <p className="font-black text-teal-700">{transactions.length}</p>
              </div>
            </div>

            {transactions.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10 text-gray-300" />
                </div>
                <h4 className="text-xl text-gray-900 font-black mb-2">No Donations Yet</h4>
                <p className="text-gray-500 max-w-md mx-auto">We haven't recorded any donations for your profile yet. Once you make a contribution, it will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {transactions.map(txn => (
                  <div key={txn.id} className="p-6 md:p-8 hover:bg-gray-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                        <Banknote size={24} />
                      </div>
                      <div>
                        <div className="font-black text-gray-900 text-lg flex items-center gap-3 mb-1">
                          Rs {txn.amount.toLocaleString()}
                          <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-widest ${
                            txn.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                            txn.status === 'pending' || txn.status === 'pending_cashier' ? 'bg-amber-50 text-amber-600' :
                            'bg-rose-50 text-rose-600'
                          }`}>
                            {txn.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-500 flex items-center gap-2">
                          <Calendar size={14} /> {formatDateDMY(txn.createdAt)} • {txn.categoryName || txn.category}
                        </div>
                      </div>
                    </div>
                    {txn.txnDescription && (
                      <div className="text-sm font-medium text-gray-600 bg-gray-50 p-4 rounded-2xl sm:max-w-xs w-full">
                        "{txn.txnDescription}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
