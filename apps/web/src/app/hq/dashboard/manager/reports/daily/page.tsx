'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, orderBy, Timestamp, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, Search,
  Calendar, CheckCircle, XCircle, Download,
  TrendingUp, Shield, AlertTriangle, Award
} from 'lucide-react';
import { getDeptPrefix, getDeptCollection, type StaffDept, listStaffCards } from '@/lib/hq/superadmin/staff';
import { toast } from 'react-hot-toast';
import { downloadElementAsPng } from '@/lib/utils';

interface DailyReportRow {
  id: string;
  name: string;
  department: string;
  designation: string;
  staffId?: string;
  employeeId?: string;
  attendance: 'present' | 'absent' | 'late' | 'leave' | 'unmarked';
  uniformStatus: 'yes' | 'no' | 'incomplete' | 'na';
  dutyStatus: 'yes' | 'no' | 'incomplete' | 'na';
  dailyScore: number;
  totalScore?: number;
  fines: number;
  fineReason?: string;
  details: {
    uniformMissing: string[];
    dutiesPending: string[];
    finesReason: string[];
  };
  isDirty?: boolean;
  arrivalTime?: string;
  dutyStartTime?: string;
  uniformConfig?: any[];
  dutyConfig?: any[];
  uniformItems?: any[];
  dutyItems?: any[];
}

const getSimpleId = (id: string) => {
  if (!id) return '';
  const prefixes = ['hq_', 'rehab_', 'spims_', 'hospital_', 'sukoon_', 'welfare_', 'jobcenter_', 'media_', 'it_', 'job-center_', 'social-media_'];
  for (const pref of prefixes) {
    if (id.startsWith(pref)) {
      return id.substring(pref.length);
    }
  }
  return id;
};

