'use client';
// src/components/forms/InquiryForm.tsx
// Receives the department slug as a prop so it auto-fills.

import { useState, FormEvent } from 'react';
import { submitInquiryForm } from '@/lib/firestore';
import { Spinner } from '@/components/ui';

interface InquiryFormProps {
  department: string; // slug
}

export default function InquiryForm({ department }: InquiryFormProps) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await submitInquiryForm({ ...form, department });
      setSuccess(true);
      setForm({ name: '', email: '', phone: '', message: '' });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-10">
        <div className="text-5xl mb-3">✅</div>
        <h3 className="font-display font-semibold text-white text-lg mb-1">Inquiry Submitted!</h3>
        <p className="text-neutral-500 text-sm">Our team will reach out to you shortly.</p>
        <button onClick={() => setSuccess(false)} className="btn-secondary mt-5 text-sm px-4 py-2">Submit Another</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-neutral-500 font-medium mb-1.5">Name *</label>
          <input type="text" name="name" value={form.name} onChange={handleChange} required
            placeholder="Your name" className="input-field text-sm" />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 font-medium mb-1.5">Phone</label>
          <input type="tel" name="phone" value={form.phone} onChange={handleChange}
            placeholder="+92-3XX-XXX-XXXX" className="input-field text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-neutral-500 font-medium mb-1.5">Email *</label>
        <input type="email" name="email" value={form.email} onChange={handleChange} required
          placeholder="you@email.com" className="input-field text-sm" />
      </div>
      <div>
        <label className="block text-xs text-neutral-500 font-medium mb-1.5">Your Message *</label>
        <textarea name="message" value={form.message} onChange={handleChange} required rows={3}
          placeholder="Tell us what you need…" className="input-field text-sm resize-none" />
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full justify-center text-sm">
        {loading ? <Spinner size="sm" /> : '📤 Send Inquiry'}
      </button>
    </form>
  );
}