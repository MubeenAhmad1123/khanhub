// apps/web/src/components/upload/WhatsAppBroadcastDrawer.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  X, Copy, Check, ExternalLink, Send, Clock, Ban, CheckCircle2,
  Video, Image as ImageIcon, Users, Radio, Sparkles, Layers, AlertTriangle
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { auth } from '@/lib/firebase';
import {
  WhatsAppTargetKey,
  WhatsAppTargetStatus,
  WhatsAppDailyBroadcastDoc,
  WhatsAppDayContentItem,
  DEFAULT_WHATSAPP_TARGETS,
  WhatsAppTargetConfig
} from '@/lib/upload/whatsappTypes';
import {
  setWhatsAppTargetStatus,
  setWhatsAppBroadcastAllDay,
  getWhatsAppDailyContent
} from '@/lib/upload/whatsappActions';

interface WhatsAppBroadcastDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  date: string; // 'YYYY-MM-DD'
  focusedTarget?: WhatsAppTargetKey;
  broadcastDoc?: WhatsAppDailyBroadcastDoc;
  onDayUpdated: (updatedDoc: WhatsAppDailyBroadcastDoc) => void;
}

export function WhatsAppBroadcastDrawer({
  isOpen,
  onClose,
  date,
  focusedTarget,
  broadcastDoc,
  onDayUpdated
}: WhatsAppBroadcastDrawerProps) {
  const [contentItems, setContentItems] = useState<WhatsAppDayContentItem[]>([]);
  const [loadingContent, setLoadingContent] = useState<boolean>(false);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Targets state for this day
  const targetsState = broadcastDoc?.targets || ({} as any);

  // Load content items whenever date changes
  useEffect(() => {
    if (!isOpen || !date) return;
    let isMounted = true;
    setLoadingContent(true);

    getWhatsAppDailyContent(date)
      .then((res) => {
        if (isMounted && res.success) {
          setContentItems(res.items);
        }
      })
      .catch((err) => console.error('Failed to load day content:', err))
      .finally(() => {
        if (isMounted) setLoadingContent(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, date]);

  if (!isOpen || !date) return null;

  // Format date display
  const dateFormatted = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const handleCopyCaption = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Caption copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpdateTarget = async (targetKey: WhatsAppTargetKey, status: WhatsAppTargetStatus) => {
    try {
      setLoadingAction(true);
      const idToken = await auth.currentUser?.getIdToken();
      const res = await setWhatsAppTargetStatus(date, targetKey, { status }, idToken);

      if (res.success) {
        toast.success(`Updated ${targetKey} to ${status}`);
        const updatedDoc: WhatsAppDailyBroadcastDoc = {
          id: date,
          month: date.slice(0, 7),
          date,
          targets: {
            ...targetsState,
            [targetKey]: {
              ...targetsState[targetKey],
              status,
              postedAt: status === 'posted' ? new Date().toISOString() : undefined
            }
          },
          updatedAt: new Date().toISOString()
        };
        onDayUpdated(updatedDoc);
      } else {
        toast.error(res.error || 'Failed to update target');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating target');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleBroadcastAll = async (status: WhatsAppTargetStatus) => {
    try {
      setLoadingAction(true);
      const idToken = await auth.currentUser?.getIdToken();
      const res = await setWhatsAppBroadcastAllDay(date, status, idToken);

      if (res.success) {
        toast.success(
          status === 'posted'
            ? 'Broadcast All: Marked all 8 groups + channel as Posted ✓!'
            : `Marked all targets as ${status}`
        );

        const newTargets: any = {};
        for (const t of DEFAULT_WHATSAPP_TARGETS) {
          newTargets[t.key] = {
            status,
            postedAt: status === 'posted' ? new Date().toISOString() : undefined
          };
        }

        const updatedDoc: WhatsAppDailyBroadcastDoc = {
          id: date,
          month: date.slice(0, 7),
          date,
          targets: newTargets,
          updatedAt: new Date().toISOString()
        };
        onDayUpdated(updatedDoc);
      } else {
        toast.error(res.error || 'Failed to broadcast all');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error broadcasting');
    } finally {
      setLoadingAction(false);
    }
  };

  // Calculate posted targets for this day
  const postedCount = DEFAULT_WHATSAPP_TARGETS.filter(
    (t) => targetsState[t.key]?.status === 'posted'
  ).length;

  return (
    <div className="fixed inset-0 z-[220] flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-gray-100 overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-emerald-50/40">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                <FaWhatsapp size={12} className="text-[#25D366]" /> WhatsApp Broadcast
              </span>
              <span className="text-[10px] font-mono font-bold text-gray-500">{date}</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-white border border-gray-200 text-slate-700">
                {postedCount}/9 Sent
              </span>
            </div>
            <h2 className="text-base font-black text-gray-900 leading-snug">{dateFormatted}</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Distribute the day&apos;s generated content to all 8 KhanHub Groups + Muhammad Khan Channel.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-white rounded-xl transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Quick Broadcast Action Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles size={16} className="text-emerald-200" />
                <h3 className="font-black text-sm">One-Click Daily Broadcast</h3>
              </div>
              <p className="text-[11px] text-emerald-100 mt-0.5">
                Mark all 8 groups and the official channel as posted for today.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleBroadcastAll('posted')}
                disabled={loadingAction}
                className="px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl font-black text-xs shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                Broadcast All ✓
              </button>
              <button
                type="button"
                onClick={() => handleBroadcastAll('skipped')}
                disabled={loadingAction}
                className="px-2.5 py-2 bg-emerald-800/80 hover:bg-emerald-900 text-white rounded-xl font-bold text-[10px] transition cursor-pointer disabled:opacity-50"
                title="Mark all as skipped"
              >
                Skip All
              </button>
            </div>
          </div>

          {/* ── Section 1: Day's Generated Content ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Layers size={13} className="text-indigo-600" />
                <span>Today&apos;s Generated Posts ({contentItems.length})</span>
              </h3>
              <span className="text-[10px] text-slate-400">Content to upload to WhatsApp</span>
            </div>

            {loadingContent ? (
              <div className="p-6 text-center text-slate-400 italic bg-slate-50 rounded-2xl border border-gray-100">
                Loading today&apos;s content posts...
              </div>
            ) : contentItems.length === 0 ? (
              <div className="p-5 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-gray-200">
                <p className="font-bold text-slate-600">No content items planned for {date}.</p>
                <p className="text-[10.5px] text-slate-400 mt-0.5">
                  Any tasks planned on the Creation Calendar will show up here ready to copy.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {contentItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3.5 rounded-2xl border border-gray-200 bg-slate-50/70 hover:bg-white transition space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-gray-900">{item.title}</span>
                        {item.contentType === 'video' ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.2 rounded text-[9px] font-black bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                            <Video size={9} /> Video
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.2 rounded text-[9px] font-black bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                            <ImageIcon size={9} /> Graphic
                          </span>
                        )}
                        {item.categoryName && (
                          <span className="text-[9px] font-medium text-slate-400">
                            • {item.categoryName}
                          </span>
                        )}
                      </div>

                      {item.primaryUrl && (
                        <a
                          href={item.primaryUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5 shrink-0"
                        >
                          <ExternalLink size={10} /> View Asset
                        </a>
                      )}
                    </div>

                    {/* Ready-to-copy Caption */}
                    {item.caption && (
                      <div className="relative group">
                        <div className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-mono text-[11px] leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {item.caption}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyCaption(item.id, item.caption)}
                          className="absolute right-2 top-2 px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs transition active:scale-95 cursor-pointer"
                          title="Copy full caption to clipboard"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check size={11} /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy size={11} /> Copy Caption
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Section 2: Distribution Targets (8 Groups + 1 Channel) ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Users size={13} className="text-emerald-600" />
                <span>WhatsApp Targets (8 Groups + 1 Channel)</span>
              </h3>
              <span className="text-[10px] text-slate-400">Toggle individual groups below</span>
            </div>

            <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 overflow-hidden bg-white">
              {DEFAULT_WHATSAPP_TARGETS.map((target) => {
                const state = targetsState[target.key]?.status || 'todo';
                const isPosted = state === 'posted';
                const isSkipped = state === 'skipped';
                const isChannel = target.type === 'channel';

                return (
                  <div
                    key={target.key}
                    className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                      isPosted ? 'bg-emerald-50/30' : isSkipped ? 'bg-slate-50/50 opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                          isChannel
                            ? 'bg-amber-50 text-amber-600 border-amber-200'
                            : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        }`}
                      >
                        {isChannel ? <Radio size={14} /> : <FaWhatsapp size={14} className="text-[#25D366]" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-900">{target.name}</span>
                          <span
                            className={`text-[8.5pt] font-black uppercase px-1.5 py-0.2 rounded border ${
                              isChannel
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {target.type}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 truncate">{target.description}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateTarget(target.key, isPosted ? 'todo' : 'posted')}
                        disabled={loadingAction}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1 transition active:scale-95 cursor-pointer disabled:opacity-50 ${
                          isPosted
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 border border-slate-200'
                        }`}
                      >
                        <Check size={12} className={isPosted ? 'stroke-[3]' : ''} />
                        <span>{isPosted ? 'Posted ✓' : 'Mark Posted'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateTarget(target.key, isSkipped ? 'todo' : 'skipped')}
                        disabled={loadingAction}
                        className={`px-2 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer disabled:opacity-50 ${
                          isSkipped
                            ? 'bg-slate-200 text-slate-700 line-through'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                        }`}
                        title={isSkipped ? 'Reset target' : 'Skip this group'}
                      >
                        <Ban size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

