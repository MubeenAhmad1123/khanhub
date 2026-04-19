'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Users, 
  Briefcase, 
  Search, 
  Filter, 
  MessageSquare, 
  GraduationCap, 
  Cpu, 
  MapPin,
  ExternalLink,
  ChevronRight,
  User,
  Globe
} from 'lucide-react';
import { 
  fetchPublicSeekers, 
  fetchPublicEmployers, 
  PublicJobSeeker, 
  PublicEmployer 
} from '@/lib/job-center/publicData';
import { cn } from '@/lib/utils';

interface Props {
  theme: {
    primary: string;
    secondary: string;
    light: string;
  };
}

export default function JobCenterPublicDirectory({ theme }: Props) {
  const [view, setView] = useState<'seekers' | 'companies'>('seekers');
  const [seekers, setSeekers] = useState<PublicJobSeeker[]>([]);
  const [companies, setCompanies] = useState<PublicEmployer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('all');
  const [selectedIndustry, setSelectedIndustry] = useState('all');

  useEffect(() => {
    async function loadData() {
      try {
        const [s, c] = await Promise.all([
          fetchPublicSeekers(),
          fetchPublicEmployers()
        ]);
        setSeekers(s);
        setCompanies(c);
      } catch (error) {
        console.error('Error loading directory data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const allSkills = Array.from(new Set(seekers.flatMap(s => s.skills || []))).sort();
  const allIndustries = Array.from(new Set(companies.map(c => c.industry))).sort();

  const filteredSeekers = seekers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.jobInterests.some(i => i.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSkill = selectedSkill === 'all' || s.skills.includes(selectedSkill);
    return matchesSearch && matchesSkill;
  });

  const filteredCompanies = companies.filter(c => {
    const matchesSearch = c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = selectedIndustry === 'all' || c.industry === selectedIndustry;
    return matchesSearch && matchesIndustry;
  });

  const handleContact = (item: PublicJobSeeker | PublicEmployer, type: 'seeker' | 'employer') => {
    const phone = '923006395220';
    const name = type === 'seeker' ? (item as PublicJobSeeker).name : (item as PublicEmployer).companyName;
    const rawId = type === 'seeker' ? (item as PublicJobSeeker).seekerNumber : (item as PublicEmployer).id;
    const id = rawId || `ID-${item.id.slice(-6).toUpperCase()}`;
    const url = window.location.href;
    
    const message = `I want to see the contact information for ${name} (ID: ${id}). Page: ${url}`;
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2" style={{ borderColor: theme.primary }}></div>
        <p className="text-neutral-500 font-medium italic">Loading Directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 py-12 border-t border-neutral-100">
      {/* ── HEADER & TABS ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="max-w-xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 font-display mb-4">
            Talent & Partner Directory
          </h2>
          <p className="text-neutral-600 text-lg">
            Browse our verified job seekers and partner employers. Contact us to facilitate professional connections.
          </p>
        </div>

        <div className="flex p-1 bg-neutral-100 rounded-2xl w-fit">
          <button
            onClick={() => setView('seekers')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all",
              view === 'seekers' ? "bg-white shadow-md text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
            )}
            style={view === 'seekers' ? { color: theme.primary } : {}}
          >
            <Users className="w-4 h-4" />
            Job Seekers
          </button>
          <button
            onClick={() => setView('companies')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all",
              view === 'companies' ? "bg-white shadow-md text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
            )}
            style={view === 'companies' ? { color: theme.primary } : {}}
          >
            <Briefcase className="w-4 h-4" />
            Companies
          </button>
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div className="bg-white p-4 rounded-3xl border-2 border-neutral-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder={view === 'seekers' ? "Search by name or skills..." : "Search by company name..."}
            className="w-full pl-12 pr-4 py-3 bg-neutral-50 rounded-2xl focus:outline-none focus:ring-2 border-transparent border-2 focus:border-neutral-200 transition-all"
            style={{ '--tw-ring-color': theme.primary } as React.CSSProperties}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          {view === 'seekers' ? (
            <div className="relative w-full md:w-48">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <select
                className="w-full pl-10 pr-4 py-3 bg-neutral-50 rounded-2xl appearance-none focus:outline-none focus:ring-2 font-medium text-sm text-neutral-700"
                value={selectedSkill}
                onChange={(e) => setSelectedSkill(e.target.value)}
              >
                <option value="all">All Skills</option>
                {allSkills.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          ) : (
            <div className="relative w-full md:w-48">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <select
                className="w-full pl-10 pr-4 py-3 bg-neutral-50 rounded-2xl appearance-none focus:outline-none focus:ring-2 font-medium text-sm text-neutral-700"
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
              >
                <option value="all">All Industries</option>
                {allIndustries.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── GRID ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {view === 'seekers' ? (
          filteredSeekers.map(s => (
            <div 
              key={s.id} 
              className="group bg-white rounded-[2.5rem] border border-neutral-100 overflow-hidden hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:-translate-y-2 transition-all duration-500 flex flex-col relative"
            >
              {/* ID Badge */}
              <div className="absolute top-4 left-4 z-10 bg-white/70 backdrop-blur-md px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-neutral-900 border border-white/50 shadow-sm">
                {s.seekerNumber || `S-${s.id.slice(-4).toUpperCase()}`}
              </div>

              <div className="relative aspect-[4/5] w-full bg-neutral-100 overflow-hidden">
                {s.photoUrl ? (
                  <Image
                    src={s.photoUrl}
                    alt={s.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-neutral-300">
                    <User size={100} strokeWidth={1} />
                  </div>
                )/* Slide-up info overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
                  <div className="flex flex-wrap gap-2 mb-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-100">
                    {s.jobInterests.slice(0, 2).map(interest => (
                      <span key={interest} className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold rounded-full border border-white/20">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-7 flex-1 flex flex-col bg-gradient-to-b from-white to-neutral-50/50">
                <div className="mb-4">
                  <h3 className="text-2xl font-black text-neutral-900 mb-1 leading-tight tracking-tight flex items-center gap-2">
                    {s.name}
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
                      <Check className="w-3 h-3 text-white" strokeWidth={4} />
                    </div>
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wide">
                    <GraduationCap className="w-4 h-4 text-primary-500" style={{ color: theme.primary }} />
                    <span className="truncate">{s.education}</span>
                  </div>
                </div>

                <div className="space-y-5 mb-8">
                  <div>
                    <span className="text-[10px] font-black uppercase text-neutral-300 tracking-[0.2em] block mb-3">Professional Skills</span>
                    <div className="flex flex-wrap gap-2">
                      {s.skills.slice(0, 4).map(skill => (
                        <span key={skill} className="px-3 py-1.5 bg-white text-neutral-600 text-[10px] font-black rounded-xl border border-neutral-100 shadow-sm group-hover:border-primary-100 transition-colors">
                          {skill}
                        </span>
                      ))}
                      {s.skills.length > 4 && (
                        <span className="px-3 py-1.5 bg-neutral-100 text-neutral-400 text-[10px] font-black rounded-xl">
                          +{s.skills.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {s.experience && (
                    <div className="p-4 bg-neutral-100/50 rounded-2xl border border-neutral-100/50 relative overflow-hidden group-hover:bg-white transition-colors">
                      <div className="text-xs text-neutral-700 font-bold leading-relaxed relative z-10">
                        {/^\d+$/.test(s.experience) ? (
                          <span className="flex items-center gap-2 text-primary-600 font-black" style={{ color: theme.primary }}>
                             <Briefcase size={14} /> {s.experience} Years Experience
                          </span>
                        ) : (
                          <span className="italic">&ldquo;{s.experience}&rdquo;</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleContact(s, 'seeker')}
                  className="mt-auto w-full flex items-center justify-center gap-3 py-4.5 rounded-[1.5rem] bg-neutral-900 text-white text-sm font-black uppercase tracking-widest hover:bg-black hover:shadow-2xl hover:shadow-neutral-400/30 active:scale-95 transition-all duration-300"
                >
                  <MessageSquare className="w-5 h-5 text-neutral-400" />
                  Contact Admin
                </button>
              </div>
            </div>
          ))
        ) : (
          filteredCompanies.map(c => (
            <div 
              key={c.id} 
              className="group bg-white rounded-[2.5rem] border border-neutral-100 overflow-hidden hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:-translate-y-2 transition-all duration-500 flex flex-col"
            >
              <div className="relative h-56 w-full bg-neutral-50 flex items-center justify-center p-12 transition-colors group-hover:bg-white">
                {c.logoUrl ? (
                  <div className="relative w-full h-full transition-transform duration-700 group-hover:scale-110">
                    <Image
                      src={c.logoUrl}
                      alt={c.companyName}
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div 
                    className="w-24 h-24 rounded-3xl flex items-center justify-center text-4xl font-black shadow-2xl transition-transform duration-700 group-hover:rotate-12"
                    style={{ backgroundColor: theme.light, color: theme.primary }}
                  >
                    {c.companyName[0]}
                  </div>
                )}
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-neutral-100/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <div className="p-8 flex-1 flex flex-col bg-gradient-to-b from-white to-neutral-50/50">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 bg-primary-50 text-primary-600 text-[10px] font-black uppercase tracking-[0.1em] rounded-full border border-primary-100/50" style={{ backgroundColor: `${theme.primary}10`, color: theme.primary, borderColor: `${theme.primary}20` }}>
                      {c.industry}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-neutral-900 leading-tight flex items-center gap-2">
                    {c.companyName}
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
                      <Check className="w-3 h-3 text-white" strokeWidth={4} />
                    </div>
                  </h3>
                </div>
                
                <p className="text-sm font-medium text-neutral-500 line-clamp-3 mb-8 leading-relaxed">
                  {c.description || `${c.companyName} is a leading partner in the ${c.industry} sector, committed to excellence and professional growth.`}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-8 mt-auto">
                    <div className="flex flex-col gap-1 p-3 bg-white rounded-2xl border border-neutral-100 shadow-sm">
                        <span className="text-[9px] font-black text-neutral-300 uppercase tracking-widest">Company Size</span>
                        <div className="flex items-center gap-2 text-xs font-bold text-neutral-700">
                          <Users size={12} className="text-neutral-400" />
                          {c.companySize || 'N/A'}
                        </div>
                    </div>
                    {c.website && (
                      <div className="flex flex-col gap-1 p-3 bg-white rounded-2xl border border-neutral-100 shadow-sm">
                        <span className="text-[9px] font-black text-neutral-300 uppercase tracking-widest">Website</span>
                        <div className="flex items-center gap-2 text-xs font-bold text-neutral-700 min-w-0">
                          <Globe size={12} className="text-neutral-400 flex-shrink-0" />
                          <span className="truncate">{c.website.replace(/^https?:\/\//, '')}</span>
                        </div>
                      </div>
                    )}
                </div>

                <button
                  onClick={() => handleContact(c, 'employer')}
                  className="w-full flex items-center justify-center gap-3 py-4.5 rounded-[1.5rem] bg-neutral-900 text-white text-sm font-black uppercase tracking-widest hover:bg-black hover:shadow-2xl hover:shadow-neutral-400/30 active:scale-95 transition-all duration-300"
                >
                  <MessageSquare className="w-5 h-5 text-neutral-400" />
                  Request Connection
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── EMPTY STATE ── */}
      {((view === 'seekers' && filteredSeekers.length === 0) || (view === 'companies' && filteredCompanies.length === 0)) && (
        <div className="text-center py-20 bg-neutral-50 rounded-3xl border-2 border-dashed border-neutral-200">
          <div className="w-16 h-16 bg-neutral-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-xl font-bold text-neutral-900">No results found</h3>
          <p className="text-neutral-500">Try adjusting your search or filters.</p>
        </div>
      )}
    </div>
  );
}
