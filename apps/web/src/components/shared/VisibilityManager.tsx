'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, Save, Lock, Settings2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getDefaultSections } from '@/lib/visibilityManager';

interface VisibilityManagerProps {
  entityType: 'staff' | 'patient' | 'student';
  entityId: string;
  department: string;
  currentSections: Record<string, boolean>;
  onSave: (updated: Record<string, boolean>) => Promise<void> | void;
}

const SECTION_LABELS: Record<string, { label: string; desc: string; category: string }> = {
  // Staff
  salary: { label: 'Monthly Salary', desc: 'Allow staff member to view their salary slips and compensation details.', category: 'Financial' },
  designation: { label: 'Work Designation', desc: 'Display designation and department roles to the staff member.', category: 'Professional' },
  attendance: { label: 'Attendance Records', desc: 'Allow staff member to view their attendance history and punctuality stats.', category: 'Operational' },
  duties: { label: 'Daily Duties & Tasks', desc: 'Show daily task checklists and duties assigned to the staff member.', category: 'Operational' },
  uniform: { label: 'Uniform Checklist', desc: 'Show dress code compliance logs and uniform status checks.', category: 'Operational' },
  growthPoints: { label: 'Growth Points', desc: 'Display total growth points accumulated and performance scoreboards.', category: 'Professional' },
  reports: { label: 'Performance Reports', desc: 'Show aggregated monthly reviews or direct evaluation feedback reports.', category: 'Professional' },
  canteenWallet: { label: 'Canteen Wallet', desc: 'Allow staff member to view their canteen wallet deposits, spending, and balance.', category: 'Financial' },

  // Patients
  admissionDetails: { label: 'Admission Details', desc: 'Show full package details, dates, and medical diagnostic info.', category: 'Core Patient Details' },
  dailySheet: { label: 'Daily Sheet / Vitals', desc: 'Allow family to monitor daily vital signs, food logs, and active status sheets.', category: 'Medical & Therapy' },
  medication: { label: 'Medication Logs', desc: 'Allow family to view active prescriptions and daily pharmacy logs.', category: 'Medical & Therapy' },
  therapy: { label: 'Therapy & Activities', desc: 'Show daily physical therapy progress or active clinical treatments.', category: 'Medical & Therapy' },
  progressNotes: { label: 'Progress & Growth', desc: 'Display psychiatric reports, psychological reviews, and behavioral growth notes.', category: 'Medical & Therapy' },
  financialStatement: { label: 'Financial Statement', desc: 'Allow family to view overall packages, canteen deposits, and remaining balances.', category: 'Financial' },
  familyContact: { label: 'Family Contact Info', desc: 'Display emergency phone numbers, guardian relations, and call buttons.', category: 'Core Patient Details' },
  visits: { label: 'Family Visit Logs', desc: 'Allow family to view visitor logs and official visit history.', category: 'Core Patient Details' },
  canteen: { label: 'Canteen Wallet History', desc: 'Allow family to view detailed canteen deposits, expenses, and transaction logs.', category: 'Financial' },
  files: { label: 'Files & Media Progress', desc: 'Allow family to view uploaded progress videos, images, and documents.', category: 'Core Patient Details' },

  // Students
  examRecords: { label: 'Exam & Test Records', desc: 'Allow student to view test marks, exams results, and academic status.', category: 'Academic' },
  feeRecord: { label: 'Fee Records', desc: 'Allow student to view college dues, packages, and deposit records.', category: 'Financial' },
  documents: { label: 'Academic Documents', desc: 'Allow student to access CNIC copies, certificates, or admission uploads.', category: 'Academic' },
};

export default function VisibilityManager({
  entityType,
  entityId,
  department,
  currentSections,
  onSave,
}: VisibilityManagerProps): any {
  const [sections, setSections] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Initialize and merge sections with defaults
  useEffect(() => {
    const defaults = getDefaultSections(entityType);
    setSections({ ...defaults, ...currentSections });
  }, [currentSections, entityType]);

  const handleToggle = (key: string) => {
    setSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(sections);
      toast.success('Profile visibility configurations updated successfully! ✓');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update profile visibility configurations.');
    } finally {
      setSaving(false);
    }
  };

  // Group sections by category
  const categories: Record<string, string[]> = {};
  Object.keys(sections).forEach((key) => {
    const info = SECTION_LABELS[key] || {
      label: key.charAt(0).toUpperCase() + key.slice(1),
      desc: `Toggle visibility of the ${key} section.`,
      category: 'General',
    };
    if (!categories[info.category]) {
      categories[info.category] = [];
    }
    categories[info.category].push(key);
  });

  return (
    <div className="w-full bg-slate-950 border-4 border-black rounded-[2.5rem] p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all duration-300 relative overflow-hidden group">
      {/* Dynamic backdrop accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all pointer-events-none"></div>

      {/* Header */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Settings2 size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              Profile Visibility Settings
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md lowercase font-medium">
                manager access
              </span>
            </h3>
            <p className="text-slate-400 text-xs mt-1 font-semibold">
              Select which sections are visible when this {entityType} logs in.
            </p>
          </div>
        </div>

        <button 
          type="button"
          className="text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border-2 border-black hover:border-white transition-all font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        >
          {isOpen ? 'Close' : 'Manage'}
        </button>
      </div>

      {/* Toggles Panel */}
      {isOpen && (
        <div className="mt-8 pt-6 border-t-2 border-slate-900 space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="space-y-6">
            {Object.entries(categories).map(([category, keys]) => (
              <div key={category} className="space-y-4">
                <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] border-b border-slate-900 pb-2">
                  {category}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {keys.map((key) => {
                    const info = SECTION_LABELS[key] || {
                      label: key.charAt(0).toUpperCase() + key.slice(1),
                      desc: `Toggle visibility of the ${key} section.`,
                    };
                    const isVisible = sections[key];

                    return (
                      <div
                        key={key}
                        onClick={() => handleToggle(key)}
                        className={`flex items-start justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer select-none group/item ${
                          isVisible
                            ? 'bg-slate-900/50 border-emerald-500/30 hover:border-emerald-500/60'
                            : 'bg-slate-950 border-slate-900 hover:border-slate-800'
                        }`}
                      >
                        <div className="flex-1 pr-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-black uppercase tracking-wider transition-colors ${
                              isVisible ? 'text-white' : 'text-slate-500'
                            }`}>
                              {info.label}
                            </span>
                            {!isVisible && (
                              <span className="flex items-center gap-0.5 text-[8px] font-black text-slate-500 uppercase tracking-widest bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                <Lock size={8} /> Hidden
                              </span>
                            )}
                          </div>
                          <p className={`text-[11px] mt-1 font-semibold leading-relaxed transition-colors ${
                            isVisible ? 'text-slate-400' : 'text-slate-600'
                          }`}>
                            {info.desc}
                          </p>
                        </div>

                        {/* Visual Switch */}
                        <div className="pt-0.5 flex-shrink-0">
                          <div
                            className={`w-10 h-6 rounded-full p-0.5 transition-all duration-300 ${
                              isVisible ? 'bg-emerald-500' : 'bg-slate-800 border border-slate-700'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                                isVisible ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-4 border-t-2 border-slate-900">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-black text-xs uppercase tracking-widest rounded-2xl flex items-center gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all active:scale-[0.98]"
            >
              {saving ? (
                <>
                  Saving Changes...
                  <span className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin"></span>
                </>
              ) : (
                <>
                  Save Permissions <Save size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
