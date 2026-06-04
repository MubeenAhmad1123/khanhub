import React from 'react';
import { type StaffProfile } from '@/lib/hq/superadmin/staff';
import { toDate } from '@/lib/utils';

interface StaffProfileReportProps {
  staff: StaffProfile;
}

const formatDate = (val: unknown): string => {
  if (!val) return '—';
  try {
    const d = toDate(val as unknown);
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return '—';
  }
};

const calculateShiftDuration = (start?: string, end?: string): string => {
  if (!start || !end) return '—';
  try {
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return '—';
    let totalMinutes = (eH * 60 + eM) - (sH * 60 + sM);
    if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight shifts
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  } catch (e) {
    return '—';
  }
};

const getInitials = (name?: string) => {
  if (!name) return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex border-b border-gray-100 py-1.5 text-xs">
    <span className="w-1/3 text-gray-500 font-bold uppercase tracking-wider text-[9px]">{label}</span>
    <span className="w-2/3 text-gray-900 font-semibold">{value || '—'}</span>
  </div>
);

export default function StaffProfileReport({ staff }: StaffProfileReportProps) {
  const initials = getInitials(staff.name);
  const shiftDuration = calculateShiftDuration(staff.dutyStartTime, staff.dutyEndTime);

  // Group basic extras if they exist
  const basicInfoExtrasEntries = Object.entries(staff.basicInfoExtras || {});

  return (
    <div
      id="staff-report-root"
      className="bg-white text-gray-900 p-8 md:p-12 w-full max-w-[800px] mx-auto print:block print:p-6 print:max-w-full print:bg-white select-none border border-gray-200 print:border-none shadow-sm print:shadow-none"
      style={{ contentVisibility: 'auto' }}
    >
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center pb-4 border-b border-gray-200">
        {/* Left */}
        <div className="flex items-center gap-4">
          <img
            src="/logo.webp"
            alt="KHAN HUB Logo"
            className="w-16 h-16 object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <h1 className="text-base font-black text-gray-900 tracking-tight leading-tight">
              KHAN HUB (PVT.) LTD.
            </h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Group of Companies
            </p>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">
              SECP REGD. No. 0209901
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-col items-end">
          <img
            src="/images/certificats/PHC_RegistrationCertificate.webp"
            alt="SECP/PHC Logo"
            className="h-16 w-auto object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      </div>

      {/* Banner Row */}
      <div className="bg-indigo-600 text-white font-black text-xs uppercase tracking-widest text-center py-2.5 rounded-lg my-6 print:my-4">
        STAFF PROFILE REPORT
      </div>

      {/* PHOTO + IDENTITY SECTION */}
      <div className="flex gap-8 items-start mb-8 print:mb-6">
        {/* Left side: Photo & Badges */}
        <div className="flex flex-col items-center w-28">
          {staff.photoUrl ? (
            <img
              src={staff.photoUrl}
              alt={staff.name}
              className="w-28 h-28 rounded-xl object-cover border border-gray-200"
            />
          ) : (
            <div className="w-28 h-28 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 font-black text-2xl uppercase tracking-widest">
              {initials}
            </div>
          )}

          {/* Employee ID badge */}
          <span className="w-full bg-gray-50 border border-gray-200 text-gray-700 font-black text-[9px] py-1 text-center rounded-lg mt-2.5 tracking-wider uppercase">
            {staff.employeeId || 'No ID'}
          </span>

          {/* Status badge */}
          <span
            className={`w-full text-center text-[9px] font-black uppercase py-1 rounded-lg mt-1.5 border tracking-wider ${
              staff.isActive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {staff.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Right side: Summary info */}
        <div className="flex-1 space-y-2 mt-1">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-1">
              {staff.name}
            </h2>
            <p className="text-xs font-bold text-gray-500">{staff.designation}</p>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 text-xs border-t border-gray-100">
            <div>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Department</span>
              <span className="font-semibold text-gray-900 uppercase">{staff.dept || '—'}</span>
            </div>
            {staff.seniority && (
              <div>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Seniority</span>
                <span className="font-semibold text-indigo-600 uppercase text-[11px]">{staff.seniority}</span>
              </div>
            )}
            <div>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Joining Date</span>
              <span className="font-semibold text-gray-900">{formatDate(staff.joiningDate)}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Blood Group</span>
              <span className="font-semibold text-gray-900">{staff.bloodGroup || '—'}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Gender</span>
              <span className="font-semibold text-gray-900 capitalize">{staff.gender || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:gap-6">
        {/* Left Column: Basic Information */}
        <div className="space-y-4">
          <div className="border-l-4 border-indigo-600 pl-3">
            <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
              Basic Information
            </h3>
          </div>
          <div className="flex flex-col">
            <InfoRow label="Full Name" value={staff.name} />
            <InfoRow label="Father's Name" value={staff.fatherName} />
            <InfoRow label="CNIC" value={staff.cnic} />
            <InfoRow label="Phone" value={staff.phone} />
            <InfoRow label="Date of Birth" value={formatDate(staff.dob)} />
            <InfoRow label="Gender" value={staff.gender ? <span className="capitalize">{staff.gender}</span> : '—'} />
            <InfoRow label="Blood Group" value={staff.bloodGroup} />
            <InfoRow label="Address" value={staff.address} />
            <InfoRow
              label="Emergency"
              value={
                staff.emergencyContactName
                  ? `${staff.emergencyContactName} ${
                      staff.emergencyPhone ? `(${staff.emergencyPhone})` : ''
                    }`
                  : staff.emergencyPhone || '—'
              }
            />

            {/* Custom fields iteration */}
            {basicInfoExtrasEntries.map(([key, val]) => (
              <InfoRow key={key} label={key.replace(/([A-Z])/g, ' $1').trim()} value={val} />
            ))}
          </div>
        </div>

        {/* Right Column: Employment Details & Duties */}
        <div className="space-y-6 print:space-y-4">
          {/* Employment Details */}
          <div className="space-y-4">
            <div className="border-l-4 border-indigo-600 pl-3">
              <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                Employment Details
              </h3>
            </div>
            <div className="flex flex-col">
              <InfoRow label="Joining Date" value={formatDate(staff.joiningDate)} />
              <InfoRow label="Employee ID" value={staff.employeeId} />
              <InfoRow label="Portal/Login ID" value={staff.customId} />
              <InfoRow label="Primary Dept" value={staff.dept ? <span className="uppercase">{staff.dept}</span> : '—'} />
              <InfoRow
                label="Secondary Depts"
                value={
                  staff.secondaryDepts && staff.secondaryDepts.length > 0 ? (
                    <span className="uppercase">{staff.secondaryDepts.join(', ')}</span>
                  ) : (
                    '—'
                  )
                }
              />
              <InfoRow label="Designation" value={staff.designation} />
              <InfoRow label="Seniority Level" value={staff.seniority} />
              <InfoRow
                label="Monthly Salary"
                value={
                  <span className="text-gray-900 font-extrabold text-[13px]">
                    ₨ {Number(staff.monthlySalary || 0).toLocaleString()}
                  </span>
                }
              />
              <InfoRow label="Portal Status" value={staff.isActive ? 'Active' : 'Inactive'} />
            </div>
          </div>

          {/* Duty Schedule Section */}
          <div className="space-y-4">
            <div className="border-l-4 border-indigo-600 pl-3">
              <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                Duty & Attendance Configuration
              </h3>
            </div>
            <div className="flex flex-col">
              <InfoRow label="Start Time" value={staff.dutyStartTime || '—'} />
              <InfoRow label="End Time" value={staff.dutyEndTime || '—'} />
              <InfoRow label="Shift Duration" value={shiftDuration} />

              <div className="py-2.5 text-xs">
                <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px] block mb-1">
                  Assigned Duties
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {staff.dutyConfig && staff.dutyConfig.length > 0 ? (
                    staff.dutyConfig.map((item) => (
                      <span
                        key={item.key}
                        className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-gray-50 text-gray-700 border border-gray-200 rounded"
                      >
                        {item.label}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 italic text-[10px]">No duties configured</span>
                  )}
                </div>
              </div>

              <div className="py-2.5 text-xs">
                <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px] block mb-1">
                  Dress Code Items
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {staff.dressCodeConfig && staff.dressCodeConfig.length > 0 ? (
                    staff.dressCodeConfig.map((item) => (
                      <span
                        key={item.key}
                        className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-gray-50 text-gray-700 border border-gray-200 rounded"
                      >
                        {item.label}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 italic text-[10px]">No dress code configured</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Thin Divider Above Footer */}
      <hr className="my-8 print:my-6 border-t border-gray-200" />

      {/* FOOTER SECTION */}
      <div className="space-y-8 print:space-y-6">
        <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold tracking-wider uppercase">
          <span>This report is Private & Confidential</span>
          <span>For queries: 067-3364220</span>
        </div>

        {/* Signature Lines */}
        <div className="flex justify-between items-end pt-12 print:pt-8">
          <div className="w-48 text-center">
            <div className="border-b border-gray-300 w-full mb-2" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Employee Signature
            </span>
          </div>

          <div className="w-48 text-center">
            <div className="border-b border-gray-300 w-full mb-2" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Authorized Officer
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