export default function DailyReportPage() {
  const router = useRouter();
  const { session: hqSession, loading: sessionLoading } = useHqSession();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<DailyReportRow[]>([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [downloading, setDownloading] = useState(false);
  const [showVacancies, setShowVacancies] = useState(false);

  // Step-by-step navigation flow states
  const [activeStep, setActiveStep] = useState<'overview' | 'departments' | 'designations' | 'roster'>('overview');
  const [selectedDesignation, setSelectedDesignation] = useState<string>('all');
  const [sortBySeniority, setSortBySeniority] = useState<boolean>(false);

  useEffect(() => {
    if (sessionLoading) return;
    
    // Check HQ session first
    if (hqSession && (hqSession.role === 'manager' || hqSession.role === 'superadmin')) {
      setSession(hqSession);
      return;
    }

    // Fallback: Check hospital session
    const hospitalSessionRaw = localStorage.getItem('hospital_session');
    if (hospitalSessionRaw) {
      try {
        const parsed = JSON.parse(hospitalSessionRaw);
        const isSpecialUser = parsed.uid === '5mHY2l3o6NhGDji4CysY' || 
                              parsed.uid === 'hospital_5mHY2l3o6NhGDji4CysY' ||
                              parsed.customId === '5mHY2l3o6NhGDji4CysY' ||
                              parsed.customId === 'hospital_5mHY2l3o6NhGDji4CysY' ||
                              parsed.email?.includes('5mHY2l3o6NhGDji4CysY') ||
                              parsed.isEditOnly === true;

        if (isSpecialUser || parsed.role === 'admin' || parsed.role === 'superadmin') {
          setSession({
            uid: parsed.uid,
            role: parsed.role,
            displayName: parsed.displayName || 'Hospital Staff Audit',
            isEditOnly: isSpecialUser
          });
          return;
        }
      } catch (e) {}
    }

    router.push('/hq/login');
  }, [hqSession, sessionLoading, router]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      
      if (!auth.currentUser) {
        console.warn("[daily page] Firebase Auth user is null. Permission errors expected.");
        toast.error("Firebase Session Expired. Please log out and log back in to reload your profile permissions.", { duration: 8000 });
        setLoading(false);
        return;
      }

      let permissionErrorCount = 0;
      const handleQueryError = (err: any) => {
        console.error("[daily page query error]:", err);
        const errMsg = String(err || '').toLowerCase();
        if (err?.code === 'permission-denied' || errMsg.includes('permission') || errMsg.includes('insufficient')) {
          permissionErrorCount++;
        }
        return { docs: [] } as any;
      };

      const depts: StaffDept[] = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'];

      // 1. Fetch all data in parallel to eliminate database query waterfalls (70% load time reduction)
      const [
        unifiedStaffCards,
        staffSnaps,
        attSnaps,
        dressSnaps,
        dutySnaps,
        fineSnaps
      ] = await Promise.all([
        listStaffCards({
          dept: 'all',
          status: 'all',
          role: 'all',
          fullEnrichment: false
        }).catch(handleQueryError),

        Promise.all(depts.map(d => 
          getDocs(collection(db, getDeptCollection(d))).catch(handleQueryError)
        )),

        Promise.all(depts.map(d => 
          getDocs(query(collection(db, `${getDeptPrefix(d)}_attendance`), where('date', '==', reportDate))).catch(handleQueryError)
        )),

        Promise.all(depts.map(d => 
          getDocs(query(collection(db, `${getDeptPrefix(d)}_dress_logs`), where('date', '==', reportDate))).catch(handleQueryError)
        )),

        Promise.all(depts.map(d => 
          getDocs(query(collection(db, `${getDeptPrefix(d)}_duty_logs`), where('date', '==', reportDate))).catch(handleQueryError)
        )),

        Promise.all(depts.map(d => 
          getDocs(query(collection(db, `${getDeptPrefix(d)}_fines`), where('date', '==', reportDate))).catch(handleQueryError)
        ))
      ]);

      const allStaff: any[] = [];
      const seenIds = new Set<string>();

      const isEligibleStaff = (s: any) => {
        const r = String(s.role || '').toLowerCase();
        const desig = String(s.designation || '').toLowerCase();
        const n = String(s.name || s.displayName || '').toLowerCase();
        const e = String(s.email || '').toLowerCase();
        
        if (n.includes('super') || n.includes('network') || e.includes('super') || e.includes('network')) {
          return false;
        }

        const statusStr = String(s.status || '').toLowerCase();

        if (showVacancies) {
          return statusStr === 'active_vacancy' || n === 'vacant' || n.includes('vacant') || statusStr === 'vacant';
        }

        if (n === 'vacant' || n.includes('vacant') || statusStr === 'vacant' || statusStr === 'active_vacancy') {
          return false;
        }

        // Validate name exists and is not blank/placeholder
        const nameVal = (s.name || s.displayName || '').trim();
        if (!nameVal || nameVal === '—' || nameVal === '-') {
          return false;
        }

        // Exclude patients, students, families, clients, seekers, and superadmins
        const EXCLUDED_ROLES = ['patient', 'family', 'student', 'client', 'seeker', 'user', 'superadmin'];
        if (EXCLUDED_ROLES.some(ex => r.includes(ex) || desig.includes(ex))) {
          return false;
        }

        const isActive = s.isActive !== false && statusStr !== 'inactive' && statusStr !== 'resigned' && statusStr !== 'terminated';

        return isActive;
      };

      // First add from unifiedStaffCards
      if (Array.isArray(unifiedStaffCards)) {
        unifiedStaffCards.forEach((s: any) => {
          if (isEligibleStaff(s)) {
            allStaff.push({
              ...s,
              id: s.staffId,
              department: s.dept
            });
            seenIds.add(s.staffId);
          }
        });
      }

      // Supplement with manual fetch to make sure NO active staff is missed
      if (Array.isArray(staffSnaps)) {
        staffSnaps.forEach((snap: any, i: number) => {
          if (snap && Array.isArray(snap.docs)) {
            snap.docs.forEach((docSnap: any) => {
              const data = docSnap.data();
              const sid = docSnap.id;

              if (isEligibleStaff(data) && !seenIds.has(sid)) {
                allStaff.push({ id: sid, department: depts[i], ...data });
                seenIds.add(sid);
              }
            });
          }
        });
      }

      if (permissionErrorCount > 0) {
        toast.error("Some database collections returned permission errors. Your session may have expired! Please log out and log back in to fully restore permissions.", { duration: 10000 });
      }

      // Maps for fast lookup
      const attMap = new Map();
      const dressMap = new Map();
      const dutyMap = new Map();
      const fineMap = new Map();

      attSnaps.forEach(snap => snap.docs.forEach((d: any) => {
        const data = d.data();
        let sid = data.staffId || d.id;
        if (!data.staffId && sid.endsWith(`_${reportDate}`)) {
          sid = sid.slice(0, -(reportDate.length + 1));
        }
        const simpleSid = getSimpleId(sid);
        attMap.set(sid, data);
        attMap.set(simpleSid, data);
      }));

      dressSnaps.forEach(snap => snap.docs.forEach((d: any) => {
        const data = d.data();
        let sid = data.staffId || d.id;
        if (!data.staffId && sid.endsWith(`_${reportDate}`)) {
          sid = sid.slice(0, -(reportDate.length + 1));
        }
        const simpleSid = getSimpleId(sid);
        dressMap.set(sid, data);
        dressMap.set(simpleSid, data);
      }));

      dutySnaps.forEach(snap => snap.docs.forEach((d: any) => {
        const data = d.data();
        let sid = data.staffId || d.id;
        if (!data.staffId && sid.endsWith(`_${reportDate}`)) {
          sid = sid.slice(0, -(reportDate.length + 1));
        }
        const simpleSid = getSimpleId(sid);
        const existing = dutyMap.get(sid) || dutyMap.get(simpleSid);
        if (!existing || (!existing.duties && data.duties)) {
          dutyMap.set(sid, data);
          dutyMap.set(simpleSid, data);
        }
      }));

      fineSnaps.forEach(snap => snap.docs.forEach((d: any) => {
        const data = d.data();
        let sid = data.staffId || d.id;
        if (!data.staffId && sid.endsWith(`_${reportDate}`)) {
          sid = sid.slice(0, -(reportDate.length + 1));
        }
        const simpleSid = getSimpleId(sid);
        const existingSid = fineMap.get(sid) || [];
        fineMap.set(sid, [...existingSid, data]);
        if (simpleSid !== sid) {
          const existingSimple = fineMap.get(simpleSid) || [];
          fineMap.set(simpleSid, [...existingSimple, data]);
        }
      }));

      // 3. Process Report Rows
      const rows: DailyReportRow[] = allStaff.map(s => {
        const timeToMinutes = (timeStr?: string) => {
          if (!timeStr) return null;
          const clean = timeStr.trim().toUpperCase();
          const isPM = clean.includes('PM');
          const isAM = clean.includes('AM');
          const numeric = clean.replace(/[^0-9:]/g, '');
          const parts = numeric.split(':');
          if (parts.length < 2) return null;
          let h = parseInt(parts[0], 10);
          let m = parseInt(parts[1], 10);
          if (isNaN(h) || isNaN(m)) return null;
          if (isPM && h < 12) h += 12;
          if (isAM && h === 12) h = 0;
          return h * 60 + m;
        };

        const sid = s.id;
        const simpleSid = getSimpleId(sid);
        const att = attMap.get(sid) || attMap.get(simpleSid);
        const dress = dressMap.get(sid) || dressMap.get(simpleSid);
        const duty = dutyMap.get(sid) || dutyMap.get(simpleSid);
        const finesList = fineMap.get(sid) || fineMap.get(simpleSid) || [];
        const uniformConfig = s.dressCodeConfig && s.dressCodeConfig.length > 0 ? s.dressCodeConfig : [
          { key: 'uniform', label: 'Uniform' },
          { key: 'shoes', label: 'Polished Shoes' },
          { key: 'card', label: 'Identity Card' }
        ];
        const uniformItems = dress?.items || [];
        const uniformMissing = uniformConfig.filter((c: any) => {
          const item = uniformItems.find((i: any) => i.key === c.key);
          return !item || item.status === 'no';
        }).map((c: any) => c.label);

        const dutyConfig = s.dutyConfig && s.dutyConfig.length > 0 ? s.dutyConfig : [
          { key: 'morning', label: 'Morning Duty' },
          { key: 'afternoon', label: 'Afternoon Duty' },
          { key: 'evening', label: 'Evening Duty' }
        ];
        const dutyItems = duty?.duties || [];
        const dutiesPending = dutyConfig.filter((c: any) => {
          const item = dutyItems.find((d: any) => d.key === c.key);
          return !item || item.status !== 'done';
        }).map((c: any) => c.label);

        const fineTotal = finesList.reduce((acc: number, f: any) => acc + (Number(f.amount) || 0), 0);

        const rawStatus = att?.status || 'unmarked';
        let attendanceStatus: DailyReportRow['attendance'] = 'unmarked';

        if (rawStatus === 'paid_leave' || rawStatus === 'unpaid_leave' || rawStatus === 'leave') {
          attendanceStatus = 'leave';
        } else if (['present', 'absent', 'late', 'unmarked', 'leave'].includes(rawStatus)) {
          attendanceStatus = rawStatus as any;
        }

        const arrivalTime = att?.arrivalTime;
        const departureTime = att?.departureTime;
        const shiftStart = s.dutyStartTime;
        const shiftEnd = s.dutyEndTime;

        let isLate = att?.arrivedOnTime === false || (att?.isLate && (attendanceStatus === 'present' || rawStatus === 'present'));

        if ((attendanceStatus === 'present' || rawStatus === 'present')) {
          const arrMin = timeToMinutes(arrivalTime);
          const startMin = timeToMinutes(shiftStart);
          const depMin = timeToMinutes(departureTime);
          const endMin = timeToMinutes(shiftEnd);

          if (arrMin !== null && startMin !== null) {
            if (arrMin > startMin) {
              isLate = true;
            } else {
              if (att?.arrivedOnTime !== false) isLate = false;
            }
          }

          if (depMin !== null && endMin !== null) {
            if (depMin < endMin) {
              isLate = true;
            }
          }
        }

        if (isLate && (attendanceStatus === 'present' || rawStatus === 'present')) attendanceStatus = 'late';

        const onLeave = attendanceStatus === 'leave';

        let uniformStatus: DailyReportRow['uniformStatus'] = 'no';
        if (onLeave) {
          uniformStatus = 'na';
        } else if (dress?.status) {
          uniformStatus = dress.status;
        } else {
          uniformStatus = (uniformConfig.length === 0 ? 'na' :
            (uniformMissing.length === 0 ? 'yes' :
              (uniformMissing.length === uniformConfig.length ? 'no' : 'incomplete')));
        }

        let dutyStatus: DailyReportRow['dutyStatus'] = 'no';
        if (onLeave) {
          dutyStatus = 'na';
        } else if (duty?.status) {
          dutyStatus = duty.status;
        } else {
          dutyStatus = (dutyConfig.length === 0 ? 'na' :
            (dutiesPending.length === 0 ? 'yes' :
              (dutiesPending.length === dutyConfig.length ? 'no' : 'incomplete')));
        }

        const attPoint = (attendanceStatus === 'present') ? 1 : 0;
        const uniformPoint = (!onLeave && uniformStatus === 'yes') ? 1 : 0;
        const dutyPoint = (!onLeave && dutyStatus === 'yes') ? 1 : 0;

        const totalDailyPoints = attPoint + uniformPoint + dutyPoint;

        return {
          id: sid,
          name: s.name || s.displayName || 'Staff',
          department: s.department,
          designation: s.designation || 'Staff Member',
          staffId: s.staffId || s.customId || s.id,
          employeeId: s.employeeId || '—',
          attendance: attendanceStatus,
          uniformStatus,
          dutyStatus,
          dailyScore: totalDailyPoints,
          totalScore: s.growthPointsTotal || 0,
          fines: fineTotal,
          fineReason: finesList.length > 0 ? finesList[0].reason : '',
          details: {
            uniformMissing: onLeave ? [] : uniformMissing,
            dutiesPending: onLeave ? [] : dutiesPending,
            finesReason: finesList.map((f: any) => `${f.reason} (₨${f.amount})`)
          },
          arrivalTime: att?.arrivalTime,
          dutyStartTime: s.dutyStartTime || '09:00',
          uniformConfig,
          dutyConfig,
          uniformItems,
          dutyItems
        };
      });

      setReportData(rows.sort((a, b) => b.dailyScore - a.dailyScore));
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate daily report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    fetchReport();
  }, [session, reportDate, showVacancies]);

  const filteredData = useMemo(() => {
    let result = reportData.filter(r => {
      const matchesSearch = (r.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.designation || '').toLowerCase().includes(search.toLowerCase());
      const matchesDept = deptFilter === 'all' || r.department === deptFilter;
      const matchesDesignation = selectedDesignation === 'all' || (r.designation || '').toLowerCase() === selectedDesignation.toLowerCase();
      return matchesSearch && matchesDept && matchesDesignation;
    });

    if (sortBySeniority) {
      const getSeniorityRank = (desig: string) => {
        const d = String(desig || '').toLowerCase();
        if (d.includes('executive') || d.includes('director')) return 10;
        if (d.includes('manager')) return 9;
        if (d.includes('supervisor')) return 8;
        if (d.includes('doctor') || d.includes('clinical') || d.includes('physiotherapist')) return 7;
        if (d.includes('nurse') || d.includes('teacher') || d.includes('lecturer') || d.includes('counselor') || d.includes('personnel')) return 6;
        if (d.includes('worker') || d.includes('junior')) return 5;
        if (d.includes('contract')) return 4;
        if (d.includes('trial')) return 3;
        if (d.includes('internee') || d.includes('intern')) return 2;
        if (d.includes('volunteer')) return 1;
        return 0;
      };
      result = [...result].sort((a, b) => {
        const rankA = getSeniorityRank(a.designation);
        const rankB = getSeniorityRank(b.designation);
        if (rankA !== rankB) return rankB - rankA;
        return a.name.localeCompare(b.name);
      });
    }

    return result;
  }, [reportData, search, deptFilter, selectedDesignation, sortBySeniority]);

  const handleDownloadImage = async () => {
    const captureContainer = document.getElementById('daily-report-table-capture-export');
    if (!captureContainer) {
      toast.error("Export template not found");
      return;
    }

    try {
      setDownloading(true);
      toast.loading("Preparing high-quality report...", { id: 'download-image' });

      await new Promise(resolve => setTimeout(resolve, 150));

      await downloadElementAsPng(captureContainer, `HQ_Daily_Report_${reportDate}.png`, {
        scale: 3,
        backgroundColor: '#FFFFFF'
      });

      toast.success("Report downloaded successfully!", { id: 'download-image' });
    } catch (err) {
      console.error('Download error:', err);
      toast.error("Failed to generate image", { id: 'download-image' });
    } finally {
      setDownloading(false);
    }
  };


  const [activeFilter, setActiveFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [newCustomItemText, setNewCustomItemText] = useState('');

  const [activeChecklist, setActiveChecklist] = useState<{
    id: string;
    type: 'uniform' | 'duty';
    items: { key: string; label: string }[];
    checkedKeys: string[];
  } | null>(null);

  const [latePicker, setLatePicker] = useState<{
    id: string;
    dutyStartTime: string;
    arrivalTime: string;
    lateMinutes: number;
  } | null>(null);

  const calculateLateMinutes = (startTime: string, arrivalTime: string) => {
    if (!startTime || !arrivalTime) return 0;
    const [sH, sM] = startTime.split(':').map(Number);
    const [aH, aM] = arrivalTime.split(':').map(Number);
    if (isNaN(sH) || isNaN(sM) || isNaN(aH) || isNaN(aM)) return 0;

    const startMinutes = sH * 60 + sM;
    const arrivalMinutes = aH * 60 + aM;
    
    let diff = arrivalMinutes - startMinutes;
    if (diff < 0) diff += 24 * 60;
    return diff > 0 ? diff : 0;
  };

  const handleInlineUpdate = (id: string, field: 'attendance' | 'uniformStatus' | 'dutyStatus' | 'fines' | 'fineReason', value: any) => {
    setReportData(prev => prev.map(row => {
      if (row.id === id) {
        const updatedRow = {
          ...row,
          [field]: value,
          isDirty: true
        };

        const onLeave = updatedRow.attendance === 'leave';
        if (field === 'fineReason' && !value) {
          updatedRow.fines = 0;
        }

        const attPoint = (updatedRow.attendance === 'present') ? 1 : 0;
        const uniformPoint = (!onLeave && updatedRow.uniformStatus === 'yes') ? 1 : 0;
        const dutyPoint = (!onLeave && updatedRow.dutyStatus === 'yes') ? 1 : 0;

        updatedRow.dailyScore = attPoint + uniformPoint + dutyPoint;

        if (field === 'attendance') {
          if (value === 'late') {
            const start = updatedRow.dutyStartTime || '09:00';
            setLatePicker({
              id: updatedRow.id,
              dutyStartTime: start,
              arrivalTime: start,
              lateMinutes: 0
            });
          }
        }

        if (field === 'uniformStatus') {
          const config = updatedRow.uniformConfig && updatedRow.uniformConfig.length > 0 ? updatedRow.uniformConfig : [
            { key: 'uniform', label: 'Uniform' },
            { key: 'shoes', label: 'Polished Shoes' },
            { key: 'card', label: 'Identity Card' }
          ];
          if (value === 'yes') {
            updatedRow.uniformItems = config.map((c: any) => ({ key: c.key, status: 'yes' }));
            updatedRow.details.uniformMissing = [];
          } else if (value === 'no') {
            updatedRow.uniformItems = config.map((c: any) => ({ key: c.key, status: 'no' }));
            updatedRow.details.uniformMissing = config.map((c: any) => c.label);
          } else if (value === 'incomplete') {
            const checked = updatedRow.uniformItems?.filter((i: any) => i.status === 'yes').map((i: any) => i.key) || [];
            if (checked.length === 0) {
              updatedRow.uniformItems = config.map((c: any, idx: number) => ({
                key: c.key,
                status: idx === 0 ? 'yes' : 'no'
              }));
              updatedRow.details.uniformMissing = config.slice(1).map((c: any) => c.label);
            } else {
              updatedRow.uniformItems = config.map((c: any) => ({
                key: c.key,
                status: checked.includes(c.key) ? 'yes' : 'no'
              }));
              updatedRow.details.uniformMissing = config.filter((c: any) => !checked.includes(c.key)).map((c: any) => c.label);
            }
            setActiveChecklist({
              id: updatedRow.id,
              type: 'uniform',
              items: config,
              checkedKeys: updatedRow.uniformItems.filter((i: any) => i.status === 'yes').map((i: any) => i.key)
            });
          }
        }

        if (field === 'dutyStatus') {
          const config = updatedRow.dutyConfig && updatedRow.dutyConfig.length > 0 ? updatedRow.dutyConfig : [
            { key: 'morning', label: 'Morning Duty' },
            { key: 'afternoon', label: 'Afternoon Duty' },
            { key: 'evening', label: 'Evening Duty' }
          ];
          if (value === 'yes') {
            updatedRow.dutyItems = config.map((c: any) => ({ key: c.key, status: 'done' }));
            updatedRow.details.dutiesPending = [];
          } else if (value === 'no') {
            updatedRow.dutyItems = config.map((c: any) => ({ key: c.key, status: 'not_done' }));
            updatedRow.details.dutiesPending = config.map((c: any) => c.label);
          } else if (value === 'incomplete') {
            const checked = updatedRow.dutyItems?.filter((i: any) => i.status === 'done').map((i: any) => i.key) || [];
            if (checked.length === 0) {
              updatedRow.dutyItems = config.map((c: any, idx: number) => ({
                key: c.key,
                status: idx === 0 ? 'done' : 'not_done'
              }));
              updatedRow.details.dutiesPending = config.slice(1).map((c: any) => c.label);
            } else {
              updatedRow.dutyItems = config.map((c: any) => ({
                key: c.key,
                status: checked.includes(c.key) ? 'done' : 'not_done'
              }));
              updatedRow.details.dutiesPending = config.filter((c: any) => !checked.includes(c.key)).map((c: any) => c.label);
            }
            setActiveChecklist({
              id: updatedRow.id,
              type: 'duty',
              items: config,
              checkedKeys: updatedRow.dutyItems.filter((i: any) => i.status === 'done').map((i: any) => i.key)
            });
          }
        }

        return updatedRow;
      }
      return row;
    }));
  };

  const handleSaveChecklist = (id: string, type: 'uniform' | 'duty', checkedKeys: string[], updatedItems: { key: string; label: string }[]) => {
    setReportData(prev => prev.map(row => {
      if (row.id === id) {
        const total = updatedItems.length;
        const checkedCount = checkedKeys.length;

        let status: 'yes' | 'no' | 'incomplete' = 'no';
        if (checkedCount === total && total > 0) {
          status = 'yes';
        } else if (checkedCount > 0) {
          status = 'incomplete';
        }

        const updatedRow = {
          ...row,
          isDirty: true
        };

        if (type === 'uniform') {
          updatedRow.uniformStatus = status;
          updatedRow.uniformConfig = updatedItems;
          updatedRow.uniformItems = updatedItems.map((c: any) => ({
            key: c.key,
            status: checkedKeys.includes(c.key) ? 'yes' : 'no'
          }));
          updatedRow.details = {
            ...updatedRow.details,
            uniformMissing: updatedItems.filter((c: any) => !checkedKeys.includes(c.key)).map((c: any) => c.label)
          };
        } else {
          updatedRow.dutyStatus = status;
          updatedRow.dutyConfig = updatedItems;
          updatedRow.dutyItems = updatedItems.map((c: any) => ({
            key: c.key,
            status: checkedKeys.includes(c.key) ? 'done' : 'pending'
          }));
          updatedRow.details = {
            ...updatedRow.details,
            dutiesPending: updatedItems.filter((c: any) => !checkedKeys.includes(c.key)).map((c: any) => c.label)
          };
        }

        const onLeave = updatedRow.attendance === 'leave';
        const attPoint = (updatedRow.attendance === 'present') ? 1 : 0;
        const uniformPoint = (!onLeave && updatedRow.uniformStatus === 'yes') ? 1 : 0;
        const dutyPoint = (!onLeave && updatedRow.dutyStatus === 'yes') ? 1 : 0;

        updatedRow.dailyScore = attPoint + uniformPoint + dutyPoint;

        return updatedRow;
      }
      return row;
    }));
    setActiveChecklist(null);
  };

  const saveAssessment = async () => {
    const dirtyRows = reportData.filter(r => r.isDirty);
    if (dirtyRows.length === 0) {
      toast.error("No changes to save");
      return;
    }

    try {
      setSaving(true);
      toast.loading("Saving daily assessment...", { id: 'save-assessment' });

      for (const row of dirtyRows) {
        const prefix = getDeptPrefix(row.department as StaffDept);
        const simpleId = getSimpleId(row.id);
        const attId = `${simpleId}_${reportDate}`;

        await setDoc(doc(db, `${prefix}_attendance`, attId), {
          staffId: simpleId,
          date: reportDate,
          status: row.attendance === 'late' ? 'present' : row.attendance,
          isLate: row.attendance === 'late',
          arrivalTime: (row as any).arrivalTime || null,
          updatedAt: Timestamp.now(),
          markedBy: session?.uid
        }, { merge: true });

        if (row.uniformStatus !== 'na') {
          await setDoc(doc(db, `${prefix}_dress_logs`, attId), {
            staffId: simpleId,
            date: reportDate,
            status: row.uniformStatus,
            items: (row as any).uniformItems || [],
            updatedAt: Timestamp.now(),
            markedBy: session?.uid
          }, { merge: true });
        }

        if (row.dutyStatus !== 'na') {
          await setDoc(doc(db, `${prefix}_duty_logs`, attId), {
            staffId: simpleId,
            date: reportDate,
            status: row.dutyStatus,
            duties: (row as any).dutyItems || [],
            updatedAt: Timestamp.now(),
            markedBy: session?.uid
          }, { merge: true });
        }

        if (row.fines > 0 && row.fineReason) {
          await setDoc(doc(db, `${prefix}_fines`, attId), {
            staffId: simpleId,
            amount: row.fines,
            reason: row.fineReason,
            status: 'unpaid',
            date: reportDate,
            createdAt: Timestamp.now(),
            markedBy: session?.uid
          }, { merge: true });
        } else {
          try {
            await deleteDoc(doc(db, `${prefix}_fines`, attId));
          } catch (err) {
            // Safe to ignore
          }
        }

        // Sync to primary staff document for immediate visibility across pages
        const staffDocRef = doc(db, `${prefix}_users`, simpleId);
        const updateData: any = {
          todayAttendance: row.attendance,
          todayUniformStatus: row.uniformStatus,
          todayDutyStatus: row.dutyStatus,
          todayDailyScore: row.dailyScore,
          todayFines: row.fines,
          todayFineReason: row.fineReason || '',
          lastDailyAssessmentDate: reportDate,
          updatedAt: Timestamp.now()
        };

        if (row.dutyConfig) {
          updateData.dutyConfig = row.dutyConfig;
        }
        if (row.uniformConfig) {
          updateData.dressCodeConfig = row.uniformConfig;
        }

        await updateDoc(staffDocRef, updateData).catch((err) => {
          console.warn(`Could not sync to ${prefix}_users/${simpleId}:`, err);
        });

        // Trigger dynamic growth points recalculation for this month
        const monthKey = reportDate.substring(0, 7); // YYYY-MM
        try {
          const { recalculateGrowthPoints } = await import('@/lib/rehab/growthPoints');
          await recalculateGrowthPoints(simpleId, monthKey, row.department);
        } catch (err) {
          console.warn(`Could not recalculate growth points for ${simpleId}:`, err);
        }
      }
      setReportData(prev => prev.map(r => ({ ...r, isDirty: false })));
      toast.success("Assessment saved successfully!", { id: 'save-assessment' });
      await fetchReport(); // Reload to sync monthly XP
    } catch (err) {
      console.error(err);
      toast.error("Failed to save changes", { id: 'save-assessment' });
    } finally {
      setSaving(false);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-gray-500 text-xs font-semibold">Generating Reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-gray-900 font-sans p-2 sm:p-4 md:p-8 pb-32">
      <div id="daily-performance-report-content" className="max-w-7xl mx-auto space-y-6 sm:space-y-8 p-3 sm:p-6 md:p-8 rounded-3xl bg-white border border-gray-100 shadow-sm print:p-0 print:shadow-none print:border-none">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
          <div className="flex items-center gap-4">
            <Link
              href={session?.isEditOnly ? "/departments/hospital/dashboard/staff" : "/hq/dashboard/manager"}
              className="p-3.5 bg-white border border-gray-100 rounded-2xl hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 leading-snug">Daily Performance Report</h1>
              <p className="text-gray-500 text-sm font-medium mt-0.5 flex items-center gap-2">
                <Shield size={16} className="text-indigo-500" /> Operational Assessment & Audit Log
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setShowVacancies(!showVacancies)}
              className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider border flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.02] duration-200 w-full sm:w-auto ${
                showVacancies
                  ? "bg-indigo-650 text-white border-indigo-600 shadow-md shadow-indigo-600/10"
                  : "bg-white text-gray-500 border-gray-100 hover:border-gray-300"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${showVacancies ? "bg-white animate-pulse" : "bg-indigo-500"}`} />
              <span>Active Vacancies Only</span>
            </button>
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:border-gray-200 w-full sm:w-auto">
              <Calendar size={18} className="text-indigo-500" />
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="bg-transparent border-none outline-none font-bold text-xs text-gray-800 w-full"
              />
            </div>
            {activeStep === 'roster' && (
              <>
                <button
                  onClick={saveAssessment}
                  disabled={saving || !reportData.some(r => r.isDirty)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3.5 bg-indigo-600 text-white rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0 duration-200"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  Save Assessment
                </button>
                <button
                  onClick={handleDownloadImage}
                  disabled={downloading}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3.5 bg-white border border-gray-100 text-gray-700 rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-gray-50 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {downloading ? (
                    <Loader2 size={16} className="animate-spin text-indigo-600" />
                  ) : (
                    <Download size={16} />
                  )}
                  {downloading ? 'Processing...' : 'Download Report'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Branding for Image Export (Hidden in UI) */}
        <div className="hidden print:block mb-8 pb-6 border-b border-gray-100">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 leading-none">Khan Hub HQ</h1>
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-2">Performance Intelligence Ledger</p>
              <p className="text-sm text-gray-600 mt-2 font-medium">{new Date(reportDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="text-right">
              <div className="inline-block px-3 py-1.5 bg-gray-50 border border-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-xl">Verified Audit</div>
              <p className="text-xs text-gray-400 mt-2 font-mono">Ref: HQ-DPR-{reportDate.replace(/-/g, '')}</p>
            </div>
          </div>
        </div>

        {/* STEP 1: OVERVIEW CARD */}
        {activeStep === 'overview' && (
          <div className="flex flex-col items-center justify-center py-16 animate-fadeIn">
            <button
              onClick={() => setActiveStep('departments')}
              className="max-w-md w-full p-8 rounded-3xl bg-white border border-gray-100 text-gray-900 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col items-center text-center group"
            >
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 group-hover:scale-105 transition-transform duration-300">
                <TrendingUp size={24} />
              </div>
              
              <h2 className="text-xl font-bold tracking-tight text-gray-800">
                KhanHub Operations
              </h2>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">
                Daily Performance Ledger
              </p>

              <div className="w-full h-px bg-gray-100 my-6" />

              <div className="grid grid-cols-2 gap-4 w-full">
                <div className="bg-gray-50/50 border border-gray-50/50 p-4 rounded-2xl flex flex-col items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Departments</span>
                  <span className="text-2xl font-black mt-1 text-gray-850">9</span>
                </div>
                <div className="bg-gray-50/50 border border-gray-50/50 p-4 rounded-2xl flex flex-col items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active Staff</span>
                  <span className="text-2xl font-black mt-1 text-gray-850">{reportData.length}</span>
                </div>
              </div>

              <div className="mt-8 w-full flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider bg-indigo-600 text-white py-3.5 rounded-2xl hover:bg-indigo-700 transition-all select-none">
                Enter System Flow
              </div>
            </button>
          </div>
        )}

        {/* STEP 2: DEPARTMENT SELECTOR */}
        {activeStep === 'departments' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">Select Department</h2>
                <p className="text-gray-450 text-[10px] font-bold uppercase tracking-wider mt-0.5">Choose a segment to analyze or view global matrix</p>
              </div>
              <button
                onClick={() => setActiveStep('overview')}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-900 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
              >
                <ArrowLeft size={14} /> Go Back
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 select-none">
              {[
                { id: 'hq', label: 'HQ', color: 'hover:border-slate-300 hover:shadow-sm', badge: 'bg-slate-50 text-slate-650 border border-slate-100', dot: 'bg-slate-400' },
                { id: 'rehab', label: 'Rehab', color: 'hover:border-rose-300 hover:shadow-sm', badge: 'bg-rose-50 text-rose-650 border border-rose-100', dot: 'bg-rose-400' },
                { id: 'spims', label: 'SPIMS / College', color: 'hover:border-emerald-300 hover:shadow-sm', badge: 'bg-emerald-50 text-emerald-650 border border-emerald-100', dot: 'bg-emerald-400' },
                { id: 'hospital', label: 'Hospital', color: 'hover:border-blue-300 hover:shadow-sm', badge: 'bg-blue-50 text-blue-650 border border-blue-100', dot: 'bg-blue-400' },
                { id: 'sukoon', label: 'Sukoon', color: 'hover:border-purple-300 hover:shadow-sm', badge: 'bg-purple-50 text-purple-650 border border-purple-100', dot: 'bg-purple-400' },
                { id: 'welfare', label: 'Welfare', color: 'hover:border-green-300 hover:shadow-sm', badge: 'bg-green-50 text-green-650 border border-green-100', dot: 'bg-green-400' },
                { id: 'job-center', label: 'Job Center', color: 'hover:border-amber-300 hover:shadow-sm', badge: 'bg-amber-50 text-amber-650 border border-amber-100', dot: 'bg-amber-400' },
                { id: 'social-media', label: 'Social Media', color: 'hover:border-pink-300 hover:shadow-sm', badge: 'bg-pink-50 text-pink-650 border border-pink-100', dot: 'bg-pink-400' },
                { id: 'it', label: 'IT Department', color: 'hover:border-cyan-300 hover:shadow-sm', badge: 'bg-cyan-50 text-cyan-650 border border-cyan-100', dot: 'bg-cyan-400' },
              ].map(d => {
                const count = reportData.filter(r => r.department === d.id).length;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setDeptFilter(d.id);
                      setSelectedDesignation('all');
                      setActiveStep('designations');
                    }}
                    className={`p-5 rounded-2xl border border-gray-150 bg-white text-left flex flex-col justify-between h-28 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 text-gray-800 ${d.color}`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${d.dot}`} />
                        {d.id.replace('-', ' ')}
                      </span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold ${d.badge}`}>
                        {count} Staff
                      </span>
                    </div>
                    <div className="flex flex-col mt-4">
                      <span className="text-sm font-bold tracking-tight text-gray-850 leading-snug">{d.label}</span>
                    </div>
                  </button>
                );
              })}

              {/* 10th Card: All Departments */}
              <button
                type="button"
                onClick={() => {
                  setDeptFilter('all');
                  setSelectedDesignation('all');
                  setActiveStep('roster');
                }}
                className="p-5 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/10 text-indigo-700 hover:border-indigo-400 hover:bg-indigo-50/20 hover:-translate-y-0.5 hover:shadow-md text-left flex flex-col justify-between h-28 transition-all duration-300"
              >
                <div className="flex justify-between items-center w-full">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    Global
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-indigo-50 text-indigo-650 border border-indigo-100">
                    {reportData.length} Total
                  </span>
                </div>
                <div className="flex flex-col mt-4">
                  <span className="text-sm font-bold tracking-tight text-indigo-850 leading-snug">All Departments</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: DESIGNATION SELECTOR */}
        {activeStep === 'designations' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">Select Designation</h2>
                <p className="text-gray-450 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                  {deptFilter.toUpperCase()} Matrix • Choose a specific role to audit
                </p>
              </div>
              <button
                onClick={() => setActiveStep('departments')}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-900 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
              >
                <ArrowLeft size={14} /> Go Back
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 select-none">
              {/* Box 1: All Designations */}
              <button
                type="button"
                onClick={() => {
                  setSelectedDesignation('all');
                  setActiveStep('roster');
                }}
                className="p-5 rounded-2xl border border-indigo-100 bg-indigo-50/20 hover:border-indigo-300 hover:-translate-y-0.5 hover:shadow-md text-left flex flex-col justify-between h-24 transition-all duration-300 text-indigo-900"
              >
                <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  HQ Audit
                </span>
                <div className="flex items-baseline justify-between w-full mt-2">
                  <span className="text-sm font-bold tracking-tight text-indigo-850 leading-snug">All Designations</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                    {reportData.filter(r => r.department === deptFilter).length} Staff
                  </span>
                </div>
              </button>

              {/* Dynamic unique designation boxes */}
              {(() => {
                const deptRows = reportData.filter(r => r.department === deptFilter);
                const uniqueDesigs = Array.from(new Set(deptRows.map(r => r.designation || 'Staff Member')));
                
                return uniqueDesigs.map(desig => {
                  const count = deptRows.filter(r => r.designation === desig).length;
                  return (
                    <button
                      key={desig}
                      type="button"
                      onClick={() => {
                        setSelectedDesignation(desig);
                        setActiveStep('roster');
                      }}
                      className="p-5 rounded-2xl border border-gray-100 bg-white hover:border-gray-300 hover:-translate-y-0.5 hover:shadow-md text-left flex flex-col justify-between h-24 transition-all duration-300 text-gray-800"
                    >
                      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-450" />
                        Role Roster
                      </span>
                      <div className="flex items-baseline justify-between w-full mt-2 gap-2">
                        <span className="text-sm font-bold tracking-tight text-gray-850 leading-snug truncate max-w-full">
                          {desig}
                        </span>
                        <span className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-gray-50 text-gray-500 border border-gray-100 shrink-0">
                          {count} Staff
                        </span>
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* STEP 4: STAGING ROSTER */}
        {activeStep === 'roster' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Breadcrumbs Navigation */}
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400 select-none pb-4 border-b border-gray-100 flex-wrap">
              <button 
                onClick={() => { setActiveStep('overview'); setDeptFilter('all'); setSelectedDesignation('all'); }}
                className="hover:text-indigo-600 transition-colors cursor-pointer"
              >
                Overview
              </button>
              <span>/</span>
              <button 
                onClick={() => { setActiveStep('departments'); setSelectedDesignation('all'); }}
                className="hover:text-indigo-600 transition-colors cursor-pointer"
              >
                Departments
              </button>
              {deptFilter !== 'all' && (
                <>
                  <span>/</span>
                  <button 
                    onClick={() => { setActiveStep('designations'); }}
                    className="hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    {deptFilter.toUpperCase()}
                  </button>
                </>
              )}
              {selectedDesignation !== 'all' && (
                <>
                  <span>/</span>
                  <span className="text-gray-900 font-bold">{selectedDesignation}</span>
                </>
              )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
              <div className="p-6 rounded-3xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-300">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Total Points Earned</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-gray-900">
                    {filteredData.reduce((acc, curr) => acc + curr.dailyScore, 0).toLocaleString()}
                  </span>
                  <div className="p-2 bg-emerald-50 rounded-xl">
                    <TrendingUp size={20} className="text-emerald-500" />
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-3xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-300">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Total Deductions (Fine)</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-gray-900">
                    ₨{filteredData.reduce((acc, curr) => acc + curr.fines, 0).toLocaleString()}
                  </span>
                  <div className="p-2 bg-rose-50 rounded-xl">
                    <AlertTriangle size={20} className="text-rose-500" />
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-3xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-300 sm:col-span-2 lg:col-span-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Operational Index</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-gray-900">
                    {filteredData.length > 0 ? (filteredData.reduce((acc, curr) => acc + curr.dailyScore, 0) / (filteredData.length * 3) * 100).toFixed(0) : 0}%
                  </span>
                  <div className="p-2 bg-indigo-50 rounded-xl">
                    <CheckCircle size={20} className="text-indigo-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Controls & Filter Tabs */}
            <div className="space-y-4 print:hidden">
              <div className="flex flex-col sm:flex-row gap-3 animate-fadeIn">
                <div className="flex-1 relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-indigo-600" size={18} />
                  <input
                    type="text"
                    placeholder={`Search ${deptFilter === 'all' ? 'global' : deptFilter.replace('-', ' ')} staff by name or role...`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-100 bg-white font-semibold text-sm transition-all focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none placeholder:text-gray-300"
                  />
                </div>
                
                {/* Dynamic Sort by Seniority Filter Button */}
                <button
                  type="button"
                  onClick={() => setSortBySeniority(!sortBySeniority)}
                  className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider border transition-all duration-200 select-none ${
                    sortBySeniority
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25 ring-2 ring-indigo-500/30 hover:bg-indigo-700'
                      : 'bg-white text-gray-700 border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <Award size={16} />
                  Sort Seniority: {sortBySeniority ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Status Filters */}
              <div className="flex flex-wrap items-center gap-2 pb-2 animate-fadeIn">
                {[
                  { id: 'all', label: 'All Statuses', colorClass: 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/15' },
                  { id: 'present', label: 'Present', colorClass: 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/15' },
                  { id: 'leave', label: 'On Leave', colorClass: 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/15' },
                  { id: 'absent', label: 'Absent', colorClass: 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/15' },
                  { id: 'late', label: 'Late', colorClass: 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/15' },
                  { id: 'unmarked', label: 'Unmarked', colorClass: 'bg-gray-650 text-white border-gray-650 shadow-md shadow-gray-500/15' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                      activeFilter === f.id
                        ? f.colorClass
                        : 'bg-white text-gray-500 border-gray-100 hover:border-gray-250 hover:bg-gray-50/50 hover:text-gray-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Master Container wrapping desktop & mobile layouts */}
        {activeStep === 'roster' && (
          <div id="daily-report-table-capture" className="rounded-3xl border border-gray-100 overflow-hidden shadow-sm bg-white transition-all duration-300">
            
            {/* Desktop Table View - Hidden on smaller viewports */}
            <div id="desktop-report-table-wrapper" className="hidden lg:block overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Staff Identity</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Attendance</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Uniform</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Duties</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Score (3)</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Fine</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredData.filter(r => activeFilter === 'all' || r.attendance === activeFilter).map((row) => (
                    <tr key={row.id} className={`group transition-all ${row.isDirty ? 'bg-indigo-50/30' : 'hover:bg-gray-50/30 transition-colors duration-200'}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="min-w-10 h-10 px-2 rounded-xl flex items-center justify-center font-bold text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0 group-hover:scale-105 transition-transform uppercase tracking-wider">
                            {row.employeeId}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 select-none leading-normal">
                              {row.designation || 'Staff Member'}
                            </span>
                            {session?.isEditOnly ? (
                              <span className="text-[11px] font-medium text-gray-500 select-none leading-tight mt-0.5">
                                {row.name}
                              </span>
                            ) : (
                              <a
                                href={`/hq/dashboard/manager/staff/${row.id.includes('_') ? row.id : `${row.department}_${row.id}`}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  router.push(`/hq/dashboard/manager/staff/${row.id.includes('_') ? row.id : `${row.department}_${row.id}`}`);
                                }}
                                className="text-[11px] font-medium text-gray-500 hover:text-indigo-600 transition-colors leading-tight hover:underline cursor-pointer select-none mt-0.5"
                              >
                                {row.name}
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <select
                          value={row.attendance}
                          onChange={(e) => handleInlineUpdate(row.id, 'attendance', e.target.value)}
                          className={`inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border outline-none cursor-pointer select-none transition-all duration-200 appearance-none text-center ${
                            row.attendance === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            row.attendance === 'absent' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                            row.attendance === 'late' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            row.attendance === 'leave' ? 'bg-cyan-50 text-cyan-700 border-cyan-100' :
                            'bg-gray-50 text-gray-700 border border-gray-200'
                          }`}
                        >
                          <option value="unmarked">Unmarked</option>
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                          <option value="late">Late</option>
                          <option value="leave">Leave</option>
                        </select>
                        {row.attendance === 'late' && (
                          <div className="mt-1 flex justify-center">
                            <span
                              onClick={() => {
                                const start = row.dutyStartTime || '09:00';
                                setLatePicker({
                                  id: row.id,
                                  dutyStartTime: start,
                                  arrivalTime: (row as any).arrivalTime || start,
                                  lateMinutes: calculateLateMinutes(start, (row as any).arrivalTime || start)
                                });
                              }}
                              className="font-mono text-[9px] font-bold text-gray-500 bg-gray-50 px-1 py-0.5 rounded border border-gray-100 hover:bg-gray-100 cursor-pointer select-none"
                            >
                              @{(row as any).arrivalTime || 'Set Time'}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <select
                            value={row.uniformStatus}
                            onChange={(e) => handleInlineUpdate(row.id, 'uniformStatus', e.target.value)}
                            className={`inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border outline-none cursor-pointer select-none transition-all duration-200 appearance-none text-center ${
                              row.uniformStatus === 'yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                              row.uniformStatus === 'no' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                              row.uniformStatus === 'incomplete' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              'bg-gray-50 text-gray-700 border border-gray-200'
                            }`}
                          >
                            <option value="na">N/A</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                            <option value="incomplete">Incomplete</option>
                          </select>
                          {row.uniformStatus === 'incomplete' && (
                            <div className="flex flex-col items-center">
                              <button
                                onClick={() => {
                                  const config = (row as any).uniformConfig || [];
                                  const checked = (row as any).uniformItems?.filter((i: any) => i.status === 'yes').map((i: any) => i.key) || [];
                                  setActiveChecklist({
                                    id: row.id,
                                    type: 'uniform',
                                    items: config.length > 0 ? config : [
                                      { key: 'uniform', label: 'Uniform' },
                                      { key: 'shoes', label: 'Polished Shoes' },
                                      { key: 'card', label: 'Identity Card' }
                                    ],
                                    checkedKeys: checked
                                  });
                                }}
                                className="text-[9px] text-amber-600 hover:text-amber-700 underline font-semibold transition-all select-none text-center max-w-[120px] leading-tight"
                              >
                                Missing: {(() => {
                                  const config = (row.uniformConfig && row.uniformConfig.length > 0) ? row.uniformConfig : [
                                    { key: 'uniform', label: 'Uniform' },
                                    { key: 'shoes', label: 'Polished Shoes' },
                                    { key: 'card', label: 'Identity Card' }
                                  ];
                                  const missing = row.details?.uniformMissing?.length > 0
                                    ? row.details.uniformMissing
                                    : config.filter((c: any) => {
                                        const item = row.uniformItems?.find((i: any) => i.key === c.key);
                                        return !item || item.status === 'no';
                                      }).map((c: any) => c.label);
                                  return missing.length > 0 ? missing.join(', ') : config.map((c: any) => c.label).join(', ');
                                })()}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <select
                            value={row.dutyStatus}
                            onChange={(e) => handleInlineUpdate(row.id, 'dutyStatus', e.target.value)}
                            className={`inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border outline-none cursor-pointer select-none transition-all duration-200 appearance-none text-center ${
                              row.dutyStatus === 'yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                              row.dutyStatus === 'no' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                              row.dutyStatus === 'incomplete' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              'bg-gray-50 text-gray-700 border border-gray-200'
                            }`}
                          >
                            <option value="na">N/A</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                            <option value="incomplete">Incomplete</option>
                          </select>
                          {row.dutyStatus === 'incomplete' && (
                            <div className="flex flex-col items-center">
                              <button
                                onClick={() => {
                                  const config = (row as any).dutyConfig || [];
                                  const checked = (row as any).dutyItems?.filter((i: any) => i.status === 'done').map((i: any) => i.key) || [];
                                  setActiveChecklist({
                                    id: row.id,
                                    type: 'duty',
                                    items: config.length > 0 ? config : [
                                      { key: 'morning', label: 'Morning Duty' },
                                      { key: 'afternoon', label: 'Afternoon Duty' },
                                      { key: 'evening', label: 'Evening Duty' }
                                    ],
                                    checkedKeys: checked
                                  });
                                }}
                                className="text-[9px] text-amber-600 hover:text-amber-700 underline font-semibold transition-all select-none text-center max-w-[120px] leading-tight"
                              >
                                Pending: {(() => {
                                  const config = (row.dutyConfig && row.dutyConfig.length > 0) ? row.dutyConfig : [
                                    { key: 'morning', label: 'Morning Duty' },
                                    { key: 'afternoon', label: 'Afternoon Duty' },
                                    { key: 'evening', label: 'Evening Duty' }
                                  ];
                                  const pending = row.details?.dutiesPending?.length > 0
                                    ? row.details.dutiesPending
                                    : config.filter((c: any) => {
                                        const item = row.dutyItems?.find((d: any) => d.key === c.key);
                                        return !item || item.status !== 'done';
                                      }).map((c: any) => c.label);
                                  return pending.length > 0 ? pending.join(', ') : config.map((c: any) => c.label).join(', ');
                                })()}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={`text-sm font-bold ${row.dailyScore >= 2.5 ? 'text-emerald-600' : row.dailyScore >= 1.5 ? 'text-amber-500' : 'text-rose-500'}`}>
                          {row.dailyScore} / 3
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col gap-1.5 items-center">
                          <input
                            type="text"
                            value={row.fineReason || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleInlineUpdate(row.id, 'fineReason', val);
                              if (!val) {
                                handleInlineUpdate(row.id, 'fines', 0);
                              }
                            }}
                            placeholder="Reason for fine"
                            className="w-28 px-2 py-1 text-[10px] border border-gray-200 rounded-lg focus:border-indigo-500 font-medium text-center outline-none bg-white transition-all select-none"
                          />
                          {row.fineReason ? (
                            <div className="flex items-center gap-1.5 mt-1">
                              <input
                                type="number"
                                value={row.fines || ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                                  handleInlineUpdate(row.id, 'fines', val);
                                }}
                                placeholder="Amount"
                                className="w-20 px-2 py-1.5 text-xs text-center border border-gray-200 rounded-xl focus:border-indigo-500 font-bold outline-none bg-white select-none transition-all duration-200"
                              />
                              {row.fines > 0 && (
                                <button
                                  onClick={() => {
                                    handleInlineUpdate(row.id, 'fines', 0);
                                    handleInlineUpdate(row.id, 'fineReason', '');
                                  }}
                                  className="text-rose-500 hover:text-rose-700 transition-colors"
                                  title="Remove fine"
                                >
                                  <XCircle size={16} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[9px] text-gray-400 font-bold uppercase mt-1">Enter reason first</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View - Displays under lg (992px) breakpoint */}
            <div id="mobile-report-cards-wrapper" className="block lg:hidden bg-gray-50/50 p-2 space-y-4">
              {filteredData.filter(r => activeFilter === 'all' || r.attendance === activeFilter).map((row) => (
                <div 
                  key={row.id} 
                  className={`p-4 rounded-2xl bg-white border border-gray-100 shadow-sm flex flex-col gap-3.5 transition-all ${
                    row.isDirty ? 'ring-2 ring-indigo-500/20 border-indigo-200' : 'hover:shadow-md'
                  }`}
                >
                  
                  {/* Mobile Header: Staff details & score */}
                  <div className="flex items-start justify-between gap-3 w-full">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 px-2 rounded-xl flex items-center justify-center font-bold text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0 uppercase tracking-wider">
                        {row.employeeId}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black uppercase tracking-wider text-gray-900 select-none leading-normal truncate">
                          {row.designation || 'Staff Member'}
                        </span>
                        {session?.isEditOnly ? (
                          <span className="text-[11px] font-medium text-gray-500 select-none leading-tight mt-0.5 truncate">
                            {row.name}
                          </span>
                        ) : (
                          <a
                            href={`/hq/dashboard/manager/staff/${row.id.includes('_') ? row.id : `${row.department}_${row.id}`}`}
                            onClick={(e) => {
                              e.preventDefault();
                              router.push(`/hq/dashboard/manager/staff/${row.id.includes('_') ? row.id : `${row.department}_${row.id}`}`);
                            }}
                            className="text-[11px] font-medium text-gray-500 hover:text-indigo-600 transition-colors leading-tight hover:underline cursor-pointer select-none mt-0.5 truncate"
                          >
                            {row.name}
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider select-none ${
                        row.dailyScore >= 3 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50' : 
                        row.dailyScore >= 2 ? 'bg-amber-50 text-amber-700 border border-amber-100/50' : 
                        'bg-rose-50 text-rose-700 border border-rose-100/50'
                      }`}>
                        Today: {row.dailyScore} / 4
                      </span>
                      <span className="inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider select-none bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-700 border border-amber-500/20 font-extrabold shadow-sm">
                        Month: {row.totalScore || 0} XP
                      </span>
                    </div>
                  </div>

                  {/* Form Elements for Easy Tapping */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                    
                    {/* Mobile Attendance */}
                    <div className="flex flex-col gap-1.5 bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50 w-full">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Attendance</label>
                      <div className="flex flex-wrap gap-1 mt-0.5 w-full">
                        {[
                          { value: 'present', label: 'Pres', activeBg: 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20', inactiveBg: 'bg-emerald-50/40 hover:bg-emerald-100/40 text-emerald-700 border border-emerald-100/60' },
                          { value: 'absent', label: 'Abs', activeBg: 'bg-rose-600 text-white shadow-sm shadow-rose-600/20', inactiveBg: 'bg-rose-50/40 hover:bg-rose-100/40 text-rose-700 border border-rose-100/60' },
                          { value: 'late', label: 'Late', activeBg: 'bg-amber-500 text-white shadow-sm shadow-amber-500/20', inactiveBg: 'bg-amber-50/40 hover:bg-amber-100/40 text-amber-700 border border-amber-100/60' },
                          { value: 'leave', label: 'Leave', activeBg: 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/20', inactiveBg: 'bg-cyan-50/40 hover:bg-cyan-100/40 text-cyan-700 border border-cyan-100/60' },
                          { value: 'unmarked', label: 'Unmark', activeBg: 'bg-gray-700 text-white', inactiveBg: 'bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200' }
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleInlineUpdate(row.id, 'attendance', opt.value)}
                            className={`px-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all select-none duration-150 flex-1 text-center shrink-0 min-w-0 ${
                              row.attendance === opt.value ? opt.activeBg : opt.inactiveBg
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {row.attendance === 'late' && (
                        <div className="mt-1">
                          <span
                            onClick={() => {
                              const start = row.dutyStartTime || '09:00';
                              setLatePicker({
                                id: row.id,
                                dutyStartTime: start,
                                arrivalTime: (row as any).arrivalTime || start,
                                lateMinutes: calculateLateMinutes(start, (row as any).arrivalTime || start)
                              });
                            }}
                            className="inline-block font-mono text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 cursor-pointer select-none"
                          >
                            Arrived @ {(row as any).arrivalTime || 'Set Time'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Mobile Uniform */}
                    <div className="flex flex-col gap-1.5 bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50 w-full">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Uniform Code</label>
                      <div className="flex flex-wrap gap-1 mt-0.5 w-full">
                        {[
                          { value: 'yes', label: 'Yes', activeBg: 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20', inactiveBg: 'bg-emerald-50/40 hover:bg-emerald-100/40 text-emerald-700 border border-emerald-100/60' },
                          { value: 'no', label: 'No', activeBg: 'bg-rose-600 text-white shadow-sm shadow-rose-600/20', inactiveBg: 'bg-rose-50/40 hover:bg-rose-100/40 text-rose-700 border border-rose-100/60' },
                          { value: 'incomplete', label: 'Incomp', activeBg: 'bg-amber-500 text-white shadow-sm shadow-amber-500/20', inactiveBg: 'bg-amber-50/40 hover:bg-amber-100/40 text-amber-700 border border-amber-100/60' },
                          { value: 'na', label: 'N/A', activeBg: 'bg-gray-700 text-white', inactiveBg: 'bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200' }
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={row.attendance === 'leave'}
                            onClick={() => handleInlineUpdate(row.id, 'uniformStatus', opt.value)}
                            className={`px-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all select-none duration-150 flex-1 text-center shrink-0 min-w-0 ${
                              row.attendance === 'leave' ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border border-gray-200' :
                              row.uniformStatus === opt.value ? opt.activeBg : opt.inactiveBg
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {row.uniformStatus === 'incomplete' && (
                        <div className="mt-1">
                          <button
                            onClick={() => {
                              const config = (row as any).uniformConfig || [];
                              const checked = (row as any).uniformItems?.filter((i: any) => i.status === 'yes').map((i: any) => i.key) || [];
                              setActiveChecklist({
                                id: row.id,
                                type: 'uniform',
                                items: config.length > 0 ? config : [
                                  { key: 'uniform', label: 'Uniform' },
                                  { key: 'shoes', label: 'Polished Shoes' },
                                  { key: 'card', label: 'Identity Card' }
                                ],
                                checkedKeys: checked
                              });
                            }}
                            className="text-[9px] text-amber-600 hover:text-amber-700 underline font-semibold transition-all select-none text-left leading-tight"
                          >
                            Missing: {(() => {
                              const config = (row.uniformConfig && row.uniformConfig.length > 0) ? row.uniformConfig : [
                                { key: 'uniform', label: 'Uniform' },
                                { key: 'shoes', label: 'Polished Shoes' },
                                { key: 'card', label: 'Identity Card' }
                              ];
                              const missing = row.details?.uniformMissing?.length > 0
                                ? row.details.uniformMissing
                                : config.filter((c: any) => {
                                    const item = row.uniformItems?.find((i: any) => i.key === c.key);
                                    return !item || item.status === 'no';
                                  }).map((c: any) => c.label);
                              return missing.length > 0 ? missing.join(', ') : config.map((c: any) => c.label).join(', ');
                            })()}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Mobile Duties */}
                    <div className="flex flex-col gap-1.5 bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50 w-full">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Duties Performed</label>
                      <div className="flex flex-wrap gap-1 mt-0.5 w-full">
                        {[
                          { value: 'yes', label: 'Yes', activeBg: 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20', inactiveBg: 'bg-emerald-50/40 hover:bg-emerald-100/40 text-emerald-700 border border-emerald-100/60' },
                          { value: 'no', label: 'No', activeBg: 'bg-rose-600 text-white shadow-sm shadow-rose-600/20', inactiveBg: 'bg-rose-50/40 hover:bg-rose-100/40 text-rose-700 border border-rose-100/60' },
                          { value: 'incomplete', label: 'Incomp', activeBg: 'bg-amber-500 text-white shadow-sm shadow-amber-500/20', inactiveBg: 'bg-amber-50/40 hover:bg-amber-100/40 text-amber-700 border border-amber-100/60' },
                          { value: 'na', label: 'N/A', activeBg: 'bg-gray-700 text-white', inactiveBg: 'bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200' }
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={row.attendance === 'leave'}
                            onClick={() => handleInlineUpdate(row.id, 'dutyStatus', opt.value)}
                            className={`px-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all select-none duration-150 flex-1 text-center shrink-0 min-w-0 ${
                              row.attendance === 'leave' ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border border-gray-200' :
                              row.dutyStatus === opt.value ? opt.activeBg : opt.inactiveBg
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {row.dutyStatus === 'incomplete' && (
                        <div className="mt-1">
                          <button
                            onClick={() => {
                              const config = (row as any).dutyConfig || [];
                              const checked = (row as any).dutyItems?.filter((i: any) => i.status === 'done').map((i: any) => i.key) || [];
                              setActiveChecklist({
                                id: row.id,
                                type: 'duty',
                                items: config.length > 0 ? config : [
                                  { key: 'morning', label: 'Morning Duty' },
                                  { key: 'afternoon', label: 'Afternoon Duty' },
                                  { key: 'evening', label: 'Evening Duty' }
                                ],
                                checkedKeys: checked
                              });
                            }}
                            className="text-[9px] text-amber-600 hover:text-amber-700 underline font-semibold transition-all select-none text-left leading-tight"
                          >
                            Pending: {(() => {
                              const config = (row.dutyConfig && row.dutyConfig.length > 0) ? row.dutyConfig : [
                                { key: 'morning', label: 'Morning Duty' },
                                { key: 'afternoon', label: 'Afternoon Duty' },
                                { key: 'evening', label: 'Evening Duty' }
                              ];
                              const pending = row.details?.dutiesPending?.length > 0
                                ? row.details.dutiesPending
                                : config.filter((c: any) => {
                                    const item = row.dutyItems?.find((i: any) => i.key === c.key);
                                    return !item || item.status !== 'done';
                                  }).map((c: any) => c.label);
                              return pending.length > 0 ? pending.join(', ') : config.map((c: any) => c.label).join(', ');
                            })()}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Mobile Fines & Penalty */}
                    <div className="flex flex-col gap-1.5 bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50 sm:col-span-2 w-full">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Fines & Reason</label>
                      <div className="flex flex-col gap-2 w-full">
                        <input
                          type="text"
                          value={row.fineReason || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleInlineUpdate(row.id, 'fineReason', val);
                            if (!val) {
                              handleInlineUpdate(row.id, 'fines', 0);
                            }
                          }}
                          placeholder="Deduction reason..."
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold placeholder:text-gray-300 outline-none focus:border-indigo-500 bg-white"
                        />
                        {row.fineReason ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={row.fines || ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : Number(e.target.value);
                                handleInlineUpdate(row.id, 'fines', val);
                              }}
                              placeholder="Fine amount"
                              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 bg-white"
                            />
                            {row.fines > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleInlineUpdate(row.id, 'fines', 0);
                                  handleInlineUpdate(row.id, 'fineReason', '');
                                }}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shrink-0"
                              >
                                <XCircle size={14} /> Clear
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic text-center">Enter reason first</span>
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              ))}
            </div>

            {filteredData.length === 0 && (
              <div className="py-16 text-center">
                <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Search size={22} className="text-gray-400" />
                </div>
                <h3 className="font-bold text-base text-gray-900 leading-snug">No Analytics Data</h3>
                <p className="text-gray-400 text-xs font-medium mt-1">Adjust filters or search criteria</p>
              </div>
            )}

            {/* Signature & Legal Disclaimer */}
            <div id="report-signature-footer" className="flex items-center justify-between p-8 border-t border-gray-100 bg-white">
              <div className="flex flex-col gap-1 text-left">
                <p className="text-base font-black text-gray-900">Khan Hub Administration</p>
                <p className="text-[10px] text-gray-400 font-mono">Log ID: {reportDate.replace(/-/g, '')}-HQ-{Math.random().toString(36).substring(7).toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-500">© {new Date().getFullYear()} Khan Hub HQ</p>
                <div className="flex items-center justify-end gap-2 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Verified Audit</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE CHECKLIST MODAL with Add Custom Item Input */}
        {activeChecklist && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-gray-100 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
              <h3 className="text-base font-bold text-gray-900 leading-snug tracking-tight mb-1">
                Configure {activeChecklist.type === 'uniform' ? 'Uniform Status' : 'Duty Completion'}
              </h3>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-4">
                Mark completed items for {activeChecklist.type === 'uniform' ? 'dress code' : 'daily tasks'}
              </p>

              {/* Checklist checklist */}
              <div className="space-y-2 mb-4 max-h-52 overflow-y-auto pr-1">
                {activeChecklist.items.map((item) => {
                  const isChecked = activeChecklist.checkedKeys.includes(item.key);
                  return (
                    <label
                      key={item.key}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                        isChecked ? 'bg-indigo-50/40 border-indigo-100 text-indigo-900 font-bold' : 'bg-gray-50/30 border-gray-100 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-xs font-bold uppercase tracking-wider select-none">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setActiveChecklist(prev => {
                            if (!prev) return null;
                            const newChecked = checked
                              ? [...prev.checkedKeys, item.key]
                              : prev.checkedKeys.filter(k => k !== item.key);
                            return { ...prev, checkedKeys: newChecked };
                          });
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>

              {/* Add Custom Duty / Uniform Item Form */}
              <div className="mt-4 pt-4 border-t border-gray-100 mb-6">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Add Custom Requirement</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    list={activeChecklist.type === 'uniform' ? 'common-uniform-items' : 'common-duty-items'}
                    value={newCustomItemText}
                    onChange={(e) => setNewCustomItemText(e.target.value)}
                    placeholder={activeChecklist.type === 'uniform' ? 'e.g. Socks, Apron, Lab Coat...' : 'e.g. Reception, Gate Duty, Data Entry...'}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold placeholder:text-gray-300 outline-none focus:border-indigo-500 bg-white"
                  />
                  <datalist id="common-uniform-items">
                    <option value="Uniform" />
                    <option value="Polished Shoes" />
                    <option value="Identity Card" />
                    <option value="Lab Coat" />
                    <option value="Apron" />
                    <option value="Name Badge" />
                    <option value="Socks" />
                    <option value="Belt" />
                  </datalist>
                  <datalist id="common-duty-items">
                    <option value="Data Entry Management" />
                    <option value="Gate Duty" />
                    <option value="Reception Duty" />
                    <option value="Video Editing" />
                    <option value="Social Media Posting" />
                    <option value="File Management" />
                    <option value="Patient Care" />
                    <option value="Inventory Audit" />
                    <option value="Canteen Duty" />
                  </datalist>
                  <button
                    onClick={() => {
                      if (!newCustomItemText.trim()) return;
                      const label = newCustomItemText.trim();
                      const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now();
                      
                      setActiveChecklist(prev => {
                        if (!prev) return null;
                        if (prev.items.some(i => i.label.toLowerCase() === label.toLowerCase())) {
                          toast.error("Item already exists in checklist");
                          return prev;
                        }
                        return {
                          ...prev,
                          items: [...prev.items, { key, label }],
                          checkedKeys: [...prev.checkedKeys, key]
                        };
                      });
                      setNewCustomItemText('');
                      toast.success(`Added "${label}" to checklist`);
                    }}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs uppercase tracking-wider rounded-xl transition-all select-none"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setActiveChecklist(null);
                    setNewCustomItemText('');
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-50 text-gray-600 font-bold text-xs uppercase tracking-wider rounded-xl border border-gray-100 hover:bg-gray-100 transition-all select-none"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveChecklist(activeChecklist.id, activeChecklist.type, activeChecklist.checkedKeys, activeChecklist.items)}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition-all select-none shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LATE PICKER TIME MODAL */}
        {latePicker && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-gray-100 rounded-3xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
              <h3 className="text-base font-bold text-gray-900 leading-snug tracking-tight mb-1">
                Mark Late Arrival Time
              </h3>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-4">
                Calculate time late relative to duty start
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Shift Start Time</p>
                  <p className="font-mono text-sm font-bold text-gray-700 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 select-none">
                    {latePicker.dutyStartTime}
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Arrival Time</label>
                  <input
                    type="time"
                    value={latePicker.arrivalTime}
                    onChange={(e) => {
                      const arrival = e.target.value;
                      setLatePicker(prev => {
                        if (!prev) return null;
                        const lateMins = calculateLateMinutes(prev.dutyStartTime, arrival);
                        return { ...prev, arrivalTime: arrival, lateMinutes: lateMins };
                      });
                    }}
                    className="w-full bg-white border border-gray-200 text-gray-700 rounded-xl px-3 py-2 text-sm font-mono font-bold outline-none focus:border-indigo-500 cursor-pointer select-none"
                  />
                </div>

                <div className="bg-amber-50/50 border border-amber-100 rounded-xl px-3 py-2 flex items-center justify-between select-none">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Late Penalty</span>
                  <span className="font-mono text-xs font-bold text-amber-700">{latePicker.lateMinutes} mins late</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLatePicker(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-50 text-gray-600 font-bold text-xs uppercase tracking-wider rounded-xl border border-gray-100 hover:bg-gray-100 transition-all select-none"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setReportData(prev => prev.map(row => {
                      if (row.id === latePicker.id) {
                        return {
                          ...row,
                          attendance: 'late',
                          arrivalTime: latePicker.arrivalTime,
                          isDirty: true
                        };
                      }
                      return row;
                    }));
                    setLatePicker(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition-all select-none shadow-sm"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* OFFSCREEN TEMPLATE FOR IMAGE EXPORT */}
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '1200px', overflow: 'hidden', pointerEvents: 'none' }}>
          <div id="daily-report-table-capture-export" className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm font-sans text-gray-900" style={{ width: '1200px' }}>
            
            {/* Branding Header */}
            <div className="flex justify-between items-end mb-8 pb-6 border-b border-gray-100">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 leading-none">Khan Hub HQ</h1>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-2">Performance Intelligence Ledger</p>
                <p className="text-sm text-gray-600 mt-2 font-medium">{new Date(reportDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div className="text-right">
                <div className="inline-block px-3 py-1.5 bg-gray-50 border border-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-xl">Verified Audit</div>
                <p className="text-xs text-gray-400 mt-2 font-mono">Ref: HQ-DPR-{reportDate.replace(/-/g, '')}</p>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="p-6 rounded-3xl border border-gray-100 bg-white shadow-sm">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Total Points Earned</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-gray-900">
                    {filteredData.reduce((acc, curr) => acc + curr.dailyScore, 0).toLocaleString()}
                  </span>
                  <div className="p-2 bg-emerald-50 rounded-xl">
                    <TrendingUp size={20} className="text-emerald-500" />
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-3xl border border-gray-100 bg-white shadow-sm">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Total Deductions (Fine)</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-gray-900">
                    ₨{filteredData.reduce((acc, curr) => acc + curr.fines, 0).toLocaleString()}
                  </span>
                  <div className="p-2 bg-rose-50 rounded-xl">
                    <AlertTriangle size={20} className="text-rose-500" />
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-3xl border border-gray-100 bg-white shadow-sm">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Operational Index</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-gray-900">
                    {filteredData.length > 0 ? (filteredData.reduce((acc, curr) => acc + curr.dailyScore, 0) / (filteredData.length * 3) * 100).toFixed(0) : 0}%
                  </span>
                  <div className="p-2 bg-indigo-50 rounded-xl">
                    <CheckCircle size={20} className="text-indigo-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop-styled Table */}
            <div className="overflow-x-auto w-full bg-white rounded-3xl border border-gray-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Staff Identity</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Attendance</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Uniform</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Duties</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Score (3)</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Fine</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredData.filter(r => activeFilter === 'all' || r.attendance === activeFilter).map((row) => (
                    <tr key={row.id} className="transition-all">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="min-w-10 h-10 px-2 rounded-xl flex items-center justify-center font-bold text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-wider">
                            {row.employeeId}
                          </div>
                          <div>
                            <span className="font-bold text-sm text-gray-900 select-none">
                              {row.name}
                            </span>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{row.designation}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border select-none ${
                          row.attendance === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          row.attendance === 'absent' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                          row.attendance === 'late' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          row.attendance === 'leave' ? 'bg-cyan-50 text-cyan-700 border-cyan-100' :
                          'bg-gray-50 text-gray-700 border border-gray-200'
                        }`}>
                          {row.attendance}
                        </span>
                        {row.attendance === 'late' && (
                          <div className="mt-1 text-[9px] font-mono font-bold text-gray-500">
                            Arrived @ {(row as any).arrivalTime || 'Set Time'}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border select-none ${
                          row.uniformStatus === 'yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          row.uniformStatus === 'no' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                          row.uniformStatus === 'incomplete' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          'bg-gray-50 text-gray-700 border border-gray-200'
                        }`}>
                          {row.uniformStatus === 'na' ? 'N/A' : row.uniformStatus}
                        </span>
                        {row.uniformStatus === 'incomplete' && (
                          <div className="text-[9px] text-amber-600 font-semibold mt-1 max-w-[120px] mx-auto leading-tight">
                            Missing: {(() => {
                              const config = (row.uniformConfig && row.uniformConfig.length > 0) ? row.uniformConfig : [
                                { key: 'uniform', label: 'Uniform' },
                                { key: 'shoes', label: 'Polished Shoes' },
                                { key: 'card', label: 'Identity Card' }
                              ];
                              const missing = row.details?.uniformMissing?.length > 0
                                ? row.details.uniformMissing
                                : config.filter((c: any) => {
                                    const item = row.uniformItems?.find((i: any) => i.key === c.key);
                                    return !item || item.status === 'no';
                                  }).map((c: any) => c.label);
                              return missing.length > 0 ? missing.join(', ') : config.map((c: any) => c.label).join(', ');
                            })()}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border select-none ${
                          row.dutyStatus === 'yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          row.dutyStatus === 'no' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                          row.dutyStatus === 'incomplete' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          'bg-gray-50 text-gray-700 border border-gray-200'
                        }`}>
                          {row.dutyStatus === 'na' ? 'N/A' : row.dutyStatus}
                        </span>
                        {row.dutyStatus === 'incomplete' && (
                          <div className="text-[9px] text-amber-600 font-semibold mt-1 max-w-[120px] mx-auto leading-tight">
                            Pending: {(() => {
                              const config = (row.dutyConfig && row.dutyConfig.length > 0) ? row.dutyConfig : [
                                { key: 'morning', label: 'Morning Duty' },
                                { key: 'afternoon', label: 'Afternoon Duty' },
                                { key: 'evening', label: 'Evening Duty' }
                              ];
                              const pending = row.details?.dutiesPending?.length > 0
                                ? row.details.dutiesPending
                                : config.filter((c: any) => {
                                    const item = row.dutyItems?.find((i: any) => i.key === c.key);
                                    return !item || item.status !== 'done';
                                  }).map((c: any) => c.label);
                              return pending.length > 0 ? pending.join(', ') : config.map((c: any) => c.label).join(', ');
                            })()}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={`text-sm font-bold ${row.dailyScore >= 2.5 ? 'text-emerald-600' : row.dailyScore >= 1.5 ? 'text-amber-500' : 'text-rose-500'}`}>
                          {row.dailyScore} / 3
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={`text-xs font-bold ${row.fines > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                          {row.fines > 0 ? `₨${row.fines.toLocaleString()}` : '—'}
                        </span>
                        {row.fines > 0 && row.fineReason && (
                          <div className="text-[9px] text-gray-400 font-medium mt-0.5 max-w-[100px] mx-auto leading-tight">
                            {row.fineReason}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signature Footer inside capture wrapper */}
            <div className="flex items-center justify-between mt-8 pt-8 border-t border-gray-100 bg-white">
              <div className="flex flex-col gap-1 text-left">
                <p className="text-base font-black text-gray-900">Khan Hub Administration</p>
                <p className="text-[10px] text-gray-400 font-mono">Log ID: {reportDate.replace(/-/g, '')}-HQ-{Math.random().toString(36).substring(7).toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-500">© {new Date().getFullYear()} Khan Hub HQ</p>
                <div className="flex items-center justify-end gap-2 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Verified Audit</p>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
