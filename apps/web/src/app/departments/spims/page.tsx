'use client';

import React from 'react';
import Link from 'next/link';
import { 
  GraduationCap, BookOpen, Users, Receipt, 
  ShieldCheck, ArrowRight, CheckCircle2,
  Calendar, Award, Building2
} from 'lucide-react';

export default function SpimsPortalLanding() {
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-100">
            <GraduationCap size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 leading-none">SPIMS</h1>
            <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mt-0.5">College Portal</p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">Features</Link>
          <Link href="#about" className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">About</Link>
          <Link href="/departments/spims/login" className="bg-gray-900 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200">
            Portal Login
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-16 pb-24 text-center md:text-left">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 rounded-full border border-teal-100 animate-bounce-subtle">
              <ShieldCheck size={16} className="text-teal-600" />
              <span className="text-xs font-black text-teal-700 uppercase tracking-widest">Official Management System</span>
            </div>
            
            <h2 className="text-5xl md:text-7xl font-black text-gray-900 leading-[1.1] tracking-tight">
              South Punjab Institute of <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600">Health Sciences</span>
            </h2>
            
            <p className="text-lg text-gray-500 font-medium max-w-xl leading-relaxed">
              Experience the next generation of academic management. Effortlessly track enrollment, managed board fees, and monitor student progress in one unified portal.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link href="/departments/spims/login" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-teal-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-teal-700 transition-all shadow-xl shadow-teal-200 hover:-translate-y-1 active:translate-y-0 group">
                Enter Portal <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/departments/spims/setup" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-gray-400 border border-gray-100 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-50 transition-all hover:text-gray-600">
                Setup Station
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center gap-6 pt-4 grayscale opacity-40">
              <div className="flex items-center gap-2">
                <Building2 size={24} />
                <span className="font-bold text-sm">SPIMS Main</span>
              </div>
              <div className="flex items-center gap-2">
                <Award size={24} />
                <span className="font-bold text-sm">Certified</span>
              </div>
            </div>
          </div>

          <div className="relative">
             {/* Decorative Elements */}
             <div className="absolute -top-12 -left-12 w-64 h-64 bg-teal-100 rounded-full blur-3xl opacity-50" />
             <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-emerald-100 rounded-full blur-3xl opacity-50" />
             
             <div className="relative bg-white p-8 rounded-[3rem] shadow-2xl shadow-gray-200 border border-gray-50">
               <div className="space-y-6">
                 <div className="flex items-center justify-between border-b border-gray-50 pb-6">
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-500">
                        <Users size={24} />
                     </div>
                     <div>
                        <p className="font-black text-gray-900 text-sm">Active Students</p>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Real-time Stats</p>
                     </div>
                   </div>
                   <div className="text-2xl font-black text-teal-600">850+</div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl">
                       <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                       <p className="text-sm font-bold text-gray-600">New Enrollment Approved</p>
                       <span className="ml-auto text-[10px] font-black text-gray-400">2m ago</span>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl">
                       <div className="w-2 h-2 rounded-full bg-teal-500" />
                       <p className="text-sm font-bold text-gray-600">Board Fee Sync Complete</p>
                       <span className="ml-auto text-[10px] font-black text-gray-400">1h ago</span>
                    </div>
                 </div>

                 <div className="pt-4">
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                       <div className="h-full bg-teal-500 w-[78%] rounded-full shadow-lg shadow-teal-100" />
                    </div>
                    <div className="flex justify-between mt-2">
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Collection Target</span>
                       <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest">78% Reached</span>
                    </div>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-block px-4 py-1.5 bg-white rounded-full border border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
            Powerful Management
          </div>
          <h3 className="text-3xl md:text-5xl font-black text-gray-900 mb-16 tracking-tight">Everything you need to <span className="text-teal-600">Manage efficiently</span></h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <BookOpen />, title: 'Course Tracking', desc: 'Manage unlimited courses with custom durations and fee structures.' },
              { icon: <Users />, title: 'Student Files', desc: 'Digitized student profiles with academic history and document tracking.' },
              { icon: <Receipt />, title: 'Financial Core', desc: 'Secure cash management with two-step approval for every transaction.' },
              { icon: <Calendar />, title: 'Attendance', desc: 'Faculty and staff attendance tracking with real-time reporting.' },
              { icon: <Award />, title: 'Exam Systems', desc: 'Built-in tracking for board results and internal examination performance.' },
              { icon: <ShieldCheck />, title: 'Secure Access', desc: 'Granular permissions ensure sensitive data is only seen by authorized staff.' },
            ].map((f, i) => (
              <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:shadow-gray-900/5 transition-all group">
                <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 mb-6 group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h4 className="text-lg font-black text-gray-900 mb-3">{f.title}</h4>
                <p className="text-sm font-medium text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white">
                <GraduationCap size={16} />
             </div>
             <span className="font-black text-sm tracking-tight">SPIMS PORTAL <span className="text-teal-600 text-[10px] ml-1">v2.0</span></span>
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">© 2026 KhanHub Advanced Systems. Secured by Advanced Agentic Coding.</p>
        </div>
      </footer>
    </div>
  );
}
