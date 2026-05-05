'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { Loader2, Plus, Tag, ToggleLeft, ToggleRight } from 'lucide-react';

interface Category {
  id: string;
  code: string;
  label: string;
  type: 'income' | 'expense' | 'both';
  departmentScope: 'rehab' | 'spims' | 'all';
  requiresProof: boolean;
  requiresEntityLink: boolean;
  isActive: boolean;
  createdAt: string;
}

export default function CategoryManagementPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    label: '', type: 'income' as 'income' | 'expense' | 'both',
    departmentScope: 'all' as 'rehab' | 'spims' | 'all',
    requiresProof: false, requiresEntityLink: false,
  });

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') router.push('/hq/login');
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    getDocs(collection(db, 'hq_cashier_categories')).then((snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
      data.sort((a, b) => a.label.localeCompare(b.label));
      setCategories(data);
      setLoading(false);
    });
  }, [session]);

  const handleAdd = async () => {
    if (!form.label.trim()) return;
    setSaving(true);
    const code = form.label.trim().toLowerCase().replace(/\s+/g, '_');
    const newDoc = await addDoc(collection(db, 'hq_cashier_categories'), {
      code,
      label: form.label.trim(),
      type: form.type,
      departmentScope: form.departmentScope,
      requiresProof: form.requiresProof,
      requiresEntityLink: form.requiresEntityLink,
      isActive: true,
      createdBy: session!.customId,
      createdAt: new Date().toISOString(),
    });
    setCategories(prev => [...prev, { id: newDoc.id, code, ...form, isActive: true, createdAt: new Date().toISOString() }]);
    setForm({ label: '', type: 'income', departmentScope: 'all', requiresProof: false, requiresEntityLink: false });
    setShowForm(false);
    setSaving(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await updateDoc(doc(db, 'hq_cashier_categories', id), { isActive: !current });
    setCategories(prev => prev.map(c => c.id === id ? { ...c, isActive: !current } : c));
  };

  if (sessionLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black font-black uppercase tracking-widest text-xs"><Loader2 className="animate-spin text-black dark:text-white mr-3" size={24} /> Syncing Categories...</div>;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-300 p-4 md:p-12">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="flex items-center justify-between border-b border-black dark:border-white pb-8">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter">Category Hub</h1>
            <p className="text-black dark:text-black text-[10px] font-black uppercase tracking-[0.3em] mt-2 italic">Global Transaction Taxonomy • System Registry</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="bg-black dark:bg-white text-white dark:text-black font-black text-[10px] uppercase tracking-[0.2em] px-10 py-5 rounded-[2rem] transition-all flex items-center gap-3 shadow-2xl active:scale-95 hover:scale-105">
            <Plus size={18} /> Orchestrate
          </button>
        </div>

        {showForm && (
          <div className="animate-in slide-in-from-top-4 duration-500 bg-gray-50 dark:bg-white/5 border border-black dark:border-white p-10 rounded-[2.5rem] space-y-8 shadow-2xl">
            <h3 className="text-black dark:text-white font-black text-xs uppercase tracking-[0.2em] italic underline decoration-2 underline-offset-8">New Classification Sequence</h3>
            <div className="space-y-6">
              <label className="text-[10px] font-black text-black dark:text-black uppercase tracking-widest ml-1">Identity Label</label>
              <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="E.G. ADMISSION_FEE_PROTOCOL" className="w-full bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-2xl px-6 py-4 text-black dark:text-white text-sm font-black uppercase tracking-widest outline-none focus:border-black dark:focus:border-white/40 transition-all shadow-sm" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-black dark:text-black uppercase tracking-widest ml-1">Flow Direction</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))} className="w-full bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-2xl px-6 py-4 text-black dark:text-white text-sm font-black uppercase tracking-widest outline-none [color-scheme:light] dark:[color-scheme:dark]">
                  <option value="income">Inflow (Income)</option>
                  <option value="expense">Outflow (Expense)</option>
                  <option value="both">Duplex (Both)</option>
                </select>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-black dark:text-black uppercase tracking-widest ml-1">Node Scope</label>
                <select value={form.departmentScope} onChange={e => setForm(f => ({ ...f, departmentScope: e.target.value as any }))} className="w-full bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-2xl px-6 py-4 text-black dark:text-white text-sm font-black uppercase tracking-widest outline-none [color-scheme:light] dark:[color-scheme:dark]">
                  <option value="all">Global Matrix</option>
                  <option value="rehab">Rehab Node Only</option>
                  <option value="spims">SPIMS Node Only</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-6 pt-4 border-t border-black/5 dark:border-white/5">
              {[{ key: 'requiresProof', label: 'EVIDENCE_MANDATORY_FLAG' }, { key: 'requiresEntityLink', label: 'ENTITY_SYNCHRONIZATION_REQUIRED' }].map(opt => (
                <label key={opt.key} className="flex items-center justify-between group cursor-pointer">
                  <span className="text-black dark:text-black text-[10px] font-black uppercase tracking-[0.2em] group-hover:text-black dark:group-hover:text-white transition-colors">{opt.label}</span>
                  <div onClick={() => setForm(f => ({ ...f, [opt.key]: !f[opt.key as keyof typeof f] }))} className={`w-14 h-7 rounded-full transition-all duration-300 flex items-center px-1 border-2 ${form[opt.key as keyof typeof form] ? 'bg-black dark:bg-white border-black dark:border-white' : 'bg-transparent border-gray-200 dark:border-white/10'}`}>
                    <div className={`w-4 h-4 rounded-full transition-all duration-300 ${form[opt.key as keyof typeof form] ? 'bg-white dark:bg-black translate-x-7' : 'bg-gray-200 dark:bg-white/10 translate-x-0'}`} />
                  </div>
                </label>
              ))}
            </div>
            <button disabled={!form.label.trim() || saving} onClick={handleAdd} className="w-full bg-black dark:bg-white text-white dark:text-black font-black text-[12px] uppercase tracking-[0.4em] py-6 rounded-[2rem] transition-all active:scale-95 shadow-2xl disabled:opacity-30">
              {saving ? <Loader2 className="animate-spin mx-auto text-white dark:text-black" size={24} /> : 'COMMIT_CATEGORY_TO_LEDGER'}
            </button>
          </div>
        )}

        <div className="bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
          {categories.length === 0 ? (
            <div className="flex flex-col items-center py-32 gap-6">
              <Tag className="text-gray-200 dark:text-white/10" size={64} />
              <p className="text-black font-black text-[10px] uppercase tracking-[0.4em]">Empty Taxonomy Node</p>
            </div>
          ) : (
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {categories.map((cat, index) => (
                <div key={cat.id} style={{ animationDelay: `${index * 40}ms` }} className="animate-in fade-in slide-in-from-left-4 duration-500 flex items-center justify-between px-10 py-8 hover:bg-black/5 dark:hover:bg-white/5 transition-all group">
                  <div className="flex items-center gap-6">
                    <div className={`w-3 h-3 rounded-full shadow-sm transition-all duration-500 group-hover:scale-150 ${cat.isActive ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-white/10'}`} />
                    <div>
                      <p className={`text-xl font-black uppercase tracking-tight transition-all ${cat.isActive ? 'text-black dark:text-white' : 'text-black dark:text-white/10 italic line-through'}`}>{cat.label}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg border-2 ${
                          cat.type === 'income' ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white' : 
                          cat.type === 'expense' ? 'bg-white dark:bg-transparent border-black dark:border-white text-black dark:text-white shadow-xl' : 
                          'bg-gray-100 dark:bg-white/10 text-black border-transparent'
                        }`}>{cat.type}</span>
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-black dark:text-black border-l border-black/10 dark:border-white/10 pl-4">{cat.departmentScope} node</span>
                        {cat.requiresProof && <span className="text-[9px] font-black uppercase tracking-[0.2em] bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded text-black">proof_req</span>}
                        {cat.requiresEntityLink && <span className="text-[9px] font-black uppercase tracking-[0.2em] bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded text-black">entity_sync</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => toggleActive(cat.id, cat.isActive)} className="text-black hover:text-black dark:hover:text-white transition-all transform hover:scale-125">
                    {cat.isActive ? <ToggleRight size={32} className="text-black dark:text-white" /> : <ToggleLeft size={32} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
