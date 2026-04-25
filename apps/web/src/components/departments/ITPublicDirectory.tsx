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
  Globe, 
  Check, 
  Building, 
  X,
  ChevronRight,
  User,
  Code,
  Laptop
} from 'lucide-react';
import Link from 'next/link';
import { 
  fetchPublicITInterns, 
  fetchPublicITClients, 
  PublicITIntern, 
  PublicITClient 
} from '@/lib/it/publicData';
import { cn } from '@/lib/utils';

interface Props {
  theme: {
    primary: string;
    secondary: string;
    light: string;
  };
  previewMode?: boolean;
}

export default function ITPublicDirectory({ theme, previewMode = false }: Props) {
  const [view, setView] = useState<'interns' | 'partners'>('interns');
  const [interns, setInterns] = useState<PublicITIntern[]>([]);
  const [partners, setPartners] = useState<PublicITClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<PublicITIntern | PublicITClient | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');

  useEffect(() => {
    async function loadData() {
      try {
        const [i, p] = await Promise.all([
          fetchPublicITInterns(),
          fetchPublicITClients()
        ]);
        setInterns(i);
        setPartners(p);
      } catch (error) {
        console.error('Error loading IT directory data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const allCourses = Array.from(new Set(interns.map(i => i.course))).sort();

  const filteredInterns = interns.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          i.course.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = selectedCourse === 'all' || i.course === selectedCourse;
    return matchesSearch && matchesCourse;
  });

  const filteredPartners = partners.filter(p => {
    const matchesSearch = p.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.industry?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const displayInterns = previewMode ? filteredInterns.slice(0, 4) : filteredInterns;
  const displayPartners = previewMode ? filteredPartners.slice(0, 4) : filteredPartners;

  const handleContact = (item: PublicITIntern | PublicITClient, type: 'intern' | 'partner') => {
    const phone = '923006395220';
    const name = type === 'intern' ? (item as PublicITIntern).name : (item as PublicITClient).companyName;
    const id = item.id.slice(-6).toUpperCase();
    const message = `I am interested in ${type === 'intern' ? 'the IT Intern' : 'partnering with'} ${name} (ID: ${id}).`;
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2" style={{ borderColor: theme.primary }}></div>
        <p className="text-neutral-500 font-medium italic">Loading IT Directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 py-12 border-t border-neutral-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="max-w-xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 font-display mb-4">
            Tech Talent & Partners
          </h2>
          <p className="text-neutral-600 text-lg">
            Discover our skilled IT interns and technology partners driving innovation.
          </p>
        </div>

        <div className="flex p-1 bg-neutral-100 rounded-2xl w-fit">
          <button
            onClick={() => setView('interns')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all",
              view === 'interns' ? "bg-white shadow-md text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
            )}
            style={view === 'interns' ? { color: theme.primary } : {}}
          >
            <Laptop className="w-4 h-4" />
            IT Interns
          </button>
          <button
            onClick={() => setView('partners')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all",
              view === 'partners' ? "bg-white shadow-md text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
            )}
            style={view === 'partners' ? { color: theme.primary } : {}}
          >
            <Building className="w-4 h-4" />
            Tech Partners
          </button>
        </div>
      </div>

      {/* Filters */}
      {!previewMode && (
        <div className="bg-white p-4 rounded-3xl border-2 border-neutral-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder={view === 'interns' ? "Search by name or course..." : "Search by company name..."}
              className="w-full pl-12 pr-4 py-3 bg-neutral-50 rounded-2xl focus:outline-none focus:ring-2 border-transparent border-2 focus:border-neutral-200 transition-all"
              style={{ '--tw-ring-color': theme.primary } as any}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {view === 'interns' && (
            <div className="relative w-full md:w-64">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
              <select
                className="w-full pl-10 pr-4 py-3 bg-neutral-50 rounded-2xl appearance-none focus:outline-none focus:ring-2 font-bold text-[10px] uppercase tracking-widest text-neutral-600 border border-neutral-100"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                <option value="all">All Courses</option>
                {allCourses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {view === 'interns' ? (
          displayInterns.map(intern => (
            <div 
              key={intern.id}
              onClick={() => setSelectedProfile(intern)}
              className="group bg-white rounded-[2.5rem] border border-neutral-100 overflow-hidden hover:shadow-2xl transition-all duration-500 cursor-pointer"
            >
              <div className="relative aspect-square bg-neutral-100">
                {intern.photoUrl ? (
                  <Image src={intern.photoUrl} alt={intern.name} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-300">
                    <User size={80} strokeWidth={1} />
                  </div>
                )}
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-neutral-900 border border-white/50">
                  {intern.course}
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-black text-neutral-900 mb-4">{intern.name}</h3>
                <div className="flex flex-wrap gap-2 mb-6">
                  {intern.skills?.slice(0, 3).map(skill => (
                    <span key={skill} className="px-3 py-1 bg-neutral-50 text-neutral-600 text-[10px] font-bold rounded-lg border border-neutral-100">
                      {skill}
                    </span>
                  ))}
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleContact(intern, 'intern'); }}
                  className="w-full py-3 rounded-2xl bg-neutral-900 text-white text-xs font-black uppercase tracking-widest hover:bg-black transition-all"
                >
                  Hire Intern
                </button>
              </div>
            </div>
          ))
        ) : (
          displayPartners.map(partner => (
            <div 
              key={partner.id}
              onClick={() => setSelectedProfile(partner)}
              className="group bg-white rounded-[2.5rem] border border-neutral-100 overflow-hidden hover:shadow-2xl transition-all duration-500 cursor-pointer"
            >
              <div className="relative h-48 bg-neutral-50 flex items-center justify-center p-8">
                {partner.logoUrl ? (
                  <Image src={partner.logoUrl} alt={partner.companyName} fill className="object-contain p-8 group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl font-black shadow-xl" style={{ backgroundColor: theme.light, color: theme.primary }}>
                    {partner.companyName[0]}
                  </div>
                )}
              </div>
              <div className="p-6">
                <h3 className="text-xl font-black text-neutral-900 mb-2">{partner.companyName}</h3>
                <p className="text-sm text-neutral-500 mb-6 line-clamp-2">{partner.description || partner.industry}</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleContact(partner, 'partner'); }}
                  className="w-full py-3 rounded-2xl bg-neutral-900 text-white text-xs font-black uppercase tracking-widest hover:bg-black transition-all"
                >
                  Partner With Us
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {previewMode && (
        <div className="flex justify-center mt-12">
          <Link
            href="/departments/it/directory"
            className="flex items-center gap-3 px-8 py-4 rounded-full bg-neutral-900 text-white font-bold hover:bg-black transition-all group"
          >
            Explore Full Directory
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      )}

      {/* Modal Profile - Simplified for IT */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedProfile(null)}>
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl relative p-8" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedProfile(null)} className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 transition-colors">
              <X size={24} />
            </button>
            
            <div className="flex items-center gap-6 mb-8">
              <div className="relative w-24 h-24 rounded-2xl bg-neutral-100 overflow-hidden flex-shrink-0">
                {'name' in selectedProfile ? (
                  selectedProfile.photoUrl ? <Image src={selectedProfile.photoUrl} alt={selectedProfile.name} fill className="object-cover" /> : <User className="m-auto text-neutral-300" size={40} />
                ) : (
                  selectedProfile.logoUrl ? <Image src={selectedProfile.logoUrl} alt={selectedProfile.companyName} fill className="object-contain p-2" /> : <Building className="m-auto text-neutral-300" size={40} />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-black text-neutral-900">
                  {'name' in selectedProfile ? selectedProfile.name : selectedProfile.companyName}
                </h2>
                <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest">
                  {'name' in selectedProfile ? selectedProfile.course : selectedProfile.industry}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Description</h4>
                <p className="text-neutral-700 leading-relaxed">
                  {'name' in selectedProfile 
                    ? `Our IT Intern enrolled in the ${selectedProfile.course} program. Actively developing professional skills.` 
                    : selectedProfile.description || `A technology partner specialized in ${selectedProfile.industry}.`}
                </p>
              </div>

              {'skills' in selectedProfile && selectedProfile.skills && selectedProfile.skills.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-3">Core Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProfile.skills.map(skill => (
                      <span key={skill} className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg border border-indigo-100">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-10 pt-8 border-t border-neutral-100 flex gap-4">
              <button 
                onClick={() => handleContact(selectedProfile, 'name' in selectedProfile ? 'intern' : 'partner')}
                className="flex-1 py-4 bg-neutral-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all"
              >
                Send Inquiry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
