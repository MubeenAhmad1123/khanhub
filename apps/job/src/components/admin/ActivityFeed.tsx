'use client';

import { useActivityLog, getActionIcon } from '@/hooks/useActivityLog';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Activity } from 'lucide-react';
import { toDate } from '@/lib/firebase/firestore';

export default function ActivityFeed() {
    const { entries, loading } = useActivityLog(20);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="text-center py-12 text-slate-400">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No recent activity found.</p>
            </div>
        );
    }

    return (
        <div className="flow-root">
            <ul role="list" className="-mb-8">
                {entries.map((entry, idx) => {
                    const timeAgo = entry.created_at
                        ? formatDistanceToNow(toDate(entry.created_at), { addSuffix: true })
                        : 'Just now';

                    return (
                        <li key={entry.id}>
                            <div className="relative pb-8">
                                {idx !== entries.length - 1 ? (
                                    <span
                                        className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-slate-200"
                                        aria-hidden="true"
                                    />
                                ) : null}
                                <div className="relative flex items-start space-x-3">
                                    <div className="relative">
                                        <div className="flex bg-white h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-lg shadow-sm">
                                            {getActionIcon(entry.action_type)}
                                        </div>
                                    </div>
                                    <div className="min-w-0 flex-1 py-1.5">
                                        <div className="text-sm text-slate-500">
                                            <span className="font-bold text-slate-900">{entry.note}</span>
                                        </div>
                                        <div className="mt-1 text-xs text-slate-400">
                                            {timeAgo}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
