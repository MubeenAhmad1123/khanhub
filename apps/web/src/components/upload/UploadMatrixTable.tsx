// apps/web/src/components/upload/UploadMatrixTable.tsx
'use client';

import React from 'react';
import {
  UploadItemDoc,
  UploadPlatformKey,
  ALL_PLATFORM_KEYS,
  UploadPlatformStatus
} from '@/lib/upload/types';
import { CANONICAL_DEPARTMENTS } from '@/lib/upload/departmentRegistry';
import {
  CheckCircle2, AlertTriangle, ExternalLink, Video,
  Image as ImageIcon, Ban, Clock, ChevronRight
} from 'lucide-react';

interface UploadMatrixTableProps {
  items: UploadItemDoc[];
  onCellClick: (item: UploadItemDoc, platform: UploadPlatformKey) => void;
  todayKarachi: string; // 'YYYY-MM-DD'
}

function StatusChip({
  status,
  hasUrl,
  isOverdue,
  onClick
}: {
  status: UploadPlatformStatus;
  hasUrl: boolean;
  isOverdue: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  let chipClass = 'bg-gray-100 text-gray-700 border-gray-200 hover:border-gray-400';
  let label = 'Todo';
  let icon = <Clock size={11} className="text-gray-400" />;

  if (status === 'posted') {
    chipClass = 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:border-emerald-400';
    label = 'Posted';
    icon = <CheckCircle2 size={11} className="text-emerald-600" />;
  } else if (status === 'skipped') {
    chipClass = 'bg-slate-100 text-slate-500 border-slate-200 line-through';
    label = 'Skipped';
    icon = <Ban size={11} className="text-slate-400" />;
  } else if (status === 'failed') {
    chipClass = 'bg-rose-50 text-rose-800 border-rose-200 hover:border-rose-400';
    label = 'Failed';
    icon = <AlertTriangle size={11} className="text-rose-600" />;
  } else if (isOverdue) {
    chipClass = 'bg-rose-50 text-rose-700 border-rose-300 font-black animate-pulse';
    label = 'Overdue ⚠';
    icon = <AlertTriangle size={11} className="text-rose-500" />;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all duration-150 active:scale-95 cursor-pointer shadow-2xs ${chipClass}`}
    >
      {icon}
      <span>{label}</span>
      {hasUrl && <ExternalLink size={9} className="opacity-70" />}
    </button>
  );
}

export function UploadMatrixTable({
  items,
  onCellClick,
  todayKarachi
}: UploadMatrixTableProps) {
  if (items.length === 0) {
    return (
      <div className="py-20 text-center bg-white rounded-3xl border border-gray-100 p-8 shadow-xs">
        <p className="text-sm font-bold text-gray-700">No content items for this month.</p>
        <p className="text-xs text-gray-400 mt-1">
          Click "Generate Sheet from Calendar" above to import planned tasks from the Creation Calendar.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto w-full bg-white rounded-3xl border border-gray-100 shadow-xs">
      <table className="w-full text-left border-collapse min-w-[960px]">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/60 text-[11px] font-black uppercase tracking-wider text-gray-500">
            <th className="py-4 px-4 w-28">Date</th>
            <th className="py-4 px-4 min-w-[240px]">Content Item</th>
            <th className="py-4 px-3 text-center">Facebook</th>
            <th className="py-4 px-3 text-center">Instagram</th>
            <th className="py-4 px-3 text-center">YouTube</th>
            <th className="py-4 px-3 text-center">TikTok</th>
            <th className="py-4 px-3 text-center">WhatsApp</th>
            <th className="py-4 px-3 text-center">Website</th>
            <th className="py-4 px-3 text-center">LinkedIn</th>
            <th className="py-4 px-3 w-16 text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 text-xs">
          {items.map((item) => {
            const isNeedsDept = !item.departmentId;
            const isOrphaned = item.syncStatus === 'orphaned';
            const deptMeta = item.departmentId ? CANONICAL_DEPARTMENTS[item.departmentId] : null;
            const isDatePast = item.date < todayKarachi;

            return (
              <tr
                key={item.id}
                className={`transition-colors hover:bg-indigo-50/30 group ${
                  isNeedsDept
                    ? 'bg-amber-50/30'
                    : isOrphaned
                    ? 'bg-gray-50/60 opacity-60'
                    : ''
                }`}
              >
                {/* Date */}
                <td className="py-3.5 px-4 font-mono font-bold text-gray-700 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span>{item.date}</span>
                    {isDatePast && (
                      <span className="text-[9px] font-bold text-gray-400">Past</span>
                    )}
                  </div>
                </td>

                {/* Content Item Title & Badges */}
                <td className="py-3.5 px-4">
                  <div className="flex flex-col gap-1 max-w-sm">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.contentType === 'video' ? (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                          <Video size={9} /> Video
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                          <ImageIcon size={9} /> Graphic
                        </span>
                      )}

                      {deptMeta ? (
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${deptMeta.badgeColor}`}>
                          {deptMeta.name.replace('KhanHub ', '')}
                        </span>
                      ) : (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                          Needs Dept
                        </span>
                      )}

                      {isOrphaned && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-gray-200 text-gray-700">
                          Orphaned
                        </span>
                      )}
                    </div>

                    <span
                      onClick={() => onCellClick(item, 'facebook')}
                      className="font-bold text-gray-900 group-hover:text-indigo-600 transition cursor-pointer leading-snug line-clamp-1"
                      title={item.title}
                    >
                      {item.title}
                    </span>

                    {item.creationCategoryName && (
                      <span className="text-[10px] text-gray-400 font-medium truncate">
                        Row: {item.creationCategoryName}
                      </span>
                    )}
                  </div>
                </td>

                {/* Platforms: FB, IG, YT, TikTok, WA, Web */}
                {ALL_PLATFORM_KEYS.map((pk) => {
                  const pstate = item.platforms[pk]?.status || 'todo';
                  const hasUrl = Boolean(item.platforms[pk]?.postUrl);
                  const isOverdue = isDatePast && pstate !== 'posted' && pstate !== 'skipped';

                  return (
                    <td key={pk} className="py-3.5 px-3 text-center whitespace-nowrap">
                      <StatusChip
                        status={pstate}
                        hasUrl={hasUrl}
                        isOverdue={isOverdue}
                        onClick={() => onCellClick(item, pk)}
                      />
                    </td>
                  );
                })}

                {/* Quick Action Button */}
                <td className="py-3.5 px-3 text-center">
                  <button
                    type="button"
                    onClick={() => onCellClick(item, 'facebook')}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                    title="Open task details drawer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

