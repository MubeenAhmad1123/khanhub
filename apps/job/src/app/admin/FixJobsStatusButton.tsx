'use client';

import { useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { Wrench, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * ONE-CLICK FIX for Jobs Without Status Field
 * 
 * Add this component to your admin dashboard temporarily
 * to fix all existing jobs that don't have a status field.
 * 
 * Usage:
 * 1. Import this component in your admin page
 * 2. Add <FixJobsStatusButton /> somewhere visible
 * 3. Click the button
 * 4. All jobs will get status: 'pending'
 * 5. Remove this component after running once
 */

export default function FixJobsStatusButton() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{
        total: number;
        fixed: number;
        already: number;
        errors: number;
    } | null>(null);

    const fixJobs = async () => {
        if (!confirm('This will add status field to all jobs without one. Continue?')) {
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            console.log('🔧 Starting job status fix...');

            const jobsRef = collection(db, 'jobs');
            const snapshot = await getDocs(jobsRef);

            let fixed = 0;
            let alreadyHaveStatus = 0;
            let errors = 0;

            for (const jobDoc of snapshot.docs) {
                const data = jobDoc.data();

                try {
                    // If job doesn't have status field, add it
                    if (!data.status) {
                        // Set status to 'active' so they appear in search immediately
                        await updateDoc(doc(db, 'jobs', jobDoc.id), {
                            status: 'active',
                        });
                        console.log(`✅ Fixed: ${data.title} from ${data.company}`);
                        fixed++;
                    } else if (data.status === 'pending') {
                        // Also update pending jobs to active if requested
                        await updateDoc(doc(db, 'jobs', jobDoc.id), {
                            status: 'active',
                        });
                        console.log(`✅ Updated pending to active: ${data.title}`);
                        fixed++;
                    } else {
                        console.log(`ℹ️ Already has status: ${data.title} (${data.status})`);
                        alreadyHaveStatus++;
                    }
                } catch (error) {
                    console.error(`❌ Error fixing ${data.title}:`, error);
                    errors++;
                }
            }

            const results = {
                total: snapshot.size,
                fixed,
                already: alreadyHaveStatus,
                errors,
            };

            setResult(results);
            console.log('🎉 Fix complete!', results);

            alert(
                `✅ Fix Complete!\n\n` +
                `Total jobs: ${results.total}\n` +
                `Fixed: ${results.fixed}\n` +
                `Already had status: ${results.already}\n` +
                `Errors: ${results.errors}\n\n` +
                `You can now see pending jobs in the approval page!`
            );

        } catch (error) {
            console.error('❌ Error:', error);
            alert('Failed to fix jobs. Check console for details.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                        <Wrench className="w-6 h-6 text-white" />
                    </div>
                </div>

                <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                        Fix Jobs Without Status Field
                    </h3>
                    <p className="text-sm text-gray-700 mb-4">
                        Some jobs in your database are missing the <code className="bg-orange-100 px-2 py-1 rounded">status</code> field.
                        This prevents them from appearing in the approval system. Click the button below to automatically
                        add <code className="bg-orange-100 px-2 py-1 rounded">status: 'pending'</code> to all jobs that need it.
                    </p>

                    {result && (
                        <div className="bg-white rounded-lg p-4 mb-4 border border-orange-200">
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                Results:
                            </h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-gray-600">Total jobs:</span>
                                    <p className="font-bold text-gray-900">{result.total}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">Fixed:</span>
                                    <p className="font-bold text-green-600">{result.fixed}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">Already OK:</span>
                                    <p className="font-bold text-blue-600">{result.already}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">Errors:</span>
                                    <p className="font-bold text-red-600">{result.errors}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={fixJobs}
                        disabled={loading}
                        className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all font-semibold flex items-center gap-2 shadow-lg"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Fixing Jobs...
                            </>
                        ) : (
                            <>
                                <Wrench className="w-5 h-5" />
                                Fix All Jobs Now
                            </>
                        )}
                    </button>

                    <p className="text-xs text-gray-500 mt-3">
                        ⚠️ <strong>Note:</strong> You only need to run this once. After fixing, you can remove this component from your admin page.
                    </p>
                </div>
            </div>
        </div>
    );
}

/**
 * HOW TO USE:
 * 
 * 1. Copy this file to: src/components/admin/FixJobsStatusButton.tsx
 * 
 * 2. Add to your admin dashboard page:
 * 
 * import FixJobsStatusButton from '@/components/admin/FixJobsStatusButton';
 * 
 * export default function AdminDashboard() {
 *   return (
 *     <div>
 *       <h1>Admin Dashboard</h1>
 *       
 *       {/* Add this temporarily *\/}
 *       <FixJobsStatusButton />
 *       
 *       {/* Rest of your dashboard *\/}
 *     </div>
 *   );
 * }
 * 
 * 3. Go to admin dashboard and click the button
 * 4. Wait for it to complete
 * 5. Check job approval page - all jobs should appear!
 * 6. Remove this component after successful fix
 */