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
    return <div className="min-h-screen flex items-center justify-center bg-gray-950"><Loader2 className="animate-spin text-amber-500" size={32} /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8 pb-24">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Categories</h1>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Transaction category registry</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black text-xs uppercase tracking-widest px-5 py-3 rounded-2xl transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20">
            <Plus size={14} /> Add
          </button>
        </div>

        {showForm && (
          <div className="animate-in slide-in-from-top-2 duration-300 bg-white/5 border border-amber-500/20 rounded-3xl p-6 space-y-4">
            <h3 className="text-amber-500 font-black text-xs uppercase tracking-widest">New Category</h3>
            <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Category name (e.g. Admission Fee)" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-amber-500/50 transition-all" />
            <div className="grid grid-cols-2 gap-3">
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))} className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold outline-none [color-scheme:dark]">
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="both">Both</option>
              </select>
              <select value={form.departmentScope} onChange={e => setForm(f => ({ ...f, departmentScope: e.target.value as any }))} className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold outline-none [color-scheme:dark]">
                <option value="all">All Departments</option>
                <option value="rehab">Rehab Only</option>
                <option value="spims">SPIMS Only</option>
              </select>
            </div>
            <div className="flex gap-4">
              {[{ key: 'requiresProof', label: 'Requires Proof' }, { key: 'requiresEntityLink', label: 'Link to Patient/Student' }].map(opt => (
                <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                  <div onClick={() => setForm(f => ({ ...f, [opt.key]: !f[opt.key as keyof typeof f] }))} className={`w-10 h-5 rounded-full transition-all duration-200 flex items-center px-0.5 ${form[opt.key as keyof typeof form] ? 'bg-amber-500' : 'bg-white/10'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-all duration-200 ${form[opt.key as keyof typeof form] ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                  <span className="text-gray-400 text-xs font-bold">{opt.label}</span>
                </label>
              ))}
            </div>
            <button disabled={!form.label.trim() || saving} onClick={handleAdd} className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-black text-xs uppercase tracking-widest py-3 rounded-2xl transition-all active:scale-95">
              {saving ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Save Category'}
            </button>
          </div>
        )}

        <div className="bg-white/5 border border-white/8 rounded-3xl overflow-hidden">
          {categories.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <Tag className="text-gray-700" size={32} />
              <p className="text-gray-600 font-black text-xs uppercase tracking-widest">No categories yet</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {categories.map((cat, index) => (
                <div key={cat.id} style={{ animationDelay: `${index * 40}ms` }} className="animate-in fade-in duration-300 flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${cat.isActive ? 'bg-emerald-500' : 'bg-gray-700'}`} />
                    <div>
                      <p className={`text-sm font-bold ${cat.isActive ? 'text-white' : 'text-gray-600 line-through'}`}>{cat.label}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${cat.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : cat.type === 'expense' ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'}`}>{cat.type}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-600">{cat.departmentScope}</span>
                        {cat.requiresProof && <span className="text-[9px] font-black uppercase tracking-widest text-amber-500/60">proof</span>}
                        {cat.requiresEntityLink && <span className="text-[9px] font-black uppercase tracking-widest text-blue-500/60">entity</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => toggleActive(cat.id, cat.isActive)} className="text-gray-500 hover:text-amber-500 transition-colors">
                    {cat.isActive ? <ToggleRight size={22} className="text-amber-500" /> : <ToggleLeft size={22} />}
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
