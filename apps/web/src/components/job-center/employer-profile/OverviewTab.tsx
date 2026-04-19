// d:\khanhub\apps\web\src\components\job-center\employer-profile\OverviewTab.tsx
'use client';

import React from 'react';
import { Building, MapPin, Globe, Mail, Phone, User, Briefcase, Calendar, CheckCircle, Info } from 'lucide-react';
import { Employer } from '@/types/job-center';
import { formatDateDMY } from '@/lib/utils';

interface OverviewTabProps {
  employer: Employer;
}

export default function OverviewTab({ employer }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Bio / Description */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Info size={16} className="text-indigo-500" />
          Company Profile
        </h3>
        <p className="text-gray-600 leading-relaxed">
          {employer.description || "No description provided for this company."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company Details */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <Building size={16} className="text-indigo-500" />
            Company details
          </h3>
          
          <div className="space-y-4">
            <DetailItem icon={Globe} label="Industry" value={employer.industry} />
            <DetailItem icon={User} label="Company Size" value={employer.companySize || 'Not specified'} />
            <DetailItem icon={MapPin} label="Address" value={employer.address} />
            <DetailItem icon={Globe} label="Website" value={employer.website} isLink />
            <DetailItem icon={Mail} label="Official Email" value={employer.email || 'No email provided'} />
          </div>
        </div>

        {/* Contact Person Details */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <User size={16} className="text-indigo-500" />
            Contact Person
          </h3>
          
          <div className="space-y-4">
            <DetailItem icon={User} label="Name" value={employer.contactPerson?.name} />
            <DetailItem icon={Briefcase} label="Position" value={employer.contactPerson?.position || 'Not specified'} />
            <DetailItem icon={Phone} label="Contact Number" value={employer.contactPerson?.phone} />
          </div>

          <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Registration Date</div>
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Calendar size={14} className="text-indigo-500" />
              {formatDateDMY(employer.createdAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value, isLink }: { icon: any, label: string, value?: string | null, isLink?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-4 group">
      <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors flex-shrink-0">
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
        {isLink ? (
          <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-indigo-600 hover:underline truncate block">
            {value}
          </a>
        ) : (
          <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">{value}</p>
        )}
      </div>
    </div>
  );
}
