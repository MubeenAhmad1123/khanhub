'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Building2, ArrowLeft, Edit, Mail, Phone, Globe, Save, X, Briefcase } from 'lucide-react';
import { Spinner } from '@/components/ui';
import { toast } from 'react-hot-toast';

export default function ITClientDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);

  useEffect(() => {
    fetchClient();
  }, [id]);

  const fetchClient = async () => {
    try {
      setLoading(true);
      const snap = await getDoc(doc(db, 'it_clients', id as string));
      if (snap.exists()) {
        setClient({ id: snap.id, ...snap.data() });
      } else {
        router.push('/departments/it/dashboard/admin/clients');
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]"><Spinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-[#FDFCFB] p-4 md:p-8 w-full">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="flex items-center gap-6 border-b border-black/5 pb-10">
          <button onClick={() => router.back()} className="w-12 h-12 rounded-2xl bg-white border border-black/5 flex items-center justify-center text-gray-400 hover:text-black transition-all shadow-sm">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-black tracking-tighter uppercase">{client.companyName}</h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Client ID: {client.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-[3rem] p-10 border border-black/5 shadow-sm space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600"><Briefcase size={20} /></div>
              <h2 className="text-lg font-black text-black uppercase">Engagement Profile</h2>
            </div>
            <div className="space-y-4">
               <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Primary Contact</p><p className="text-lg font-black text-black">{client.contactPerson}</p></div>
               <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Address</p><p className="text-lg font-black text-black">{client.email}</p></div>
               <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</p><p className="text-lg font-black text-black">{client.phone}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-[3rem] p-10 border border-black/5 shadow-sm space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600"><Globe size={20} /></div>
              <h2 className="text-lg font-black text-black uppercase">Account Status</h2>
            </div>
            <div className="flex items-center justify-between">
               <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                 {client.status}
               </span>
               <p className="text-sm font-black text-black">{client.activeProjects || 0} Active Projects</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
