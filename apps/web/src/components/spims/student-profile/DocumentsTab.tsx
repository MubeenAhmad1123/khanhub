// apps/web/src/components/spims/student-profile/DocumentsTab.tsx
'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import { FileText, Trash2, Upload, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { SpimsStudentDocument } from '@/types/spims';
import type { SpimsSessionLike } from './AdmissionTab';
import { formatDateDMY } from '@/lib/utils';

export default function DocumentsTab({
  studentId,
  session,
}: {
  studentId: string;
  session: SpimsSessionLike;
}) {
  const [docs, setDocs] = useState<SpimsStudentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const canEdit = session.role === 'admin' || session.role === 'superadmin';

  useEffect(() => {
    const q = query(
      collection(db, 'spims_student_documents'),
      where('studentId', '==', studentId),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setDocs(
          snap.docs.map((d) => {
            const x = d.data();
            return {
              id: d.id,
              ...x,
              createdAt: x.createdAt?.toDate ? x.createdAt.toDate() : x.createdAt,
            } as SpimsStudentDocument;
          })
        );
        setLoading(false);
      },
      (e) => {
        console.error(e);
        toast.error('Could not load documents');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [studentId]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canEdit) return;
    if (!title.trim()) {
      toast.error('Enter document title');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, `khanhub/spims/students/${studentId}`);
      await addDoc(collection(db, 'spims_student_documents'), {
        studentId,
        title: title.trim(),
        fileUrl: url,
        createdAt: serverTimestamp(),
        createdBy: session.uid,
      });
      setTitle('');
      if (fileRef.current) fileRef.current.value = '';
      toast.success('Uploaded');
    } catch (err) {
      console.error(err);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    if (!canEdit) return;
    if (!confirm('Delete this document?')) return;
    try {
      await deleteDoc(doc(db, 'spims_student_documents', id));
      toast.success('Removed');
    } catch {
      toast.error('Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-[#1D9E75] w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <FileText className="text-[#1D9E75]" size={22} /> Documents
        </h2>
        <p className="text-sm text-gray-500 font-medium mt-1">CNIC copy, photos, certificates</p>
      </div>

      {canEdit && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Title</label>
              <input
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold"
                placeholder="e.g. CNIC copy"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 flex flex-col justify-end">
              <input ref={fileRef} type="file" className="hidden" accept="image/*,.pdf" onChange={onUpload} />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1D9E75] text-white px-4 py-2.5 text-sm font-bold disabled:opacity-50"
              >
                {uploading ? <Loader2 className="animate-spin w-4 h-4" /> : <Upload size={18} />}
                Upload file
              </button>
            </div>
          </div>
        </div>
      )}

      <ul className="space-y-3">
        {docs.length === 0 ? (
          <li className="text-gray-400 text-sm font-medium py-8 text-center border border-dashed border-gray-200 rounded-2xl">
            No documents uploaded.
          </li>
        ) : (
          docs.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
            >
              <div className="min-w-0">
                <p className="font-bold text-gray-900 truncate">{d.title}</p>
                <p className="text-xs text-gray-400 font-medium">{formatDateDMY(d.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={d.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-bold text-[#1D9E75] hover:underline"
                >
                  Open
                </a>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => remove(d.id)}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-50"
                    aria-label="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
