'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, updateDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { formatDateDMY } from '@/lib/utils';
import { Loader2, CheckCircle, Lightbulb, Trash2, Filter, Calendar, User, Award, Check } from 'lucide-react';
import LogoLoader from "@/components/ui/LogoLoader";
import { awardStaffPoint } from '@/app/hq/actions/points';
import { toast } from 'react-hot-toast';

export default function ManagerGrowthIdeasPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  
  const [ideas, setIdeas] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD
  
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || (session.role !== 'manager' && session.role !== 'superadmin')) {
      router.push('/hq/login');
      return;
    }
  }, [session, sessionLoading, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch ideas from Firestore
      const ideasSnap = await getDocs(
        query(collection(db, 'rehab_growth_ideas'), orderBy('createdAt', 'desc'))
      );
      
      const ideasData = ideasSnap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setIdeas(ideasData);

      // Fetch Rehab staff list to populate filter dropdown
      const staffSnap = await getDocs(collection(db, 'rehab_users'));
      const staffData = staffSnap.docs
        .map(docSnap => ({
          id: docSnap.id,
          name: docSnap.data().name || 'Unknown Staff',
          role: docSnap.data().role || 'staff'
        }))
        .filter(s => s.role === 'staff' || s.role.includes('staff') || s.role.includes('contract') || s.role.includes('internee'));
      
      // Sort staff by name
      staffData.sort((a, b) => a.name.localeCompare(b.name));
      setStaffList(staffData);

    } catch (err) {
      console.error('Error fetching growth ideas:', err);
      toast.error('Failed to load growth ideas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    fetchData();
  }, [session]);

  const handleMarkReviewed = async (ideaId: string) => {
    setActionLoading(ideaId);
    try {
      await updateDoc(doc(db, 'rehab_growth_ideas', ideaId), {
        status: 'reviewed'
      });
      setIdeas(prev =>
        prev.map(idea => (idea.id === ideaId ? { ...idea, status: 'reviewed' } : idea))
      );
      toast.success('Idea marked as reviewed');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update status: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAwardPoint = async (idea: any) => {
    setActionLoading(idea.id);
    try {
      // 1. Award Growth Point using Server Action
      const res = await awardStaffPoint(idea.staffId, idea.department || 'rehab', 'contribution', idea.date);
      
      if (!res.success) {
        throw new Error(res.error || 'Server action failed');
      }

      // 2. Update status of the idea in Firestore
      await updateDoc(doc(db, 'rehab_growth_ideas', idea.id), {
        status: 'approved',
        points: 1,
        approvedBy: session?.customId || 'Manager',
        approvedAt: new Date().toISOString()
      });

      setIdeas(prev =>
        prev.map(item => (item.id === idea.id ? { ...item, status: 'approved', points: 1 } : item))
      );

      if (res.alreadyAwarded) {
        toast.success('Idea approved (point was already awarded for today)');
      } else {
        toast.success('Idea approved & +1 point awarded successfully!');
      }

    } catch (err: any) {
      console.error(err);
      toast.error('Failed to award point: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Filter ideas
  const filteredIdeas = ideas.filter(idea => {
    const matchStaff = selectedStaffId === 'all' || idea.staffId === selectedStaffId;
    const matchStatus = selectedStatus === 'all' || idea.status === selectedStatus;
    const matchDate = !selectedDate || idea.date === selectedDate;
    return matchStaff && matchStatus && matchDate;
  });

  // Group ideas day-wise for day-wise view
  const groupedIdeas = filteredIdeas.reduce((groups: any, idea) => {
    const date = idea.date || 'Unknown Date';
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(idea);
    return groups;
  }, {});

  // Sort dates descending
  const sortedDates = Object.keys(groupedIdeas).sort((a, b) => b.localeCompare(a));

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <LogoLoader />
      </div>
    );
  }

  // Summary Metrics
  const totalCount = filteredIdeas.length;
  const pendingCount = filteredIdeas.filter(i => i.status === 'pending').length;
  const reviewedCount = filteredIdeas.filter(i => i.status === 'reviewed').length;
  const approvedCount = filteredIdeas.filter(i => i.status === 'approved').length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <Lightbulb size={20} className="text-amber-500 fill-amber-100 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider">Growth ideas registry</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">Staff Suggestions & Ideas</h1>
            <p className="text-gray-500 text-sm font-semibold">Review creative submissions and suggestions from Rehab team members</p>
          </div>
          <button 
            onClick={fetchData} 
            className="px-4 py-2 border-2 border-indigo-600 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-50 transition-all cursor-pointer"
          >
            Refresh List
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Submissions</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{totalCount}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-yellow-500">Pending Review</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{pendingCount}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-500">Reviewed</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{reviewedCount}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500">Approved (Points)</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{approvedCount}</p>
          </div>
        </div>

        {/* Filter Panel */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-gray-700">
            <Filter size={16} />
            <h2 className="text-sm font-bold uppercase tracking-wider">Filters & Controls</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Staff Filter */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Select Staff</label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Staff Members</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Filter by Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="approved">Approved</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

          </div>
        </div>

        {/* Suggestions List */}
        <div className="space-y-8">
          {sortedDates.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm text-center">
              <Lightbulb size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 font-bold uppercase tracking-wider text-xs">No ideas or suggestions found</p>
              <p className="text-gray-500 text-xs mt-1">Try resetting the filters or check back later.</p>
            </div>
          ) : (
            sortedDates.map(dateStr => {
              const dayIdeas = groupedIdeas[dateStr];
              return (
                <div key={dateStr} className="space-y-3">
                  {/* Day Header */}
                  <div className="flex items-center gap-2 px-2">
                    <Calendar size={14} className="text-slate-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                      {formatDateDMY(new Date(dateStr + 'T00:00:00'))}
                    </h3>
                    <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                      {dayIdeas.length} {dayIdeas.length === 1 ? 'idea' : 'ideas'}
                    </span>
                  </div>

                  {/* Ideas Cards inside the Day */}
                  <div className="grid gap-4">
                    {dayIdeas.map((idea: any) => {
                      const isPending = idea.status === 'pending';
                      const isReviewed = idea.status === 'reviewed';
                      const isApproved = idea.status === 'approved';

                      return (
                        <div 
                          key={idea.id} 
                          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between gap-6 hover:shadow-md transition-shadow"
                        >
                          <div className="flex-1 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="flex items-center gap-1.5 text-xs font-bold text-gray-800 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-xl">
                                <User size={12} className="text-indigo-500" />
                                {idea.staffName}
                              </span>
                              
                              {/* Status Badges */}
                              {isPending && (
                                <span className="text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">
                                  Pending Review
                                </span>
                              )}
                              {isReviewed && (
                                <span className="text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">
                                  Reviewed
                                </span>
                              )}
                              {isApproved && (
                                <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Award size={10} /> Approved (+1 Point)
                                </span>
                              )}
                            </div>

                            <p className="text-gray-800 text-sm font-semibold leading-relaxed whitespace-pre-wrap">
                              {idea.text}
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-row md:flex-col justify-end items-end gap-2 md:w-48 self-end md:self-center">
                            {isPending && (
                              <button
                                onClick={() => handleMarkReviewed(idea.id)}
                                disabled={actionLoading !== null}
                                className="flex-1 md:w-full py-2.5 rounded-xl border border-gray-200 hover:border-gray-900 text-gray-700 hover:text-gray-900 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                              >
                                {actionLoading === idea.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                Mark Reviewed
                              </button>
                            )}

                            {(isPending || isReviewed) && (
                              <button
                                onClick={() => handleAwardPoint(idea)}
                                disabled={actionLoading !== null}
                                className="flex-1 md:w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-indigo-100 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                              >
                                {actionLoading === idea.id ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Award size={12} />
                                )}
                                Award Growth Point
                              </button>
                            )}

                            {isApproved && (
                              <div className="text-[10px] font-bold text-gray-400 italic text-right w-full">
                                Approved by {idea.approvedBy || 'Manager'}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
