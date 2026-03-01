'use client';
// src/components/forms/ContactForm.tsx

import { useState, FormEvent } from 'react';
import { submitContactForm } from '@/lib/firestore';
import { Spinner } from '@/components/ui';
import { getWhatsAppUrl } from '@/lib/whatsapp';
import { SiWhatsapp } from 'react-icons/si';

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await submitContactForm(form);
      setSuccess(true);
      // We don't clear the form immediately so it can be shared on WhatsApp
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const whatsappUrl = getWhatsAppUrl(form, `Contact: ${form.subject || 'General Inquiry'}`);

    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">✅</div>
        <h3 className="font-display font-semibold text-white text-xl mb-2">Message Sent!</h3>
        <p className="text-neutral-500 text-sm mb-8">We&apos;ll get back to you within 24 hours.</p>

        <div className="flex flex-col gap-4 max-w-xs mx-auto">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary w-full justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] border-none text-white shadow-lg shadow-[#25D366]/20 py-3"
          >
            <SiWhatsapp className="w-5 h-5" />
            Share on WhatsApp for Quick Response
          </a>

          <button
            onClick={() => {
              setSuccess(false);
              setForm({ name: '', email: '', phone: '', subject: '', message: '' });
            }}
            className="text-neutral-500 hover:text-white text-sm font-medium transition-colors"
          >
            Send Another Message
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-neutral-500 font-medium mb-1.5">Full Name *</label>
          <input type="text" name="name" value={form.name} onChange={handleChange} required
            placeholder="Your full name"
            className="input-field text-sm" />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 font-medium mb-1.5">Phone Number</label>
          <input type="tel" name="phone" value={form.phone} onChange={handleChange}
            placeholder="+92-3XX-XXX-XXXX"
            className="input-field text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-neutral-500 font-medium mb-1.5">Email Address *</label>
        <input type="email" name="email" value={form.email} onChange={handleChange} required
          placeholder="you@email.com"
          className="input-field text-sm" />
      </div>
      <div>
        <label className="block text-xs text-neutral-500 font-medium mb-1.5">Subject</label>
        <select name="subject" value={form.subject} onChange={handleChange}
          className="input-field text-sm bg-neutral-900">
          <option value="" disabled>Select a subject</option>
          <option value="general">General Inquiry</option>
          <option value="appointment">Appointment Request</option>
          <option value="donation">About Donations</option>
          <option value="volunteer">Volunteering</option>
          <option value="media">Media & Press</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-neutral-500 font-medium mb-1.5">Message *</label>
        <textarea name="message" value={form.message} onChange={handleChange} required rows={4}
          placeholder="How can we help you?"
          className="input-field text-sm resize-none" />
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full justify-center text-sm">
        {loading ? <Spinner size="sm" /> : '📤 Send Message'}
      </button>
    </form>
  );
}