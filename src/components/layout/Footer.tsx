'use client';
// src/components/layout/Footer.tsx

import Link from 'next/link';
import { SITE, FOOTER_LINKS } from '@/data/site';

export default function Footer() {
  return (
    <footer className="bg-neutral-950 border-t border-neutral-800">
      {/* ── Emergency Banner ── */}
      <div className="bg-red-600/10 border-b border-red-500/20 py-3 px-4 text-center">
        <p className="text-red-400 text-sm font-medium">
          🚨 Emergency Helpline: <a href={`tel:${SITE.emergency.replace(/\D/g,'')}`} className="text-red-300 font-bold hover:text-red-200 transition-colors">{SITE.emergency}</a>
          <span className="text-red-500 mx-2">|</span>
          <span className="text-red-500 text-xs">Available 24/7</span>
        </p>
      </div>

      {/* ── Main Footer ── */}
      <div className="max-w-6xl mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

        {/* Brand */}
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <span className="text-white font-display font-bold text-sm">KH</span>
            </div>
            <span className="font-display font-bold text-lg text-white">Khan<span className="text-primary-400">Hub</span></span>
          </div>
          <p className="text-neutral-500 text-sm leading-relaxed mb-4">{SITE.description}</p>
          <p className="text-neutral-600 text-xs">© {new Date().getFullYear()} {SITE.fullName}. All rights reserved.</p>
        </div>

        {/* Organization Links */}
        <div>
          <h4 className="font-display font-semibold text-white text-sm uppercase tracking-wider mb-4">Organization</h4>
          <ul className="flex flex-col gap-2.5">
            {FOOTER_LINKS.organization.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="text-neutral-500 hover:text-primary-400 text-sm transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Services Links */}
        <div>
          <h4 className="font-display font-semibold text-white text-sm uppercase tracking-wider mb-4">Services</h4>
          <ul className="flex flex-col gap-2.5">
            {FOOTER_LINKS.services.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="text-neutral-500 hover:text-primary-400 text-sm transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-display font-semibold text-white text-sm uppercase tracking-wider mb-4">Contact Us</h4>
          <ul className="flex flex-col gap-3">
            <li className="flex items-start gap-2.5">
              <span className="text-neutral-600 mt-0.5">📍</span>
              <span className="text-neutral-500 text-sm">{SITE.address}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-neutral-600 mt-0.5">📞</span>
              <a href={`tel:${SITE.phone.replace(/\D/g,'')}`} className="text-neutral-500 hover:text-primary-400 text-sm transition-colors">{SITE.phone}</a>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-neutral-600 mt-0.5">📧</span>
              <a href={`mailto:${SITE.email}`} className="text-neutral-500 hover:text-primary-400 text-sm transition-colors">{SITE.email}</a>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-neutral-600 mt-0.5">💬</span>
              <a href={`https://wa.me/${SITE.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-primary-400 text-sm transition-colors">WhatsApp Us</a>
            </li>
          </ul>

          {/* Social */}
          <div className="flex items-center gap-3 mt-6">
            {Object.entries(SITE.social).map(([platform, url]) => (
              <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-primary-500/20 border border-neutral-700 hover:border-primary-500/40 flex items-center justify-center text-neutral-500 hover:text-primary-400 transition-all text-xs">
                {platform === 'facebook'  ? 'f' :
                 platform === 'twitter'   ? 'X' :
                 platform === 'instagram' ? 'ig':
                 platform === 'youtube'   ? 'yt':
                 platform === 'linkedin' ? 'in': '?'}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="border-t border-neutral-800 py-4 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-neutral-600 text-xs">
            {SITE.fullName} — Registered NGO, Punjab, Pakistan
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy-policy" className="text-neutral-600 hover:text-neutral-400 text-xs transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-neutral-600 hover:text-neutral-400 text-xs transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
