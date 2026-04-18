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
  User
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
    const id = type === 'seeker' ? (item as PublicJobSeeker).seekerNumber : (item as PublicEmployer).id;
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
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {view === 'seekers' ? (
          filteredSeekers.map(s => (
            <div 
              key={s.id} 
              className="group bg-white rounded-3xl border-2 border-neutral-100 overflow-hidden hover:shadow-2xl hover:border-transparent transition-all duration-500 flex flex-col"
            >
              <div className="relative aspect-square w-full bg-neutral-100 overflow-hidden">
                {s.photoUrl ? (
                  <Image
                    src={s.photoUrl}
                    alt={s.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-neutral-300">
                    <User size={80} strokeWidth={1} />
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                  {s.seekerNumber}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-neutral-900 mb-1 group-hover:text-primary-600 transition-colors">
                  {s.name}
                </h3>
                <div className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
                  <GraduationCap className="w-4 h-4" />
                  <span className="truncate">{s.education}</span>
                </div>

                <div className="space-y-3 mb-6">
                  <div>
                    <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest block mb-2">Key Skills</span>
                    <div className="flex flex-wrap gap-1.5">
                      {s.skills.slice(0, 3).map(skill => (
                        <span key={skill} className="px-2 py-1 bg-neutral-50 text-neutral-600 text-[10px] font-bold rounded-lg border border-neutral-100">
                          {skill}
                        </span>
                      ))}
                      {s.skills.length > 3 && (
                        <span className="px-2 py-1 bg-neutral-50 text-neutral-400 text-[10px] font-bold rounded-lg">
                          +{s.skills.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {s.experience && (
                    <div className="text-xs text-neutral-600 line-clamp-2 italic">
                      &ldquo;{s.experience}&rdquo;
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleContact(s, 'seeker')}
                  className="mt-auto w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-neutral-900 text-white font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-xl hover:shadow-neutral-400/30"
                >
                  <MessageSquare className="w-4 h-4" />
                  Contact Admin
                </button>
              </div>
            </div>
          ))
        ) : (
          filteredCompanies.map(c => (
            <div 
              key={c.id} 
              className="group bg-white rounded-3xl border-2 border-neutral-100 overflow-hidden hover:shadow-2xl hover:border-transparent transition-all duration-500 flex flex-col"
            >
              <div className="relative h-48 w-full bg-neutral-50 flex items-center justify-center p-8">
                {c.logoUrl ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={c.logoUrl}
                      alt={c.companyName}
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div 
                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg"
                    style={{ backgroundColor: theme.light, color: theme.primary }}
                  >
                    {c.companyName[0]}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-sky-50 text-sky-600 text-[10px] font-black uppercase tracking-widest rounded-md border border-sky-100">
                    {c.industry}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-3">
                  {c.companyName}
                </h3>
                
                <p className="text-sm text-neutral-600 line-clamp-3 mb-6 leading-relaxed">
                  {c.description || `${c.companyName} is a partner company in the ${c.industry} industry.`}
                </p>

                <div className="space-y-3 mb-6 mt-auto">
                    <div className="flex items-center gap-3 text-sm text-neutral-500">
                        <Users className="w-4 h-4" />
                        <span>Size: {c.companySize || 'N/A'}</span>
                    </div>
                    {c.website && (
                        <div className="flex items-center gap-3 text-sm text-neutral-500">
                            <ExternalLink className="w-4 h-4" />
                            <span className="truncate">{c.website.replace(/^https?:\/\//, '')}</span>
                        </div>
                    )}
                </div>

                <button
                  onClick={() => handleContact(c, 'employer')}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold bg-neutral-900 text-white hover:scale-[1.02] active:scale-95 transition-all shadow-xl hover:shadow-neutral-400/30"
                >
                  <MessageSquare className="w-4 h-4" />
                  Connect
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
