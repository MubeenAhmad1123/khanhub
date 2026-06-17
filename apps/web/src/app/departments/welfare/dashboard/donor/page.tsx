'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Donor, Transaction } from '@/types/welfare';
import { formatDateDMY } from '@/lib/utils';
import { 
  Heart, User, Phone, MapPin, 
  Banknote, Calendar, ShieldCheck, Mail, AlertTriangle, FileText, Loader2, ArrowRight
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

      // Fetch their transactions (Donations)
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
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      
      {/* Header Profile Summary */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 w-full p-6 md:p-10 flex flex-col items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-teal-50 rounded-bl-full opacity-50 -z-0"></div>
        
        <div className="relative z-10 w-24 h-24 md:w-32 md:h-32 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-black text-4xl border-4 border-white shadow-md">
          {donor.fullName.charAt(0).toUpperCase()}
        </div>
        
        <div className="relative z-10 text-center">
          <h1 className="text-3xl font-black text-gray-900 mb-2">{donor.fullName}</h1>
          <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500 mb-6">
            <span className="flex items-center justify-center gap-1 font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-widest text-xs">
              {donor.donorNumber}
            </span>
            <span className="flex items-center justify-center gap-1">
              <Calendar className="w-4 h-4" /> 
              Joined {formatDateDMY(donor.createdAt)}
            </span>
            <span className={`flex items-center justify-center gap-1 font-medium px-3 py-1 rounded-full text-xs uppercase tracking-widest ${donor.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              <ShieldCheck className="w-4 h-4" /> {donor.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-gray-600">
            <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl">
              <Phone className="w-4 h-4 text-gray-400" />
              {donor.contactNumber}
            </div>
            {donor.email && (
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl">
                <Mail className="w-4 h-4 text-gray-400" />
                {donor.email}
              </div>
            )}
            {donor.address && (
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl">
                <MapPin className="w-4 h-4 text-gray-400" />
                {donor.address}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2rem] border border-gray-100 p-6 md:p-8">
            <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500" />
              Sponsorship Details
            </h3>
            
            <div className="space-y-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Scope</p>
                <div className="font-bold text-gray-900">
                  {donor.donationScope === 'specific_child' ? 'Specific Child Sponsorship' : 'General Welfare Fund'}
                </div>
              </div>

              {donor.donationScope === 'specific_child' && donor.linkedChildName && (
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-blue-400 mb-2">Sponsoring</p>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-blue-700">{donor.linkedChildName}</span>
                    {donor.linkedChildId && (
                      <Link 
                        href={`/departments/welfare/dashboard/child/${donor.linkedChildId}`}
                        className="w-8 h-8 rounded-full bg-white text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-colors shadow-sm"
                      >
                        <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Type</p>
                <div className="font-bold text-teal-600 uppercase tracking-widest text-sm">
                  {donor.donationType.replace('_', ' ')}
                </div>
              </div>

              {donor.donationType === 'monthly_retainer' && donor.monthlyAmount && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Pledged Amount</p>
                  <div className="font-black text-gray-900 text-2xl">
                    Rs {donor.monthlyAmount.toLocaleString()}<span className="text-sm text-gray-400 font-medium">/mo</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {donor.notes && (
            <div className="bg-amber-50 rounded-[2rem] border border-amber-100 p-6 md:p-8">
              <h3 className="text-sm font-black text-amber-900 mb-3 flex items-center gap-2 uppercase tracking-widest">
                <AlertTriangle className="w-4 h-4" /> Profile Notes
              </h3>
              <p className="text-amber-800 text-sm leading-relaxed">{donor.notes}</p>
            </div>
          )}
        </div>

        {/* Right Column: Transactions */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-teal-600" />
                Donation History
              </h3>
              <span className="text-xs font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded-full uppercase tracking-widest">
                {transactions.length} Records
              </span>
            </div>

            {transactions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-gray-300" />
                </div>
                <h4 className="text-gray-900 font-bold">No Donations Found</h4>
                <p className="text-gray-500 text-sm mt-1">This donor has no recorded transactions yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {transactions.map(txn => (
                  <div key={txn.id} className="p-4 md:p-6 hover:bg-gray-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                        <Banknote size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 flex items-center gap-2">
                          Rs {txn.amount.toLocaleString()}
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest ${
                            txn.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                            txn.status === 'pending' || txn.status === 'pending_cashier' ? 'bg-amber-50 text-amber-600' :
                            'bg-rose-50 text-rose-600'
                          }`}>
                            {txn.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDateDMY(txn.createdAt)} • {txn.categoryName || txn.category}
                        </div>
                      </div>
                    </div>
                    {txn.txnDescription && (
                      <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-xl sm:max-w-[200px] truncate">
                        {txn.txnDescription}
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
