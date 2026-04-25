// src/app/departments/social-media/dashboard/profile/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, Calendar, MapPin, Briefcase, CreditCard, 
  Shield, Edit2, Camera, Star, Award, TrendingUp, Clock, 
  CheckCircle, AlertCircle, Bookmark, Share2, MessageSquare, 
  Zap, Heart, Target, FileText, Settings, LogOut, ChevronRight,
  Bell, Search, Menu, Filter, Download, MoreHorizontal, Layout,
  Smartphone, Monitor, Globe, Instagram, Twitter, Facebook, Youtube,
  FileBarChart, ClipboardCheck, DollarSign, Shirt
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

const glassStyle = {
  background: 'rgba(255, 255, 255, 0.7)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)'
};

const neumorphicOutset = {
  background: '#ffffff',
  boxShadow: '8px 8px 16px #d1d9e6, -8px -8px 16px #ffffff',
  border: '1px solid rgba(255, 255, 255, 0.4)'
};

const neumorphicInset = {
  background: '#f8fafc',
  boxShadow: 'inset 4px 4px 8px #d1d9e6, inset -4px -4px 8px #ffffff',
  border: 'none'
};

export default function SocialMediaProfilePage() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    attendance: 0,
    tasks: 0,
    score: 0,
    fines: 0
  });

  const tabs = [
    { name: 'Special Tasks', icon: <Target size={18} /> },
    { name: 'Attendance', icon: <Calendar size={18} /> },
    { name: 'Finance', icon: <DollarSign size={18} /> },
    { name: 'Dress Code', icon: <Shirt size={18} /> },
    { name: 'Duty Logs', icon: <ClipboardCheck size={18} /> },
    { name: 'Score Analysis', icon: <FileBarChart size={18} /> },
    { name: 'My Profile', icon: <User size={18} /> }
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      const sessionStr = localStorage.getItem('media_session');
      if (!sessionStr) return;
      
      try {
        const session = JSON.parse(sessionStr);
        const userDoc = await getDoc(doc(db, 'media_users', session.uid));
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfile({
            ...data,
            id: userDoc.id,
            displayName: data.displayName || 'Social Media Specialist',
            role: data.role || 'Staff',
            customId: data.customId || 'MEDIA-001',
            email: data.email || 'specialist@khanhub.com',
            phone: data.phone || '+92 300 0000000',
            location: data.location || 'HQ, Lahore',
            joinedAt: data.joinedAt || '2023-01-01',
            monthlySalary: data.monthlySalary || 0
          });

          // Fetch Stats (Mocked or simplified for now)
          setStats({
            attendance: data.attendancePercentage || 94,
            tasks: data.completedTasks || 12,
            score: data.performanceScore || 4.8,
            fines: data.totalFines || 0
          });
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Fetching Profile...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'Special Tasks':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div style={neumorphicOutset} className="p-8 rounded-[2.5rem]">
              <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                <Target className="text-indigo-600" />
                Special Campaigns & Tasks
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: 'Ramadan Campaign', status: 'In Progress', priority: 'High', date: 'April 2024' },
                  { title: 'Public Awareness Reel', status: 'Completed', priority: 'Medium', date: 'March 2024' },
                  { title: 'Website Traffic Boost', status: 'Pending', priority: 'Low', date: 'May 2024' }
                ].map((task, i) => (
                  <div key={i} style={neumorphicInset} className="p-5 rounded-3xl flex items-center justify-between group hover:scale-[1.02] transition-transform">
                    <div>
                      <p className="font-bold text-gray-800">{task.title}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-wider">{task.date}</p>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${
                      task.status === 'Completed' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'Attendance':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div style={neumorphicOutset} className="p-8 rounded-[2.5rem]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black flex items-center gap-3">
                  <Calendar className="text-indigo-600" />
                  Monthly Attendance
                </h3>
                <div style={neumorphicInset} className="px-6 py-2 rounded-2xl">
                  <span className="text-sm font-black text-indigo-600">{stats.attendance}% <span className="text-gray-400 font-bold ml-1">Overall</span></span>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-3">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div key={i} className={`aspect-square rounded-2xl flex items-center justify-center text-[10px] font-black ${
                    i % 7 === 5 || i % 7 === 6 ? 'bg-gray-50 text-gray-300' : (i < 20 ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400')
                  }`}>
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'Finance':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div style={neumorphicOutset} className="p-8 rounded-[2.5rem]">
                  <h3 className="text-xl font-black mb-6">Earnings Overview</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-500 font-bold">Monthly Salary</span>
                      <span className="font-black text-lg">Rs. {profile?.monthlySalary?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100 text-red-500">
                      <span className="font-bold">Total Fines</span>
                      <span className="font-black text-lg">- Rs. {stats.fines}</span>
                    </div>
                    <div className="flex justify-between items-center py-4 text-indigo-600">
                      <span className="font-black uppercase tracking-widest text-xs">Net Payable</span>
                      <span className="font-black text-2xl">Rs. {(profile?.monthlySalary - stats.fines).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div style={neumorphicOutset} className="p-8 rounded-[2.5rem]">
                   <h3 className="text-xl font-black mb-6">Recent Transactions</h3>
                   <div className="space-y-3">
                     {[
                       { type: 'Salary', amount: '+ Rs. 45,000', date: 'March 05' },
                       { type: 'Fine (Late)', amount: '- Rs. 500', date: 'March 12' },
                       { type: 'Bonus (Award)', amount: '+ Rs. 2,000', date: 'March 20' }
                     ].map((tx, i) => (
                       <div key={i} style={neumorphicInset} className="p-4 rounded-2xl flex justify-between items-center">
                         <div>
                           <p className="text-sm font-bold">{tx.type}</p>
                           <p className="text-[10px] text-gray-400 font-bold">{tx.date}</p>
                         </div>
                         <span className={`text-sm font-black ${tx.amount.startsWith('+') ? 'text-green-600' : 'text-red-500'}`}>
                           {tx.amount}
                         </span>
                       </div>
                     ))}
                   </div>
                </div>
             </div>
          </div>
        );
      case 'Dress Code':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div style={neumorphicOutset} className="p-8 rounded-[2.5rem]">
              <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                <Shirt className="text-indigo-600" />
                Dress Code Compliance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Proper Uniform', value: '100%', icon: <Shield className="text-green-500" /> },
                  { label: 'ID Badge Visible', value: 'Yes', icon: <User className="text-blue-500" /> },
                  { label: 'Weekly Average', value: '98%', icon: <Star className="text-amber-500" /> }
                ].map((item, i) => (
                  <div key={i} style={neumorphicInset} className="p-6 rounded-[2rem] text-center">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mx-auto mb-4">
                      {item.icon}
                    </div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">{item.label}</p>
                    <p className="text-xl font-black text-gray-800">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'Duty Logs':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div style={neumorphicOutset} className="p-8 rounded-[2.5rem]">
              <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                <ClipboardCheck className="text-indigo-600" />
                Daily Activity Logs
              </h3>
              <div className="space-y-4">
                {[
                  { time: '09:00 AM', action: 'Shift Start', log: 'Logged in and checked campaign metrics.' },
                  { time: '11:30 AM', action: 'Content Creation', log: 'Shot 3 reels for Rehab department.' },
                  { time: '02:00 PM', action: 'Reporting', log: 'Prepared weekly engagement report.' },
                  { time: '05:00 PM', action: 'Shift End', log: 'Scheduled posts for tomorrow.' }
                ].map((log, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="flex flex-col items-center">
                      <div className="w-4 h-4 rounded-full border-4 border-indigo-500 bg-white z-10" />
                      <div className="w-0.5 h-full bg-gray-100 -mt-1 group-last:hidden" />
                    </div>
                    <div style={neumorphicInset} className="flex-1 p-5 rounded-[2rem] mb-4">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-black text-indigo-600">{log.time}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{log.action}</span>
                      </div>
                      <p className="text-sm text-gray-600 font-medium">{log.log}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'Score Analysis':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div style={neumorphicOutset} className="p-8 rounded-[2.5rem]">
              <h3 className="text-2xl font-black mb-8 flex items-center gap-3">
                <FileBarChart className="text-indigo-600" />
                Performance Score
              </h3>
              <div className="flex flex-col items-center justify-center py-10">
                 <div className="relative w-48 h-48 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                       <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-100" />
                       <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={552} strokeDashoffset={552 - (552 * stats.score / 5)} className="text-indigo-600 transition-all duration-1000" />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                       <span className="text-5xl font-black">{stats.score}</span>
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">OUT OF 5.0</span>
                    </div>
                 </div>
                 <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 w-full">
                    {[
                      { label: 'Engagement', value: '4.9' },
                      { label: 'Creativity', value: '4.7' },
                      { label: 'Punctuality', value: '4.5' },
                      { label: 'Reporting', value: '4.8' }
                    ].map((m, i) => (
                      <div key={i} className="text-center">
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{m.label}</p>
                         <p className="text-xl font-black text-gray-800">{m.value}</p>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          </div>
        );
      case 'My Profile':
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Main Info Card */}
            <div className="md:col-span-2 space-y-6">
              <div style={neumorphicOutset} className="p-10 rounded-[2.5rem] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8">
                  <div style={neumorphicInset} className="p-3 rounded-2xl text-indigo-600 hover:scale-110 transition-transform cursor-pointer">
                    <Edit2 size={20} />
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="relative">
                    <div style={neumorphicOutset} className="w-32 h-32 rounded-[2.5rem] p-1">
                      <div className="w-full h-full rounded-[2.2rem] bg-indigo-50 flex items-center justify-center overflow-hidden">
                        <User size={64} className="text-indigo-200" />
                      </div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2.5 rounded-2xl shadow-xl">
                      <Camera size={16} />
                    </div>
                  </div>

                  <div className="text-center md:text-left">
                    <h2 className="text-3xl font-black text-gray-800 mb-2">{profile?.displayName}</h2>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                      <span className="px-4 py-1.5 rounded-xl bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider">
                        {profile?.role}
                      </span>
                      <span className="px-4 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-wider">
                        {profile?.customId}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {[
                    { icon: <Mail size={18} />, label: 'Official Email', value: profile?.email },
                    { icon: <Phone size={18} />, label: 'Phone Number', value: profile?.phone },
                    { icon: <Calendar size={18} />, label: 'Joining Date', value: profile?.joinedAt },
                    { icon: <MapPin size={18} />, label: 'Home Address', value: profile?.location || 'Not Set' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div style={neumorphicInset} className="p-3 rounded-2xl text-indigo-600">
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{item.label}</p>
                        <p className="text-sm font-bold text-gray-800">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bio / Skills */}
              <div style={neumorphicOutset} className="p-8 rounded-[2.5rem]">
                 <h3 className="text-xl font-black mb-6">Expertise & Skills</h3>
                 <div className="flex flex-wrap gap-3">
                   {['Video Editing', 'Content Strategy', 'Social Media Management', 'Graphic Design', 'Public Relations'].map((skill) => (
                     <span key={skill} style={neumorphicInset} className="px-5 py-2.5 rounded-2xl text-xs font-black text-gray-600 uppercase tracking-tight">
                       {skill}
                     </span>
                   ))}
                 </div>
              </div>
            </div>

            {/* Sidebar Stats */}
            <div className="space-y-6">
              <div style={neumorphicOutset} className="p-8 rounded-[2.5rem] bg-indigo-600 !border-none text-white relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                <h3 className="text-sm font-black uppercase tracking-[0.2em] opacity-80 mb-8">Performance Radar</h3>
                <div className="space-y-6 relative z-10">
                  {[
                    { label: 'Campaign Reach', value: '85%' },
                    { label: 'Follower Growth', value: '92%' },
                    { label: 'Content Quality', value: '98%' }
                  ].map((stat, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                        <span>{stat.label}</span>
                        <span>{stat.value}</span>
                      </div>
                      <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full" style={{ width: stat.value }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={neumorphicOutset} className="p-8 rounded-[2.5rem]">
                 <h3 className="text-lg font-black mb-6">Badges & Achievements</h3>
                 <div className="grid grid-cols-2 gap-4">
                   {[
                     { icon: <Award className="text-amber-500" />, label: 'Top Creator' },
                     { icon: <TrendingUp className="text-green-500" />, label: 'Fast Grower' },
                     { icon: <Zap className="text-indigo-500" />, label: 'Tech Savvy' },
                     { icon: <Heart className="text-rose-500" />, label: 'Fan Favorite' }
                   ].map((badge, i) => (
                     <div key={i} style={neumorphicInset} className="p-4 rounded-3xl flex flex-col items-center gap-2">
                       {badge.icon}
                       <span className="text-[10px] font-black text-center">{badge.label}</span>
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-2 md:p-6 lg:p-8 space-y-8">
      {/* Header / Profile Summary */}
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Navigation Tabs - Mobile Scrollable */}
        <div style={neumorphicOutset} className="p-2 rounded-3xl overflow-x-auto flex no-scrollbar gap-2 sticky top-4 z-40 backdrop-blur-xl">
           {tabs.map((tab) => (
             <button
               key={tab.name}
               onClick={() => setActiveTab(tab.name)}
               className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                 activeTab === tab.name 
                 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                 : 'text-gray-500 hover:bg-gray-50'
               }`}
             >
               {tab.icon}
               {tab.name}
             </button>
           ))}
        </div>

        {/* Dynamic Content */}
        <div className="min-h-[500px]">
          {renderContent()}
        </div>
      </div>
      
      {/* Footer Branding */}
      <div className="max-w-6xl mx-auto pt-12 pb-8 text-center">
         <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.5em]">
           Khan Hub © 2024 • Social Media Department
         </p>
      </div>
    </div>
  );
}
