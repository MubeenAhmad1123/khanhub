'use client';

// src/components/layout/Footer.tsx - PREMIUM GLASSMORPHISM VERSION
// ─────────────────────────────────────────────────────────────────
// Modern glassmorphism footer with light, elegant design
// Features:
// - Frosted glass effect matching navbar aesthetic
// - Subtle gradient backgrounds and animations
// - Smooth hover effects with Lucide React icons
// - Better visual hierarchy
// - Mobile-optimized layout
// - Current content with premium styling
// ─────────────────────────────────────────────────────────────────

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  Mail,
  Phone,
  MapPin,
  Heart,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  MessageCircle,
} from 'lucide-react';
import { SiTiktok, SiWhatsapp } from 'react-icons/si';
import { SITE } from '@/data/site';
import { DEPARTMENTS } from '@/data/departments';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const socialMedia = [
    { platform: 'whatsapp', url: 'https://wa.me/923006395220', icon: SiWhatsapp, label: 'WhatsApp', hoverClass: 'hover:bg-green-50 hover:border-green-400 hover:text-green-600' },
    { platform: 'facebook', url: SITE.social.facebook, icon: Facebook, label: 'Facebook', hoverClass: 'hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600' },
    { platform: 'instagram', url: SITE.social.instagram, icon: Instagram, label: 'Instagram', hoverClass: 'hover:bg-pink-50 hover:border-pink-400 hover:text-pink-600' },
    { platform: 'youtube', url: SITE.social.youtube, icon: Youtube, label: 'YouTube', hoverClass: 'hover:bg-red-50 hover:border-red-400 hover:text-red-600' },
    { platform: 'tiktok', url: SITE.social.tiktok, icon: SiTiktok, label: 'TikTok', hoverClass: 'hover:bg-neutral-100 hover:border-neutral-400 hover:text-black' },
    { platform: 'linkedin', url: SITE.social.linkedin, icon: Linkedin, label: 'LinkedIn', hoverClass: 'hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700' }
  ];

  return (
    <footer className="relative bg-gradient-to-b from-neutral-50 via-white to-neutral-50 border-t border-neutral-200 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary-400 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-success-400 rounded-full blur-3xl" />
      </div>

      {/* ── Main Footer Grid ── */}
      <div className="relative max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16">

          {/* ── Brand & Description ── */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover:shadow-primary-500/50 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                <Image
                  src="/logo.webp"
                  alt={SITE.name}
                  width={48}
                  height={48}
                  className="w-full h-full object-contain rounded-xl"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/0 via-white/20 to-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              <span className="block font-black text-2xl tracking-tighter leading-none text-neutral-900 group-hover:text-primary-600 transition-colors">
                Khan<span className="text-primary-600 group-hover:text-primary-700">Hub</span>
              </span>
            </Link>

            <p className="text-neutral-600 text-sm leading-relaxed max-w-xs">
              Khan Hub is a multi-department welfare organization dedicated to providing healthcare, education, employment, and social services to underprivileged communities across Pakistan.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-success-50/50 border border-success-100 px-4 py-3 rounded-xl backdrop-blur-sm group hover:bg-success-50 transition-colors">
                <span className="text-2xl font-black text-success-600">✓</span>
                <span className="text-base font-bold text-success-800">16+ Active Departments</span>
              </div>
              <div className="flex items-center gap-3 bg-primary-50/50 border border-primary-100 px-4 py-3 rounded-xl backdrop-blur-sm group hover:bg-primary-50 transition-colors">
                <CheckCircle2 className="w-6 h-6 text-primary-600 fill-primary-100" />
                <span className="text-sm font-bold text-primary-800">Registered NGO, Punjab</span>
              </div>
            </div>

            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest pt-4">
              © {currentYear} Khan Hub (Pvt.) Ltd. All rights reserved.
            </p>
          </div>

          {/* ── Organization ── */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-6 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></div>
              <h4 className="font-black text-xs uppercase tracking-widest text-neutral-900">Organization</h4>
            </div>
            <ul className="space-y-4">
              {['Media', 'About Us', 'Certificates', 'Departments'].map((item) => (
                <li key={item} className="flex items-center gap-3 group">
                  <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 group-hover:bg-primary-500 transition-all duration-300 group-hover:scale-125"></div>
                  <Link href={`/${item.toLowerCase().replace(' ', '-')}`} className="text-neutral-600 hover:text-primary-600 text-sm transition-all duration-300 group-hover:translate-x-1">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Services ── */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-6 bg-gradient-to-b from-success-500 to-success-600 rounded-full"></div>
              <h4 className="font-black text-xs uppercase tracking-widest text-neutral-900">Services</h4>
            </div>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 group">
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 group-hover:bg-success-500 transition-all duration-300 group-hover:scale-125"></div>
                <Link href="/donate" className="text-neutral-600 hover:text-success-600 text-sm transition-all duration-300 group-hover:translate-x-1">
                  Donate
                </Link>
              </li>
              <li className="flex items-center gap-3 group">
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 group-hover:bg-success-500 transition-all duration-300 group-hover:scale-125"></div>
                <Link href="/contact" className="text-neutral-600 hover:text-success-600 text-sm transition-all duration-300 group-hover:translate-x-1">
                  Contact
                </Link>
              </li>
              <li className="flex items-center gap-3 group">
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 group-hover:bg-success-500 transition-all duration-300 group-hover:scale-125"></div>
                <Link href="/emergency" className="text-neutral-600 hover:text-success-600 text-sm transition-all duration-300 group-hover:translate-x-1">
                  Emergency
                </Link>
              </li>
            </ul>
          </div>

          {/* ── Contact Us ── */}
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></div>
              <h4 className="font-black text-xs uppercase tracking-widest text-neutral-900">Contact Us</h4>
            </div>
            <ul className="space-y-6">
              <li className="flex items-center gap-4 group hover:translate-x-1 transition-transform">
                <div className="relative">
                  <MessageCircle className="w-5 h-5 text-neutral-400 group-hover:text-success-600 transition-colors shrink-0" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-success-500 border-2 border-white rounded-full"></span>
                </div>
                <Link href="/whatsapp" className="text-neutral-600 hover:text-success-600 text-sm transition-colors font-medium">
                  Whatsapp
                </Link>
              </li>
              <li className="flex items-center gap-4 group hover:translate-x-1 transition-transform">
                <Phone className="w-5 h-5 text-neutral-400 group-hover:text-primary-600 transition-colors shrink-0" />
                <a href={`tel:${SITE.phone}`} className="text-neutral-600 text-sm hover:text-primary-600 transition-colors">
                  {SITE.phone}
                </a>
              </li>
              <li className="flex items-center gap-4 group hover:translate-x-1 transition-transform">
                <Mail className="w-5 h-5 text-neutral-400 group-hover:text-primary-600 transition-colors shrink-0" />
                <a href={`mailto:${SITE.email}`} className="text-neutral-600 hover:text-primary-600 transition-colors text-sm truncate">
                  {SITE.email}
                </a>
              </li>
              <li className="flex gap-4 group hover:translate-x-1 transition-transform">
                <MapPin className="w-5 h-5 text-neutral-400 group-hover:text-primary-600 transition-colors shrink-0" />
                <span className="text-neutral-600 group-hover:text-neutral-900 text-sm leading-relaxed transition-colors">
                  Khan Hub (Pvt.) Ltd. Multan Road Peer Muraad Vehari
                </span>
              </li>
            </ul>

            <div className="flex flex-row items-center gap-2 sm:gap-3 pt-2 w-full sm:w-fit">
              {socialMedia.map(({ platform, url, icon: Icon, label, hoverClass }) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`relative w-10 h-10 rounded-xl bg-white border-2 border-neutral-200 flex items-center justify-center text-neutral-500 transition-all duration-300 hover:scale-110 hover:-rotate-3 shadow-sm hover:shadow-md ${hoverClass}`}
                  aria-label={label}
                >
                  <Icon className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-success-500 border-2 border-white rounded-full shadow-sm"></span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom Bar ── */}
        <div className="mt-16 pt-10 border-t border-neutral-200 flex flex-col md:flex-row justify-between items-center gap-6 text-[12px] font-bold text-neutral-500">
          <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
            Built with <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500 animate-pulse" /> for <span className="text-neutral-900">Khan Hub (Pvt.) Ltd.</span> — Empowering Communities Across Pakistan
          </div>
          <div className="flex gap-6">
            <Link href="/privacy-policy" className="hover:text-primary-600 transition-colors hover:underline underline-offset-2">Privacy Policy</Link>
            <Link href="/terms-and-conditions" className="hover:text-primary-600 transition-colors hover:underline underline-offset-2">Terms & Conditions</Link>
          </div>
        </div>
      </div>

      {/* ── Specialized Departments Dropdown ── */}
      <div className="relative bg-white/50 backdrop-blur-sm border-t border-neutral-200">
        <div className="max-w-7xl mx-auto px-6">
          <FooterDropdown title="Our Specialized Departments">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 py-8">
              {DEPARTMENTS.map((dept) => (
                <Link
                  key={dept.slug}
                  href={`/departments/${dept.slug}`}
                  className="group flex items-center gap-3 text-neutral-500 hover:text-primary-600 transition-all bg-white/80 backdrop-blur-sm hover:bg-white p-3 rounded-xl border border-neutral-200/60 hover:border-primary-300 shadow-sm hover:shadow-md hover:scale-105"
                >
                  <span className="w-10 h-10 rounded-lg bg-gradient-to-br from-neutral-50 to-neutral-100 flex items-center justify-center text-xl shadow-inner group-hover:scale-110 group-hover:from-primary-50 group-hover:to-primary-100 transition-all border border-neutral-100 group-hover:border-primary-200">
                    {dept.icon}
                  </span>
                  <span className="text-sm font-bold truncate">
                    {dept.shortName || dept.name}
                  </span>
                </Link>
              ))}
            </div>
          </FooterDropdown>
        </div>
      </div>
    </footer>
  );
}

function FooterDropdown({ title, children }: { title: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between group py-6 transition-all duration-300"
      >
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-8 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></div>
          <h4 className="text-neutral-900 font-black text-xl tracking-tighter transition-colors group-hover:text-primary-600">
            {title}
          </h4>
        </div>
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm border border-neutral-200 group-hover:bg-primary-50 group-hover:border-primary-300 transition-all duration-500 shadow-sm">
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-neutral-600 group-hover:text-primary-600 transition-colors" />
          ) : (
            <ChevronDown className="w-5 h-5 text-neutral-600 group-hover:text-primary-600 transition-colors" />
          )}
        </div>
      </button>

      <div className={`overflow-hidden transition-all duration-700 ease-in-out ${isOpen ? "max-h-[3500px] opacity-100" : "max-h-0 opacity-0"
        }`}>
        {children}
      </div>
    </div>
  );
}
