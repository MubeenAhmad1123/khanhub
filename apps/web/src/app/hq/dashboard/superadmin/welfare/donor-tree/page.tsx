// src/app/hq/dashboard/superadmin/welfare/donor-tree/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Donor, Transaction } from '@/types/welfare';
import { formatDateDMY } from '@/lib/utils';
import { 
  GitFork, Search, Heart, Loader2, ArrowRight, ArrowLeft, 
  ChevronDown, ChevronRight, Award, DollarSign, Users, X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { LogoLoader } from '@/components/ui';
import { useHqSession } from '@/hooks/hq/useHqSession';

export default function SuperAdminWelfareDonorTreePage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [donors, setDonors] = useState<Donor[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Search & Navigation
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') {
      router.push('/hq/login');
      return;
    }
    fetchInitialData();
  }, [sessionLoading, session, router]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch active donors (index-safe, sort client-side)
      const qDonors = query(collection(db, 'welfare_donors'), where('isActive', '==', true));
      const snapDonors = await getDocs(qDonors);
      const donorsData = snapDonors.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Donor[];
      donorsData.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
      setDonors(donorsData);

      // 2. Fetch approved income transactions for donations
      const qTx = query(
        collection(db, 'welfare_transactions'),
        where('type', '==', 'income'),
        where('status', '==', 'approved')
      );
      const snapTx = await getDocs(qTx);
      const txData = snapTx.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(txData);

    } catch (err) {
      console.error('Error loading donor tree data:', err);
      toast.error('Failed to load donor tree data');
    } finally {
      setLoading(false);
    }
  };

  // 1. Build a map of donorId -> total self donations
  const donationsMap = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach(tx => {
      if (tx.donorId) {
        const amt = Number(tx.amount) || 0;
        map.set(tx.donorId, (map.get(tx.donorId) || 0) + amt);
      }
    });
    return map;
  }, [transactions]);

  // 2. Build adjacency list of referrerId -> list of referred Donors
  const referralAdjacency = useMemo(() => {
    const adj = new Map<string, Donor[]>();
    donors.forEach(d => {
      const refId = d.referringMemberId;
      if (refId) {
        if (!adj.has(refId)) adj.set(refId, []);
        adj.get(refId)!.push(d);
      }
    });
    return adj;
  }, [donors]);

  // 3. Find root donors (not referred by any active donor in our system)
  const rootDonors = useMemo(() => {
    const donorIds = new Set(donors.map(d => d.id));
    return donors.filter(d => !d.referringMemberId || !donorIds.has(d.referringMemberId));
  }, [donors]);

  // 4. Precompute referred network stats recursively (total amount, count of referrals)
  const networkStats = useMemo(() => {
    const stats = new Map<string, { amount: number; count: number }>();

    const calculate = (id: string): { amount: number; count: number } => {
      if (stats.has(id)) return stats.get(id)!;
      
      const children = referralAdjacency.get(id) || [];
      let totalAmount = 0;
      let totalCount = children.length;

      children.forEach(child => {
        // Child's own donations
        totalAmount += donationsMap.get(child.id) || 0;
        
        // Child's sub-referral stats recursively
        const childSub = calculate(child.id);
        totalAmount += childSub.amount;
        totalCount += childSub.count;
      });

      const res = { amount: totalAmount, count: totalCount };
      stats.set(id, res);
      return res;
    };

    donors.forEach(d => calculate(d.id));
    return stats;
  }, [donors, donationsMap, referralAdjacency]);

  // 5. Global tree analytics
  const globalAnalytics = useMemo(() => {
    let totalReferredIncome = 0;
    let totalReferredDonors = 0;
    let topReferrer: Donor | null = null;
    let maxReferrals = 0;

    donors.forEach(d => {
      const stats = networkStats.get(d.id);
      if (stats) {
        if (d.referringMemberId) {
          totalReferredDonors++;
        }
        const directCount = referralAdjacency.get(d.id)?.length || 0;
        if (directCount > maxReferrals) {
          maxReferrals = directCount;
          topReferrer = d;
        }
      }
    });

    transactions.forEach(tx => {
      if (tx.donorId) {
        const d = donors.find(dnr => dnr.id === tx.donorId);
        if (d?.referringMemberId) {
          totalReferredIncome += Number(tx.amount) || 0;
        }
      }
    });

    return {
      totalReferredIncome,
      totalReferredDonors,
      topReferrer: topReferrer as any,
      topReferrerCount: maxReferrals
    };
  }, [donors, transactions, networkStats, referralAdjacency]);

  // Expand or collapse node
  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to expand all parents of a node if it matches search
  useEffect(() => {
    if (!searchQuery) return;
    const queryLower = searchQuery.toLowerCase();
    const newExpanded = { ...expandedNodes };
    let changed = false;

    const expandParents = (donor: Donor) => {
      let current = donor;
      while (current.referringMemberId) {
        const parent = donors.find(d => d.id === current.referringMemberId);
        if (parent) {
          if (!newExpanded[parent.id]) {
            newExpanded[parent.id] = true;
            changed = true;
          }
          current = parent;
        } else {
          break;
        }
      }
    };

    donors.forEach(d => {
      if (d.fullName.toLowerCase().includes(queryLower) || d.donorNumber.toLowerCase().includes(queryLower)) {
        expandParents(d);
      }
    });

    if (changed) {
      setExpandedNodes(newExpanded);
    }
  }, [searchQuery, donors]);

  // Recursive Tree Node Renderer
  const renderTreeNode = (donor: Donor, depth = 0) => {
    const children = referralAdjacency.get(donor.id) || [];
    const hasChildren = children.length > 0;
    const isExpanded = !!expandedNodes[donor.id];
    const selfDonations = donationsMap.get(donor.id) || 0;
    const subStats = networkStats.get(donor.id) || { amount: 0, count: 0 };
    
    const matchesSearch = searchQuery ? (
      donor.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      donor.donorNumber.toLowerCase().includes(searchQuery.toLowerCase())
    ) : false;

    return (
      <div key={donor.id} className="relative select-text">
        {/* Node box */}
        <div className="flex items-start gap-3 my-2 pl-2">
          {depth > 0 && (
            <div className="absolute left-[-16px] top-0 bottom-0 w-[2px] bg-gray-200">
              <div className="absolute top-[22px] left-0 w-4 h-[2px] bg-gray-200" />
            </div>
          )}

          {/* Toggle Expand Arrow */}
          <div className="w-6 h-6 flex items-center justify-center shrink-0 mt-2">
            {hasChildren ? (
              <button 
                onClick={() => toggleNode(donor.id)} 
                className="p-1 rounded bg-gray-50 text-gray-500 hover:bg-teal-50 hover:text-teal-600 transition-colors"
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            )}
          </div>

          {/* Donor Card */}
          <div className={`p-4 rounded-2xl border transition-all duration-200 flex-1 md:flex-initial md:min-w-[320px] ${
            matchesSearch 
              ? 'border-amber-400 bg-amber-50 shadow-md ring-2 ring-amber-200' 
              : 'border-gray-100 bg-white hover:border-teal-200 hover:shadow-sm'
          }`}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 bg-teal-50 text-teal-600 text-xs font-black rounded-lg flex items-center justify-center">
                  {donor.fullName.charAt(0).toUpperCase()}
                </span>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{donor.fullName}</h4>
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    {donor.donorNumber}
                  </span>
                </div>
              </div>
              <Link 
                href={`/departments/welfare/dashboard/admin/donors/${donor.id}`}
                className="p-1 rounded-full text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                title="View Profile"
              >
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* Donation stats for this node */}
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-50 text-left">
              <div>
                <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Self Donation</span>
                <span className="text-xs font-black text-gray-800 mt-1 block">Rs {selfDonations.toLocaleString()}</span>
              </div>
              <div>
                <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Network Raised</span>
                <span className="text-xs font-black text-teal-600 mt-1 block">
                  Rs {subStats.amount.toLocaleString()} 
                  {subStats.count > 0 && <span className="text-[9px] font-bold text-gray-400"> ({subStats.count} refs)</span>}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Child nodes */}
        {hasChildren && isExpanded && (
          <div className="pl-9 ml-3 border-l-2 border-dashed border-gray-100 relative">
            {children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LogoLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-3">
            <GitFork className="text-teal-600 rotate-180" size={32} />
            Welfare Donor Referral Tree
          </h1>
          <p className="text-gray-500 font-medium mt-1">Super Admin Console — Monitor advocate networks and referral-driven donation stats.</p>
        </div>
        <Link 
          href="/hq/dashboard/superadmin"
          className="flex items-center gap-2 px-5 py-3 border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 rounded-xl text-sm font-black transition-all shadow-sm"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </div>

      {/* Analytics scorecard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Referral Network Count</span>
            <span className="text-3xl font-black text-gray-900">{globalAnalytics.totalReferredDonors}</span>
            <p className="text-xs text-gray-500 mt-1.5 font-medium">Referred sponsors active in database</p>
          </div>
          <div className="bg-teal-50 p-4 rounded-2xl text-teal-600">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Total Referred Donations</span>
            <span className="text-3xl font-black text-teal-600">Rs {globalAnalytics.totalReferredIncome.toLocaleString()}</span>
            <p className="text-xs text-gray-500 mt-1.5 font-medium">Total funds received via advocates</p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Top Advocate</span>
            {globalAnalytics.topReferrer ? (
              <>
                <span className="text-lg font-black text-gray-900 block truncate max-w-[200px] mt-1">{globalAnalytics.topReferrer.fullName}</span>
                <p className="text-xs text-teal-600 mt-1 font-black uppercase tracking-widest">{globalAnalytics.topReferrerCount} Direct Referrals</p>
              </>
            ) : (
              <span className="text-gray-400 italic">No advocates linked yet</span>
            )}
          </div>
          <div className="bg-amber-50 p-4 rounded-2xl text-amber-600">
            <Award size={24} />
          </div>
        </div>
      </div>

      {/* Control panel: Search */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search tree by donor name or registration ID..."
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
        <div className="flex gap-2 w-full md:w-auto shrink-0">
          <button 
            onClick={() => {
              const allExpanded: Record<string, boolean> = {};
              donors.forEach(d => { allExpanded[d.id] = true; });
              setExpandedNodes(allExpanded);
            }} 
            className="flex-1 md:flex-none px-4 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-black uppercase tracking-widest transition-all text-center cursor-pointer"
          >
            Expand All
          </button>
          <button 
            onClick={() => setExpandedNodes({})} 
            className="flex-1 md:flex-none px-4 py-2.5 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-black uppercase tracking-widest transition-all text-center cursor-pointer"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Tree Visualization Workspace */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-10 overflow-x-auto min-h-[500px]">
        {rootDonors.length === 0 ? (
          <div className="py-20 text-center max-w-sm mx-auto">
            <GitFork className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-gray-900 font-bold text-lg mb-1">Empty Registry</h3>
            <p className="text-gray-500 text-sm">Add donor profiles and link their referring advocates to see the tree render.</p>
          </div>
        ) : (
          <div className="inline-block min-w-full pb-10">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Referral Networks Structure</h3>
            <div className="space-y-6">
              {rootDonors.map(root => renderTreeNode(root))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
