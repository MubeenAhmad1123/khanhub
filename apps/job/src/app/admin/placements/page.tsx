'use client';

import { useState } from 'react';
import { DollarSign, Clock, CheckCircle, XCircle, Search, Filter, Loader2, ArrowLeft, Users, Building2, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { useAdmin } from '@/hooks/useAdmin';
import { updatePlacement } from '@/lib/firebase/firestore';
import { Button } from '@/components/ui/button';
import { CommissionStatus } from '@/types/admin';

export default function AdminPlacementsPage() {
    const { placements, loading, refresh } = useAdmin();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<CommissionStatus | 'all'>('all');
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const filteredPlacements = placements.filter(placement => {
        const matchesSearch =
            placement.jobSeekerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            placement.employerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            placement.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || placement.commissionStatus === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const handleUpdateStatus = async (placementId: string, newStatus: CommissionStatus) => {
        setUpdatingId(placementId);
        try {
            await updatePlacement(placementId, {
                commissionStatus: newStatus,
                commissionPaidAt: newStatus === 'collected' ? new Date() : null,
                updatedAt: new Date(),
            });
            await refresh();
        } catch (err) {
            console.error('Error updating placement status:', err);
            alert('Failed to update status');
        } finally {
            setUpdatingId(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-jobs-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-jobs-neutral p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/admin/dashboard" className="p-3 bg-white rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors">
                        <ArrowLeft className="h-6 w-6 text-jobs-dark" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-jobs-dark">Placements & Commissions</h1>
                        <p className="text-jobs-dark/60">Track successful hires and placement fees</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="relative md:col-span-2">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by candidate, employer, or job..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 shadow-sm"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="py-4 px-6 bg-white border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 shadow-sm font-bold text-jobs-dark"
                    >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending Commission</option>
                        <option value="collected">Commission Collected</option>
                        <option value="failed">Collection Failed</option>
                    </select>
                </div>

                {/* Placements List */}
                {filteredPlacements.length === 0 ? (
                    <div className="bg-white rounded-3xl p-16 text-center shadow-lg border border-gray-100">
                        <Users className="h-20 w-20 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-jobs-dark">No placements found</h3>
                        <p className="text-jobs-dark/60">No matched jobs with this criteria yet.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-jobs-neutral/50 border-b border-gray-100">
                                        <th className="px-8 py-5 text-sm font-black text-jobs-dark uppercase tracking-wider">Candidate / Job</th>
                                        <th className="px-8 py-5 text-sm font-black text-jobs-dark uppercase tracking-wider">Employer</th>
                                        <th className="px-8 py-5 text-sm font-black text-jobs-dark uppercase tracking-wider">Financials</th>
                                        <th className="px-8 py-5 text-sm font-black text-jobs-dark uppercase tracking-wider">Status</th>
                                        <th className="px-8 py-5 text-sm font-black text-jobs-dark uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredPlacements.map((placement) => (
                                        <tr key={placement.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="font-black text-jobs-dark">{placement.jobSeekerName}</div>
                                                <div className="text-xs text-jobs-dark/60 flex items-center gap-1 mt-1">
                                                    <Briefcase className="h-3 w-3" /> {placement.jobTitle}
                                                </div>
                                                <div className="text-[10px] text-gray-400 mt-0.5">
                                                    Hired: {new Date(placement.hiredAt).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="font-bold text-jobs-dark">{placement.employerName}</div>
                                                <div className="text-[10px] text-gray-400 mt-1">ID: {placement.employerId.slice(0, 8)}</div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="text-sm font-bold text-jobs-dark">
                                                    Salary: Rs. {placement.firstMonthSalary.toLocaleString()}
                                                </div>
                                                <div className="text-base font-black text-jobs-primary mt-0.5">
                                                    Fee: Rs. {placement.commissionAmount.toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                {placement.commissionStatus === 'pending' && (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-black uppercase tracking-tighter">
                                                        <Clock className="h-3 w-3" /> Pending
                                                    </span>
                                                )}
                                                {placement.commissionStatus === 'collected' && (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-xs font-black uppercase tracking-tighter">
                                                        <CheckCircle className="h-3 w-3" /> Collected
                                                    </span>
                                                )}
                                                {placement.commissionStatus === 'failed' && (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-800 rounded-full text-xs font-black uppercase tracking-tighter">
                                                        <XCircle className="h-3 w-3" /> Failed
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex gap-2">
                                                    {placement.commissionStatus !== 'collected' && (
                                                        <Button
                                                            size="sm"
                                                            variant="primary"
                                                            onClick={() => handleUpdateStatus(placement.id, 'collected')}
                                                            isLoading={updatingId === placement.id}
                                                            leftIcon={<DollarSign className="h-3.5 w-3.5" />}
                                                        >
                                                            Collect
                                                        </Button>
                                                    )}
                                                    {placement.commissionStatus === 'pending' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-red-500 text-red-500 hover:bg-red-50"
                                                            onClick={() => handleUpdateStatus(placement.id, 'failed')}
                                                            disabled={updatingId === placement.id}
                                                        >
                                                            Mark Failed
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
