// apps/web/src/components/upload/TaskDetailDrawer.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  X, Copy, Check, ExternalLink, AlertTriangle, ShieldCheck,
  Video, Image as ImageIcon, Send, Clock, AlertCircle, Ban, History, FileText, CheckCircle2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  UploadItemDoc,
  UploadPlatformKey,
  UploadPlatformStatus,
  UploadAuditLogDoc,
  DEFAULT_PLATFORM_KEYS,
  ALL_PLATFORM_KEYS
} from '@/lib/upload/types';
import { CANONICAL_DEPARTMENTS } from '@/lib/upload/departmentRegistry';
import { validatePlatformPostUrl } from '@/lib/upload/urlValidation';
import {
  setPlatformStatus,
  getUploadAuditLogs,
  updateItemDetails
} from '@/lib/upload/uploadActions';
import { auth } from '@/lib/firebase';

interface TaskDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: UploadItemDoc | null;
  focusedPlatform?: UploadPlatformKey;
  onItemUpdated: (updatedItem: UploadItemDoc) => void;
  enabledPlatforms?: UploadPlatformKey[];
}

const PLATFORM_LABELS: Record<UploadPlatformKey, { label: string; color: string }> = {
  facebook: { label: 'Facebook', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  instagram: { label: 'Instagram', color: 'text-pink-600 bg-pink-50 border-pink-200' },
  youtube: { label: 'YouTube', color: 'text-rose-600 bg-rose-50 border-rose-200' },
  tiktok: { label: 'TikTok', color: 'text-zinc-900 bg-zinc-100 border-zinc-300' },
  whatsapp: { label: 'WhatsApp', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  website: { label: 'Website', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  linkedin: { label: 'LinkedIn', color: 'text-sky-700 bg-sky-50 border-sky-300' }
};

export function TaskDetailDrawer({
  isOpen,
  onClose,
  item,
  focusedPlatform = 'facebook',
  onItemUpdated,
  enabledPlatforms
}: TaskDetailDrawerProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<UploadPlatformKey>(focusedPlatform);
  const [postUrlInput, setPostUrlInput] = useState<string>('');
  const [skipReasonInput, setSkipReasonInput] = useState<string>('');
  const [correctionReasonInput, setCorrectionReasonInput] = useState<string>('');
  const [isSkipModalOpen, setIsSkipModalOpen] = useState<boolean>(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState<boolean>(false);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<UploadAuditLogDoc[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);

  const platformsToDisplay: UploadPlatformKey[] = React.useMemo(() => {
    if (enabledPlatforms && enabledPlatforms.length > 0) {
      if (selectedPlatform && !enabledPlatforms.includes(selectedPlatform)) {
        return [...enabledPlatforms, selectedPlatform];
      }
      return enabledPlatforms;
    }
    if (selectedPlatform === 'linkedin') {
      return ALL_PLATFORM_KEYS;
    }
    return DEFAULT_PLATFORM_KEYS;
  }, [enabledPlatforms, selectedPlatform]);

  useEffect(() => {
    if (focusedPlatform) {
      setSelectedPlatform(focusedPlatform);
    }
  }, [focusedPlatform]);

  useEffect(() => {
    if (!item) return;
    const currentPlatformState = item.platforms[selectedPlatform];
    setPostUrlInput(currentPlatformState?.postUrl || '');
    setSkipReasonInput('');
    setCorrectionReasonInput('');
    setIsSkipModalOpen(false);
    setIsCorrectionModalOpen(false);

    // Fetch audit history on item open
    let isMounted = true;
    setLoadingAudit(true);
    getUploadAuditLogs(item.id)
      .then((res) => {
        if (isMounted && res.success) {
          setAuditLogs(res.logs || []);
        }
      })
      .catch((err) => console.error('Failed to load audit logs:', err))
      .finally(() => {
        if (isMounted) setLoadingAudit(false);
      });

    return () => {
      isMounted = false;
    };
  }, [item, selectedPlatform]);

  if (!isOpen || !item) return null;

  const currentPlatformState = item.platforms[selectedPlatform] || { status: 'todo', method: 'manual' };
  const isAlreadyPosted = currentPlatformState.status === 'posted';

  const handleCopyCaption = () => {
    const textToCopy = `${item.caption}\n\n${(item.hashtags || []).join(' ')}`.trim();
    navigator.clipboard.writeText(textToCopy);
    setCopiedCaption(true);
    toast.success('Caption & Hashtags copied to clipboard ✓');
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const handleMarkPosted = async () => {
    // Check if editing already posted without correction reason
    if (isAlreadyPosted && postUrlInput.trim() !== (currentPlatformState.postUrl || '').trim()) {
      setIsCorrectionModalOpen(true);
      return;
    }

    // Client-side quick check
    const validation = validatePlatformPostUrl(selectedPlatform, postUrlInput);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid URL');
      return;
    }

    // Warn if video and YouTube is not posted yet
    if (item.contentType === 'video' && selectedPlatform !== 'youtube') {
      const ytStatus = item.platforms.youtube?.status;
      if (ytStatus !== 'posted' && ytStatus !== 'skipped') {
        const proceed = window.confirm(
          'Notice: YouTube is typically the primary channel for video posts. Proceed with publishing to ' +
            PLATFORM_LABELS[selectedPlatform].label +
            ' first?'
        );
        if (!proceed) return;
      }
    }

    try {
      setLoadingAction(true);
      const idToken = await auth.currentUser?.getIdToken();
      const res = await setPlatformStatus(
        item.id,
        selectedPlatform,
        {
          status: 'posted',
          postUrl: postUrlInput.trim(),
          correctionReason: correctionReasonInput.trim() || undefined
        },
        idToken
      );

      if (res.success) {
        toast.success(`Marked as posted on ${PLATFORM_LABELS[selectedPlatform].label} ✓`);
        setIsCorrectionModalOpen(false);

        // Optimistic local update
        const updatedItem: UploadItemDoc = {
          ...item,
          platforms: {
            ...item.platforms,
            [selectedPlatform]: {
              ...currentPlatformState,
              status: 'posted',
              postUrl: postUrlInput.trim(),
              postedAt: new Date().toISOString()
            }
          }
        };
        onItemUpdated(updatedItem);

        // Refresh audit logs
        const auditRes = await getUploadAuditLogs(item.id);
        if (auditRes.success) setAuditLogs(auditRes.logs);
      } else {
        toast.error(res.error || 'Failed to update status');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating status');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleConfirmSkip = async () => {
    if (!skipReasonInput.trim()) {
      toast.error('Please enter a reason for skipping this platform.');
      return;
    }

    try {
      setLoadingAction(true);
      const idToken = await auth.currentUser?.getIdToken();
      const res = await setPlatformStatus(
        item.id,
        selectedPlatform,
        {
          status: 'skipped',
          skipReason: skipReasonInput.trim()
        },
        idToken
      );

      if (res.success) {
        toast.success(`Marked ${PLATFORM_LABELS[selectedPlatform].label} as Skipped`);
        setIsSkipModalOpen(false);

        const updatedItem: UploadItemDoc = {
          ...item,
          platforms: {
            ...item.platforms,
            [selectedPlatform]: {
              ...currentPlatformState,
              status: 'skipped',
              skipReason: skipReasonInput.trim()
            }
          }
        };
        onItemUpdated(updatedItem);

        const auditRes = await getUploadAuditLogs(item.id);
        if (auditRes.success) setAuditLogs(auditRes.logs);
      } else {
        toast.error(res.error || 'Failed to skip platform');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error skipping platform');
    } finally {
      setLoadingAction(false);
    }
  };

  const deptMeta = item.departmentId ? CANONICAL_DEPARTMENTS[item.departmentId] : null;

  return (
    <div className="fixed inset-0 z-[220] flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-gray-100 overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gray-50/50">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                {item.date} • Task #{item.creationTaskId}
              </span>
              {item.contentType === 'video' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <Video size={10} /> Video
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  <ImageIcon size={10} /> Graphic
                </span>
              )}
              {deptMeta ? (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${deptMeta.badgeColor}`}>
                  {deptMeta.name}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                  Needs Department
                </span>
              )}
            </div>
            <h2 className="text-base font-black text-gray-900 leading-snug">{item.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Target Platform Selector Tabs */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
              Select Target Platform:
            </label>
            <div className={`grid gap-1.5 ${platformsToDisplay.length > 6 ? 'grid-cols-4 sm:grid-cols-7' : 'grid-cols-3 sm:grid-cols-6'}`}>
              {platformsToDisplay.map((pk) => {
                const pstate = item.platforms[pk]?.status || 'todo';
                const isSelected = selectedPlatform === pk;
                return (
                  <button
                    key={pk}
                    type="button"
                    onClick={() => setSelectedPlatform(pk)}
                    className={`py-2 px-1.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-[11px] font-bold capitalize text-gray-900">{pk}</span>
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md uppercase tracking-wider ${
                        pstate === 'posted'
                          ? 'bg-emerald-100 text-emerald-800'
                          : pstate === 'skipped'
                          ? 'bg-gray-100 text-gray-600 line-through'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {pstate}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Platform Action Box */}
          <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-lg border text-xs font-black ${PLATFORM_LABELS[selectedPlatform].color}`}>
                  {PLATFORM_LABELS[selectedPlatform].label}
                </span>
                <span>Publishing Details</span>
              </span>
              <span className="text-[11px] font-bold text-gray-500">
                Status:{' '}
                <strong className="capitalize text-indigo-700">{currentPlatformState.status}</strong>
              </span>
            </div>

            {/* Post URL Input */}
            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">
                Post URL <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  placeholder={
                    selectedPlatform === 'youtube'
                      ? 'https://youtube.com/watch?v=...'
                      : selectedPlatform === 'facebook'
                      ? 'https://facebook.com/khanhub/posts/...'
                      : selectedPlatform === 'instagram'
                      ? 'https://instagram.com/p/...'
                      : selectedPlatform === 'tiktok'
                      ? 'https://tiktok.com/@khanhub/video/...'
                      : selectedPlatform === 'linkedin'
                      ? 'https://linkedin.com/posts/... or https://www.linkedin.com/feed/update/...'
                      : '/departments/rehab/media'
                  }
                  value={postUrlInput}
                  onChange={(e) => setPostUrlInput(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-indigo-500 font-mono"
                />
                {currentPlatformState.postUrl && (
                  <a
                    href={currentPlatformState.postUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute right-2.5 top-2.5 text-indigo-600 hover:text-indigo-800"
                    title="Open live post"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Must be a secure https link to authorized {PLATFORM_LABELS[selectedPlatform].label} domain.
              </p>
            </div>

            {/* Actions for this Platform */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-indigo-100/60">
              <button
                type="button"
                onClick={handleMarkPosted}
                disabled={loadingAction}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                <span>{isAlreadyPosted ? 'Update Post URL' : 'Mark as Posted ✓'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSkipModalOpen(true)}
                disabled={loadingAction}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition active:scale-95 disabled:opacity-50"
              >
                <Ban size={13} className="text-gray-400" />
                <span>Skip Platform</span>
              </button>
            </div>
          </div>

          {/* Caption & Hashtags Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Caption & Description:
              </label>
              <button
                type="button"
                onClick={handleCopyCaption}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition"
              >
                {copiedCaption ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                <span>{copiedCaption ? 'Copied!' : 'Copy Caption'}</span>
              </button>
            </div>
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-gray-800 whitespace-pre-wrap font-sans select-all leading-relaxed">
              {item.caption || '(No caption generated)'}
            </div>

            {item.hashtags && item.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {item.hashtags.map((h, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100"
                  >
                    {h}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Assets & Primary Video Link */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
              Assets & Source:
            </label>
            <div className="p-3.5 rounded-2xl border border-gray-200 bg-white space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-700">Source Type:</span>
                <span className="font-mono text-gray-500 text-[11px] uppercase">
                  {item.assets?.sourceType || 'None'}
                </span>
              </div>
              {item.assets?.primaryUrl && (
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-700">Primary URL:</span>
                  <a
                    href={item.assets.primaryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline truncate max-w-[280px] font-mono text-[11px]"
                  >
                    {item.assets.primaryUrl}
                  </a>
                </div>
              )}
              {item.assets?.thumbnailUrl && (
                <div className="pt-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Cover Thumbnail:</p>
                  <img
                    src={item.assets.thumbnailUrl}
                    alt="Asset thumbnail"
                    className="w-full max-h-40 object-cover rounded-xl border border-gray-100"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Audit Trail History */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <History size={14} />
              <span>Audit Trail:</span>
            </div>
            {loadingAudit ? (
              <p className="text-xs text-gray-400 py-2">Loading audit logs...</p>
            ) : auditLogs.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">No audit events recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/70 text-[11px] space-y-0.5"
                  >
                    <div className="flex items-center justify-between text-gray-400 text-[10px]">
                      <span>{log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}</span>
                      <span className="font-mono">{log.performedByName} ({log.performedByRole})</span>
                    </div>
                    <p className="font-bold text-gray-800">
                      {log.action.replace('_', ' ').toUpperCase()}{' '}
                      {log.platform && <span className="capitalize text-indigo-600">[{log.platform}]</span>}
                    </p>
                    {log.reason && <p className="text-gray-600 italic font-medium">"{log.reason}"</p>}
                    {log.newUrl && (
                      <p className="text-[10px] font-mono text-indigo-700 truncate">URL: {log.newUrl}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Skip Modal Overlay ── */}
        {isSkipModalOpen && (
          <div className="absolute inset-0 z-30 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
              <h3 className="text-sm font-bold text-gray-900">
                Skip {PLATFORM_LABELS[selectedPlatform].label}
              </h3>
              <p className="text-xs text-gray-500">
                Please enter a mandatory reason for skipping this platform. This is recorded in the permanent audit trail.
              </p>
              <textarea
                rows={3}
                placeholder="e.g. Content format not suitable for TikTok / Video delayed"
                value={skipReasonInput}
                onChange={(e) => setSkipReasonInput(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSkipModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSkip}
                  disabled={loadingAction || !skipReasonInput.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl"
                >
                  Confirm Skip
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Correction Reason Modal Overlay ── */}
        {isCorrectionModalOpen && (
          <div className="absolute inset-0 z-30 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
              <h3 className="text-sm font-bold text-gray-900">
                Edit Posted Post URL ({PLATFORM_LABELS[selectedPlatform].label})
              </h3>
              <p className="text-xs text-gray-500">
                This item is already marked as Posted. To update the link, please enter a correction reason for the audit trail.
              </p>
              <textarea
                rows={2}
                placeholder="e.g. Fixed broken link / Re-uploaded improved version"
                value={correctionReasonInput}
                onChange={(e) => setCorrectionReasonInput(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCorrectionModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleMarkPosted}
                  disabled={loadingAction || !correctionReasonInput.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl"
                >
                  Save Correction
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

