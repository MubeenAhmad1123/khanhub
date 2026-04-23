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
  Globe,
  Check,
  Building,
  X
} from 'lucide-react';
import Link from 'next/link';
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
  previewMode?: boolean;
}

function getCompleteness(s: PublicJobSeeker) {
  let score = 0;
  if (s.photoUrl) score += 10;
  if (s.skills && s.skills.length > 0) score += s.skills.length * 2;
  if (s.experience) score += 5;
  if (s.education) score += 5;
  if (s.jobInterests && s.jobInterests.length > 0) score += s.jobInterests.length * 2;
  return score;
}

export default function JobCenterPublicDirectory({ theme, previewMode = false }: Props) {
  const [view, setView] = useState<'seekers' | 'companies'>('seekers');
  const [seekers, setSeekers] = useState<PublicJobSeeker[]>([]);
  const [companies, setCompanies] = useState<PublicEmployer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<PublicJobSeeker | PublicEmployer | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('all');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [selectedExp, setSelectedExp] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all'); // all, hired, looking
  const [selectedHiring, setSelectedHiring] = useState('all'); // all, hiring, filled

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
    
    // Experience Filter logic
    let matchesExp = true;
    if (selectedExp !== 'all') {
      const years = parseInt(s.experience || '0');
      if (selectedExp === '<1') matchesExp = years < 1;
      else if (selectedExp === '1-3') matchesExp = years >= 1 && years <= 3;
      else if (selectedExp === '3+') matchesExp = years > 3;
    }

    // Status Filter
    const matchesStatus = selectedStatus === 'all' || 
                         (selectedStatus === 'hired' && s.isEmployed) || 
                         (selectedStatus === 'looking' && !s.isEmployed);

    return matchesSearch && matchesSkill && matchesExp && matchesStatus;
  });

  const filteredCompanies = companies.filter(c => {
    const matchesSearch = c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = selectedIndustry === 'all' || c.industry === selectedIndustry;
    
    // Hiring Status Filter
    const matchesHiring = selectedHiring === 'all' || 
                         (selectedHiring === 'hiring' && (c.openJobsCount || 0) > 0) || 
                         (selectedHiring === 'filled' && (c.openJobsCount || 0) === 0);

    return matchesSearch && matchesIndustry && matchesHiring;
  });

  // Calculate Display Arrays (incorporating preview mode logic)
  const displaySeekers = previewMode 
    ? [...filteredSeekers].sort((a, b) => getCompleteness(b) - getCompleteness(a)).slice(0, 4)
    : filteredSeekers;

  const displayCompanies = previewMode
    ? [...filteredCompanies].slice(0, 4)
    : filteredCompanies;

  const handleContact = (item: PublicJobSeeker | PublicEmployer, type: 'seeker' | 'employer') => {
    const phone = '923006395220';
    const name = type === 'seeker' ? (item as PublicJobSeeker).name : (item as PublicEmployer).companyName;
    const rawId = type === 'seeker' ? (item as PublicJobSeeker).seekerNumber : (item as PublicEmployer).id;
    const id = (rawId && rawId !== 'undefined') ? rawId : `ID-${item.id?.slice(-6).toUpperCase() || 'UNKNOWN'}`;
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
      {!previewMode && (
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

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {view === 'seekers' ? (
            <>
              <div className="relative flex-1 md:w-40">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                <select
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 rounded-2xl appearance-none focus:outline-none focus:ring-2 font-bold text-[10px] uppercase tracking-widest text-neutral-600 border border-neutral-100"
                  value={selectedSkill}
                  onChange={(e) => setSelectedSkill(e.target.value)}
                >
                  <option value="all">Skills (All)</option>
                  {allSkills.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="relative flex-1 md:w-40">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                <select
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 rounded-2xl appearance-none focus:outline-none focus:ring-2 font-bold text-[10px] uppercase tracking-widest text-neutral-600 border border-neutral-100"
                  value={selectedExp}
                  onChange={(e) => setSelectedExp(e.target.value)}
                >
                  <option value="all">Exp (Any)</option>
                  <option value="<1">Entry Level</option>
                  <option value="1-3">1-3 Years</option>
                  <option value="3+">3+ Years</option>
                </select>
              </div>

              <div className="relative flex-1 md:w-40">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                <select
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 rounded-2xl appearance-none focus:outline-none focus:ring-2 font-bold text-[10px] uppercase tracking-widest text-neutral-600 border border-neutral-100"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="all">Status (All)</option>
                  <option value="looking">Available</option>
                  <option value="hired">Placed/Hired</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="relative flex-1 md:w-48">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                <select
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 rounded-2xl appearance-none focus:outline-none focus:ring-2 font-bold text-[10px] uppercase tracking-widest text-neutral-600 border border-neutral-100"
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                >
                  <option value="all">All Industries</option>
                  {allIndustries.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>

              <div className="relative flex-1 md:w-48">
                <Cpu className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                <select
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 rounded-2xl appearance-none focus:outline-none focus:ring-2 font-bold text-[10px] uppercase tracking-widest text-neutral-600 border border-neutral-100"
                  value={selectedHiring}
                  onChange={(e) => setSelectedHiring(e.target.value)}
                >
                  <option value="all">Hiring (All)</option>
                  <option value="hiring">Now Hiring</option>
                  <option value="filled">Fully Staffed</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>
      )}

      {/* ── GRID ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-8">
        {view === 'seekers' ? (
          displaySeekers.map(s => (
            <div 
              key={s.id} 
              onClick={() => setSelectedProfile(s)}
              className="cursor-pointer group bg-white rounded-2xl sm:rounded-[2.5rem] border border-neutral-100 overflow-hidden hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:-translate-y-2 transition-all duration-500 flex flex-col relative"
            >
              {/* ID Badge */}
              <div className="absolute top-4 left-4 z-10 bg-white/70 backdrop-blur-md px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-neutral-900 border border-white/50 shadow-sm flex items-center gap-2">
                <span className="opacity-40">#</span> {s.seekerNumber || `S-${s.id.slice(-4).toUpperCase()}`}
              </div>

              {/* Status Badge */}
              <div className={cn(
                "absolute top-4 right-4 z-10 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-lg transition-transform group-hover:scale-110",
                s.isEmployed 
                  ? "bg-emerald-500 border-emerald-400 text-white" 
                  : "bg-amber-500 border-amber-400 text-white"
              )}>
                {s.isEmployed ? 'Hired / Placed' : 'Actively Looking'}
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
                )}
                
                {/* Overlay Info */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Interests</p>
                  <div className="flex flex-wrap gap-2 mb-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-100">
                    {s.jobInterests.slice(0, 3).map(interest => (
                      <span key={interest} className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold rounded-lg border border-white/10">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-7 flex-1 flex flex-col bg-gradient-to-b from-white to-neutral-50/50">
                <div className="mb-4">
                  <h3 className="text-lg sm:text-2xl font-black text-neutral-900 mb-1 leading-tight tracking-tight flex items-center gap-1.5 sm:gap-2 line-clamp-1">
                    {s.name}
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-500 flex items-center justify-center shadow-sm flex-shrink-0">
                      <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" strokeWidth={4} />
                    </div>
                  </h3>
                  <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-wide">
                    <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-500 flex-shrink-0" style={{ color: theme.primary }} />
                    <span className="truncate">{s.education}</span>
                  </div>
                </div>

                <div className="space-y-4 sm:space-y-5 mb-6 sm:mb-8 flex-1">
                  <div>
                    <span className="text-[8px] sm:text-[10px] font-black uppercase text-neutral-300 tracking-[0.2em] block mb-2 sm:mb-3">Skills</span>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {s.skills.slice(0, 3).map(skill => (
                        <span key={skill} className="px-2 py-1 sm:px-3 sm:py-1.5 bg-white text-neutral-600 text-[9px] sm:text-[10px] font-black rounded-lg sm:rounded-xl border border-neutral-100 shadow-sm group-hover:border-primary-100 transition-colors">
                          {skill}
                        </span>
                      ))}
                      {s.skills.length > 3 && (
                        <span className="px-2 py-1 sm:px-3 sm:py-1.5 bg-neutral-100 text-neutral-400 text-[9px] sm:text-[10px] font-black rounded-lg sm:rounded-xl">
                          +{s.skills.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {s.experience && (
                    <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl border transition-all duration-300 bg-neutral-100 border-neutral-200 group-hover:bg-white group-hover:border-primary-100">
                      <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                        <Briefcase size={14} className="text-primary-500 sm:w-4 sm:h-4" style={{ color: theme.primary }} />
                        <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.1em] text-neutral-400">Experience</span>
                      </div>
                      <div className="text-[10px] sm:text-xs text-neutral-700 font-bold leading-relaxed line-clamp-2">
                        {/^\d+$/.test(s.experience) ? (
                          <span className="text-xs sm:text-sm font-black text-neutral-900">
                             {s.experience} Years Exp
                          </span>
                        ) : (
                          <span className="italic text-neutral-600">&ldquo;{s.experience}&rdquo;</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleContact(s, 'seeker');
                  }}
                  className="mt-auto w-full flex items-center justify-center gap-2 sm:gap-3 py-3 sm:py-4.5 rounded-xl sm:rounded-[1.5rem] bg-neutral-900 text-white text-[10px] sm:text-sm font-black uppercase tracking-widest hover:bg-black hover:shadow-2xl hover:shadow-neutral-400/30 active:scale-95 transition-all duration-300"
                >
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-400" />
                  Contact
                </button>
              </div>
            </div>
          ))
        ) : (
          displayCompanies.map(c => (
            <div 
              key={c.id} 
              onClick={() => setSelectedProfile(c)}
              className="cursor-pointer group bg-white rounded-2xl sm:rounded-[2.5rem] border border-neutral-100 overflow-hidden hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:-translate-y-2 transition-all duration-500 flex flex-col"
            >
              <div className="relative h-40 sm:h-56 w-full bg-neutral-50 flex items-center justify-center p-8 sm:p-12 transition-colors group-hover:bg-white">
                {/* Hiring Status Badge */}
                <div className={cn(
                  "absolute top-3 right-3 sm:top-4 sm:right-4 z-10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest border shadow-lg",
                  (c.openJobsCount || 0) > 0 
                    ? "bg-indigo-500 border-indigo-400 text-white" 
                    : "bg-zinc-100 border-zinc-200 text-zinc-400"
                )}>
                  {(c.openJobsCount || 0) > 0 ? `Hiring (${c.openJobsCount})` : 'Fully Staffed'}
                </div>

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
                    className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl flex items-center justify-center text-2xl sm:text-4xl font-black shadow-2xl transition-transform duration-700 group-hover:rotate-12"
                    style={{ backgroundColor: theme.light, color: theme.primary }}
                  >
                    {c.companyName[0]}
                  </div>
                )}
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-neutral-100/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <div className="p-4 sm:p-8 flex-1 flex flex-col bg-gradient-to-b from-white to-neutral-50/50">
                <div className="mb-4 sm:mb-6">
                  <div className="flex items-center gap-2 mb-2 sm:mb-3">
                    <span className="px-2 py-1 sm:px-3 sm:py-1 bg-primary-50 text-primary-600 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.1em] rounded-full border border-primary-100/50 line-clamp-1" style={{ backgroundColor: `${theme.primary}10`, color: theme.primary, borderColor: `${theme.primary}20` }}>
                      {c.industry}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-2xl font-black text-neutral-900 leading-tight flex items-center gap-1.5 sm:gap-2 line-clamp-1">
                    {c.companyName}
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-500 flex items-center justify-center shadow-sm flex-shrink-0">
                      <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" strokeWidth={4} />
                    </div>
                  </h3>
                </div>
                
                <p className="text-xs sm:text-sm font-medium text-neutral-500 line-clamp-2 sm:line-clamp-3 mb-6 sm:mb-8 leading-relaxed">
                  {c.description || `${c.companyName} is a leading partner in the ${c.industry} sector, committed to excellence and professional growth.`}
                </p>

                <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-6 sm:mb-8 mt-auto">
                    <div className="flex flex-col gap-1 p-2 sm:p-3 bg-white rounded-xl sm:rounded-2xl border border-neutral-100 shadow-sm">
                        <span className="text-[8px] sm:text-[9px] font-black text-neutral-300 uppercase tracking-widest">Size</span>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold text-neutral-700 truncate">
                          <Users size={12} className="text-neutral-400 flex-shrink-0" />
                          <span className="truncate">{c.companySize || 'N/A'}</span>
                        </div>
                    </div>
                    {c.website ? (
                      <div className="flex flex-col gap-1 p-2 sm:p-3 bg-white rounded-xl sm:rounded-2xl border border-neutral-100 shadow-sm">
                        <span className="text-[8px] sm:text-[9px] font-black text-neutral-300 uppercase tracking-widest">Web</span>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold text-neutral-700 min-w-0">
                          <Globe size={12} className="text-neutral-400 flex-shrink-0" />
                          <span className="truncate">{c.website.replace(/^https?:\/\//, '')}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 p-2 sm:p-3 bg-white rounded-xl sm:rounded-2xl border border-neutral-100 shadow-sm opacity-50">
                        <span className="text-[8px] sm:text-[9px] font-black text-neutral-300 uppercase tracking-widest">Web</span>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold text-neutral-700">
                           —
                        </div>
                      </div>
                    )}
                </div>

                <button
                  onClick={() => handleContact(c, 'employer')}
                  className="w-full flex items-center justify-center gap-2 sm:gap-3 py-3 sm:py-4.5 rounded-xl sm:rounded-[1.5rem] bg-neutral-900 text-white text-[10px] sm:text-sm font-black uppercase tracking-widest hover:bg-black hover:shadow-2xl hover:shadow-neutral-400/30 active:scale-95 transition-all duration-300"
                >
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-400" />
                  Connect
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── EMPTY STATE ── */}
      {((view === 'seekers' && displaySeekers.length === 0) || (view === 'companies' && displayCompanies.length === 0)) && (
        <div className="text-center py-20 bg-neutral-50 rounded-3xl border-2 border-dashed border-neutral-200">
          <div className="w-16 h-16 bg-neutral-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-xl font-bold text-neutral-900">No results found</h3>
          <p className="text-neutral-500">Try adjusting your search or filters.</p>
        </div>
      )}

      {/* ── PREVIEW MODE SEE ALL BUTTON ── */}
      {previewMode && (
        <div className="flex justify-center mt-12">
          <Link
            href="/departments/job-placement/directory"
            className="flex items-center gap-3 px-8 py-4 rounded-full bg-neutral-900 text-white font-bold hover:bg-black hover:shadow-xl hover:scale-105 transition-all group"
          >
            See All {view === 'seekers' ? 'Candidates' : 'Companies'}
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      )}

      {/* ── PROFILE MODAL ── */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedProfile(null)}>
          <div 
            className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedProfile(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/5 hover:bg-black/10 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-neutral-600" />
            </button>

            <div className="p-8 sm:p-12">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 mb-8 text-center sm:text-left">
                <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-[2rem] bg-neutral-100 overflow-hidden shadow-lg flex-shrink-0">
                  {'name' in selectedProfile ? (
                    selectedProfile.photoUrl ? (
                      <Image
                        src={selectedProfile.photoUrl}
                        alt={selectedProfile.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-neutral-300">
                        <User size={64} strokeWidth={1} />
                      </div>
                    )
                  ) : (
                    selectedProfile.logoUrl ? (
                      <Image
                        src={selectedProfile.logoUrl}
                        alt={selectedProfile.companyName}
                        fill
                        className="object-contain p-4"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-neutral-300">
                        <Building size={64} strokeWidth={1} />
                      </div>
                    )
                  )}
                </div>
                
                <div className="flex-1 mt-2">
                  <div className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-black uppercase tracking-widest rounded-full mb-4">
                    {'name' in selectedProfile ? (
                      selectedProfile.isEmployed ? 'Placed / Hired' : 'Actively Looking'
                    ) : (
                      `${selectedProfile.openJobsCount} Open Positions`
                    )}
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 mb-2">
                    {'name' in selectedProfile ? selectedProfile.name : selectedProfile.companyName}
                  </h2>
                  <div className="flex items-center justify-center sm:justify-start gap-3 text-sm font-bold text-neutral-500 uppercase tracking-widest mb-4">
                    <span className="flex items-center gap-1.5">
                      {'name' in selectedProfile ? (
                        <>
                          <GraduationCap size={16} style={{ color: theme.primary }} /> 
                          {selectedProfile.education}
                        </>
                      ) : (
                        <>
                          <Briefcase size={16} style={{ color: theme.primary }} /> 
                          {selectedProfile.industry}
                        </>
                      )}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-neutral-500">
                    <span className="font-bold text-neutral-900">ID:</span> {'name' in selectedProfile ? (selectedProfile.seekerNumber || `S-${selectedProfile.id.slice(-4).toUpperCase()}`) : `C-${selectedProfile.id.slice(-4).toUpperCase()}`}
                  </div>
                </div>
              </div>

              <hr className="border-neutral-100 mb-8" />

              <div className="space-y-8">
                {'name' in selectedProfile ? (
                  <>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
                        <Briefcase className="w-5 h-5" style={{ color: theme.primary }} />
                        Experience & Availability
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                          <p className="text-xs font-bold text-neutral-400 uppercase mb-1">Experience</p>
                          <p className="font-bold text-neutral-900">{selectedProfile.experience || 'Not specified'}</p>
                        </div>
                        <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                          <p className="text-xs font-bold text-neutral-400 uppercase mb-1">Availability</p>
                          <p className="font-bold text-neutral-900">{selectedProfile.availability || 'Not specified'}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
                        <Cpu className="w-5 h-5" style={{ color: theme.primary }} />
                        Professional Skills
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedProfile.skills.map(skill => (
                          <span key={skill} className="px-4 py-2 bg-neutral-100 text-neutral-700 text-xs font-black rounded-xl">
                            {skill}
                          </span>
                        ))}
                        {(!selectedProfile.skills || selectedProfile.skills.length === 0) && (
                          <span className="text-neutral-400 italic">No skills listed</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
                        <Search className="w-5 h-5" style={{ color: theme.primary }} />
                        Job Interests
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedProfile.jobInterests.map(interest => (
                          <span key={interest} className="px-4 py-2 border-2 border-neutral-100 text-neutral-600 text-xs font-bold rounded-xl">
                            {interest}
                          </span>
                        ))}
                        {(!selectedProfile.jobInterests || selectedProfile.jobInterests.length === 0) && (
                          <span className="text-neutral-400 italic">No interests listed</span>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
                        <Building className="w-5 h-5" style={{ color: theme.primary }} />
                        About Company
                      </h4>
                      <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-100">
                        <p className="text-neutral-700 leading-relaxed">
                          {selectedProfile.description || "No description provided."}
                        </p>
                        <div className="mt-6 flex flex-wrap gap-6">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Industry</p>
                            <p className="font-bold text-neutral-900">{selectedProfile.industry}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Size</p>
                            <p className="font-bold text-neutral-900">{selectedProfile.companySize || "N/A"}</p>
                          </div>
                          {selectedProfile.website && (
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Website</p>
                              <a href={selectedProfile.website} target="_blank" rel="noopener noreferrer" className="font-bold text-primary-600 hover:underline flex items-center gap-1">
                                {selectedProfile.website.replace(/^https?:\/\//, '')}
                                <ExternalLink size={12} />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5" style={{ color: theme.primary }} />
                        Contact Person
                      </h4>
                      <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-100">
                        <p className="font-black text-lg text-neutral-900">{selectedProfile.contactPerson.name}</p>
                        <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest">{selectedProfile.contactPerson.position || "Representative"}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-10 pt-8 border-t border-neutral-100 flex justify-end gap-4">
                <button
                  onClick={() => setSelectedProfile(null)}
                  className="px-6 py-3 rounded-xl font-bold text-neutral-500 hover:bg-neutral-100 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleContact(selectedProfile, 'name' in selectedProfile ? 'seeker' : 'employer')}
                  className="px-8 py-3 rounded-xl bg-neutral-900 text-white font-black uppercase tracking-widest hover:bg-black transition-colors flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Contact Admin for Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
