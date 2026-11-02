// apps/web/src/components/upload/CategoryMappingModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Save, AlertCircle, Building2, Layers } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  CANONICAL_DEPARTMENTS,
  CanonicalDeptId
} from '@/lib/upload/departmentRegistry';
import {
  saveCategoryDepartmentMap,
  getCategoryDepartmentMap
} from '@/lib/upload/uploadActions';
import { auth } from '@/lib/firebase';

interface CategoryMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Array<{ id: string; name: string }>;
  onSaved?: () => void;
}

export function CategoryMappingModal({
  isOpen,
  onClose,
  categories,
  onSaved
}: CategoryMappingModalProps) {
  const [mapping, setMapping] = useState<Record<string, CanonicalDeptId>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    getCategoryDepartmentMap()
      .then((map) => {
        if (isMounted) {
          setMapping(map || {});
        }
      })
      .catch((err) => {
        console.error('Failed to load category mapping:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectDept = (catKey: string, dept: CanonicalDeptId) => {
    setMapping((prev) => ({
      ...prev,
      [catKey]: dept
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const idToken = await auth.currentUser?.getIdToken();
      const res = await saveCategoryDepartmentMap(mapping, idToken);

      if (res.success) {
        toast.success('Category-to-Department mappings saved ✓');
        onSaved?.();
        onClose();
      } else {
        toast.error(res.error || 'Failed to save mapping');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving mapping');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">Category-to-Department Mapping</h2>
              <p className="text-xs font-medium text-gray-500 mt-0.5">
                Assign Creation Calendar rows to Canonical Departments for automated upload routing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-12 text-center text-xs text-gray-400 font-semibold">
              Loading current category mappings...
            </div>
          ) : categories.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400 font-semibold">
              No creation categories found.
            </div>
          ) : (
            categories.map((cat) => {
              const currentDept = mapping[cat.id] || mapping[cat.name] || '';
              return (
                <div
                  key={cat.id || cat.name}
                  className="p-4 rounded-2xl border border-gray-100 bg-white hover:border-indigo-100 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                >
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{cat.name}</h4>
                    <span className="text-[10px] font-mono text-gray-400">ID: {cat.id}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-gray-400 shrink-0" />
                    <select
                      value={currentDept}
                      onChange={(e) => {
                        const val = e.target.value as CanonicalDeptId;
                        if (val) {
                          handleSelectDept(cat.id, val);
                          if (cat.name) handleSelectDept(cat.name, val);
                        }
                      }}
                      className="text-xs font-bold px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition"
                    >
                      <option value="">— Unassigned (Needs Dept) —</option>
                      {Object.values(CANONICAL_DEPARTMENTS).map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.slug})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <p className="text-[11px] text-gray-500 font-medium">
            Unmapped categories appear with a <span className="text-amber-600 font-bold">Needs Dept</span> badge.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition active:scale-95"
            >
              <Save size={14} />
              <span>{saving ? 'Saving...' : 'Save Mappings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

