'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/firebase-config';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast';
import { writeActivityLog } from '@/hooks/useActivityLog';
import {
    Handshake,
    Search,
    Filter,
    DollarSign,
    CheckCircle,
    Clock,
    XCircle,
    ArrowRight,
    Loader2,
    Building2,
    Briefcase,
    Calendar,
    Users
} from 'lucide-react';
import { toDate } from '@/lib/firebase/firestore';

export default function AdminPlacementsPage() {
    const { user: adminUser } = useAuth();
    const { toast } = useToast();
    const [placements, setPlacements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        // Placements are essentially confirmed connections
        const q = query(collection(db, 'placements'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort by hiredAt or createdAt desc
            list.sort((a: any, b: any) => {
                const timeA = a.hiredAt?.seconds || a.createdAt?.seconds || 0;
                const timeB = b.hiredAt?.seconds || b.createdAt?.seconds || 0;
                return timeB - timeA;
            });
            setPlacements(list);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleUpdateStatus = async (placementId: string, newStatus: string) => {
        const placement = placements.find(p => p.id === placementId);
        if (!placement) return;

        try {
            await updateDoc(doc(db, 'placements', placementId), {
                commissionStatus: newStatus,
                commissionPaidAt: newStatus === 'collected' ? serverTimestamp() : null,
                updatedAt: serverTimestamp(),
            });

            await writeActivityLog({
                admin_id: adminUser?.uid || 'system',
                action_type: 'placement_confirmed',
                target_id: placementId,
                target_type: 'placement',
                note: `Updated placement status to ${newStatus} for candidate: ${placement.candidateName}`
            });

            toast(`Status updated to ${newStatus}`, 'success');
        } catch (err) {
            toast('Failed to update status', 'error');
        }
    };

    const filteredPlacements = placements.filter(p => {
        const matchesSearch = (p.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === 'all' || p.commissionStatus === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border border-slate-100 italic font-bold">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                LOADING SUCCESSFUL PLACEMENTS...
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 italic uppercase tracking-tighter">
                    <Handshake className="w-8 h-8 text-blue-600" />
                    Placements & Commissions
                </h1>
                <p className="text-slate-500 font-bold">Track successful hires and collect commission fees</p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="bg-blue-500 p-2 rounded-lg text-white">
                            <Users className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Hires</p>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{placements.length}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="bg-teal-500 p-2 rounded-lg text-white">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">GMD (Gross Commission)</p>
                    </div>
                    <p className="text-2xl font-black text-slate-900">
                        Rs. {placements.filter(p => p.commissionStatus === 'collected').reduce((sum, p) => sum + (p.commissionAmount || 0), 0).toLocaleString()}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="bg-orange-500 p-2 rounded-lg text-white">
                            <Clock className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Pending Collect</p>
                    </div>
                    <p className="text-2xl font-black text-slate-900">
                        Rs. {placements.filter(p => p.commissionStatus === 'pending').reduce((sum, p) => sum + (p.commissionAmount || 0), 0).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                <div className="relative md:col-span-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by candidate, company, or job title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700"
                >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending Collection</option>
                    <option value="collected">Collected</option>
                    <option value="failed">Failed</option>
                </select>
            </div>

            {/* Placements List */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidate / Job</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employer</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Financials</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredPlacements.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{p.candidateName}</p>
                                            <div className="flex items-center gap-1.5 mt-1 text-slate-400">
                                                <Briefcase className="w-3 h-3" />
                                                <span className="text-xs font-medium">{p.jobTitle}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-0.5 text-slate-300">
                                                <Calendar className="w-3 h-3" />
                                                <span className="text-[10px] font-bold uppercase tracking-tight">Hired: {p.hiredAt ? toDate(p.hiredAt).toLocaleDateString() : 'N/A'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                                <Building2 className="w-4 h-4" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-700">{p.companyName}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Commission Due</p>
                                            <p className="text-lg font-black text-blue-600 leading-tight">Rs. {p.commissionAmount?.toLocaleString()}</p>
                                            <p className="text-[10px] font-bold text-slate-400 mt-0.5 italic">From Rs. {p.firstMonthSalary?.toLocaleString()} salary</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight inline-flex items-center gap-1.5 ${p.commissionStatus === 'collected' ? 'bg-green-50 text-green-700' :
                                            p.commissionStatus === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                                                'bg-red-50 text-red-700'
                                            }`}>
                                            <span className={`w-1 h-1 rounded-full ${p.commissionStatus === 'collected' ? 'bg-green-600' :
                                                p.commissionStatus === 'pending' ? 'bg-yellow-600' :
                                                    'bg-red-600'
                                                }`} />
                                            {p.commissionStatus || 'Pending'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {p.commissionStatus !== 'collected' && (
                                                <button
                                                    onClick={() => handleUpdateStatus(p.id, 'collected')}
                                                    className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2"
                                                >
                                                    <DollarSign className="w-3 h-3" /> COLLECT
                                                </button>
                                            )}
                                            {p.commissionStatus === 'pending' && (
                                                <button
                                                    onClick={() => handleUpdateStatus(p.id, 'failed')}
                                                    className="px-4 py-2 bg-white border border-red-200 text-red-600 text-[10px] font-black rounded-xl hover:bg-red-50 transition-all"
                                                >
                                                    FAILED
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Empty State */}
                {filteredPlacements.length === 0 && (
                    <div className="p-20 text-center text-slate-400">
                        <Handshake className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <h3 className="text-xl font-bold">No placements found</h3>
                        <p>No connections have been marked as successful hires yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
