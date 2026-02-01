'use client';
// src/components/forms/DonationForm.tsx

import { useState, FormEvent } from 'react';
import { createDonation }      from '@/lib/firestore';
import { Spinner }             from '@/components/ui';

const PRESET_AMOUNTS = [500, 1000, 2500, 5000, 10000];

const PAYMENT_METHODS = [
  { value: 'bank',      label: 'Bank Transfer',  icon: '🏦' },
  { value: 'jazzcash',  label: 'JazzCash',       icon: '💚' },
  { value: 'easypaisa', label: 'Easypaisa',      icon: '🟢' },
  { value: 'payfast',   label: 'PayFast Online', icon: '💳' },
];

export default function DonationForm() {
  const [amount, setAmount]         = useState<number | string>('');
  const [customAmount, setCustom]   = useState('');
  const [method, setMethod]         = useState('bank');
  const [form, setForm]             = useState({ name: '', email: '', phone: '', message: '' });
  const [loading, setLoading]       = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState('');

  const finalAmount = amount === 'custom' ? Number(customAmount) : Number(amount);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!finalAmount || finalAmount <= 0) { setError('Please enter a valid amount.'); return; }
    setLoading(true);
    setError('');
    try {
      await createDonation({
        ...form,
        amount: finalAmount,
        currency: 'PKR',
        method,
        status: 'pending',
      });
      setSuccess(true);
    } catch {
      setError('Failed to process. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-14">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="font-display font-bold text-white text-2xl mb-2">Thank You!</h3>
        <p className="text-neutral-500 text-sm max-w-sm mx-auto">
          Your donation of <span className="text-primary-400 font-semibold">PKR {finalAmount.toLocaleString()}</span> has been recorded.
          You will receive bank details via email.
        </p>
        <button onClick={() => { setSuccess(false); setAmount(''); setCustom(''); }} className="btn-secondary mt-6 text-sm px-5 py-2">
          Donate Again
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Amount Presets */}
      <div>
        <label className="block text-xs text-neutral-500 font-medium mb-2.5">Select Amount (PKR)</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_AMOUNTS.map((amt) => (
            <button type="button" key={amt} onClick={() => { setAmount(amt); setCustom(''); }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                amount === amt
                  ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/20'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-primary-500/40'
              }`}>
              {amt.toLocaleString()}
            </button>
          ))}
          <button type="button" onClick={() => setAmount('custom')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
              amount === 'custom'
                ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/20'
                : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-primary-500/40'
            }`}>
            Custom
          </button>
        </div>
        {amount === 'custom' && (
          <input type="number" value={customAmount} onChange={(e) => setCustom(e.target.value)}
            placeholder="Enter amount" className="input-field text-sm mt-3" min="1" />
        )}
      </div>

      {/* Payment Method */}
      <div>
        <label className="block text-xs text-neutral-500 font-medium mb-2.5">Payment Method</label>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button type="button" key={m.value} onClick={() => setMethod(m.value)}
              className={`flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm transition-all border ${
                method === m.value
                  ? 'bg-primary-500/10 border-primary-500 text-white'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600'
              }`}>
              <span className="text-lg">{m.icon}</span>
              <span className="font-medium">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Donor Info */}
      <div className="border-t border-neutral-800 pt-5">
        <label className="block text-xs text-neutral-500 font-medium mb-3 uppercase tracking-wider">Your Details</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <input type="text" name="name" value={form.name} onChange={handleChange} required
              placeholder="Full Name *" className="input-field text-sm" />
          </div>
          <div>
            <input type="tel" name="phone" value={form.phone} onChange={handleChange}
              placeholder="Phone Number" className="input-field text-sm" />
          </div>
        </div>
        <input type="email" name="email" value={form.email} onChange={handleChange} required
          placeholder="Email Address *" className="input-field text-sm mt-3" />
        <textarea name="message" value={form.message} onChange={handleChange} rows={2}
          placeholder="Any message for the team? (optional)" className="input-field text-sm mt-3 resize-none" />
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button type="submit" disabled={loading} className="btn-accent w-full justify-center text-sm">
        {loading ? <Spinner size="sm" /> : `💝 Donate ${finalAmount ? `PKR ${finalAmount.toLocaleString()}` : ''}`}
      </button>
      <p className="text-neutral-600 text-xs text-center">All donations are used directly for healthcare, education & welfare programs.</p>
    </form>
  );
}
