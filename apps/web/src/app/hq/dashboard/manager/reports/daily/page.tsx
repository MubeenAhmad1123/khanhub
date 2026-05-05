'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, orderBy, Timestamp, doc, setDoc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import Link from 'next/link';
import {
  FileText, ArrowLeft, Loader2, Search, Filter,
  Calendar, CheckCircle, XCircle, Info, Download,
  Printer, TrendingUp, Shield, AlertTriangle, Clock,
  Sparkles
} from 'lucide-react';
import { Spinner } from '@/components/ui';
import { getDeptPrefix, getDeptCollection, type StaffDept, listStaffCards } from '@/lib/hq/superadmin/staff';
import { toast } from 'react-hot-toast';
import { HqDailyAttendanceRecord, HqDailyDressCodeRecord, HqDailyDutyRecord } from '@/types/hq';
import { toPng } from 'html-to-image';

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
  gpStatus: 'yes' | 'no' | 'invalid' | 'na';
  gpLink?: string;
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

export default function DailyReportPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [loading, setLoading] = useState(true);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<DailyReportRow[]>([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || (session.role !== 'manager' && session.role !== 'superadmin')) {
      router.push('/hq/login');
      return;
    }
  }, [session, sessionLoading, router]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const depts: StaffDept[] = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'];

      // 1. Fetch from listStaffCards to align with Staff Roster
      const unifiedStaffCards = await listStaffCards({
        dept: 'all',
        status: 'all',
        role: 'personnel',
        fullEnrichment: false
      });

      const staffSnaps = await Promise.all(depts.map(d => 
        getDocs(collection(db, getDeptCollection(d)))
          .catch(() => ({ docs: [] } as any))
      ));
      const allStaff: any[] = [];
      const seenIds = new Set<string>();

      const STAFF_WHITELIST = ['admin', 'staff', 'cashier', 'manager', 'doctor', 'nurse', 'counselor', 'personnel', 'worker', 'internee', 'trial', 'contract', 'volunteer', 'supervisor', 'executive'];

      const isEligibleStaff = (s: any) => {
        const r = String(s.role || '').toLowerCase();
        const n = String(s.name || s.displayName || '').toLowerCase();
        const e = String(s.email || '').toLowerCase();
        
        if (n.includes('super') || n.includes('network') || e.includes('super') || e.includes('network')) {
          return false;
        }

        const isInternee = r.includes('internee');
        const isTrial = r.includes('trial');
        const isContract = r.includes('contract');
        const isWorker = r.includes('worker') || r.includes('junior');
        const isValidStaffRole = isInternee || isTrial || isContract || isWorker || STAFF_WHITELIST.includes(r);

        const statusStr = String(s.status || '').toLowerCase();
        const isActive = s.isActive !== false && statusStr !== 'inactive' && statusStr !== 'resigned' && statusStr !== 'terminated';

        return isActive && isValidStaffRole;
      };

      // First add from unifiedStaffCards
      unifiedStaffCards.forEach(s => {
        if (isEligibleStaff(s)) {
          allStaff.push({
            ...s,
            id: s.staffId,
            department: s.dept
          });
          seenIds.add(s.staffId);
        }
      });

      // Supplement with manual fetch to make sure NO active staff is missed
      staffSnaps.forEach((snap, i) => {
        snap.docs.forEach((doc: any) => {
          const data = doc.data();
          const sid = doc.id;

          if (isEligibleStaff(data) && !seenIds.has(sid)) {
            allStaff.push({ id: sid, department: depts[i], ...data });
            seenIds.add(sid);
          }
        });
      });

      // 2. Fetch Daily Logs for each department
      const attSnaps = await Promise.all(depts.map(d => 
        getDocs(query(collection(db, `${getDeptPrefix(d)}_attendance`), where('date', '==', reportDate)))
          .catch(() => ({ docs: [] } as any))
      ));
      const dressSnaps = await Promise.all(depts.map(d => 
        getDocs(query(collection(db, `${getDeptPrefix(d)}_dress_logs`), where('date', '==', reportDate)))
          .catch(() => ({ docs: [] } as any))
      ));
      const dutySnaps = await Promise.all(depts.map(d => 
        getDocs(query(collection(db, `${getDeptPrefix(d)}_duty_logs`), where('date', '==', reportDate)))
          .catch(() => ({ docs: [] } as any))
      ));
      const fineSnaps = await Promise.all(depts.map(d => 
        getDocs(query(collection(db, `${getDeptPrefix(d)}_fines`), where('date', '==', reportDate)))
          .catch(() => ({ docs: [] } as any))
      ));
      const contribSnaps = await Promise.all(depts.map(d => 
        getDocs(query(collection(db, `${getDeptPrefix(d)}_contributions`), where('date', '==', reportDate)))
          .catch(() => ({ docs: [] } as any))
      ));

      // Maps for fast lookup
      const attMap = new Map();
      const dressMap = new Map();
      const dutyMap = new Map();
      const fineMap = new Map();
      const contribMap = new Map();

      attSnaps.forEach(snap => snap.docs.forEach((d: any) => {
        const data = d.data();
        let sid = data.staffId || d.id;
        if (!data.staffId && sid.endsWith(`_${reportDate}`)) {
          sid = sid.slice(0, -(reportDate.length + 1));
        }
        attMap.set(sid, data);
      }));

      dressSnaps.forEach(snap => snap.docs.forEach((d: any) => {
        const data = d.data();
        let sid = data.staffId || d.id;
        if (!data.staffId && sid.endsWith(`_${reportDate}`)) {
          sid = sid.slice(0, -(reportDate.length + 1));
        }
        dressMap.set(sid, data);
      }));

      dutySnaps.forEach(snap => snap.docs.forEach((d: any) => {
        const data = d.data();
        let sid = data.staffId || d.id;
        if (!data.staffId && sid.endsWith(`_${reportDate}`)) {
          sid = sid.slice(0, -(reportDate.length + 1));
        }
        const existing = dutyMap.get(sid);
        if (!existing || (!existing.duties && data.duties)) {
          dutyMap.set(sid, data);
        }
      }));

      fineSnaps.forEach(snap => snap.docs.forEach((d: any) => {
        const data = d.data();
        let sid = data.staffId || d.id;
        if (!data.staffId && sid.endsWith(`_${reportDate}`)) {
          sid = sid.slice(0, -(reportDate.length + 1));
        }
        const existing = fineMap.get(sid) || [];
        fineMap.set(sid, [...existing, data]);
      }));

      contribSnaps.forEach(snap => snap.docs.forEach((d: any) => {
        const data = d.data();
        let sid = data.staffId || d.id;
        if (!data.staffId && sid.endsWith(`_${reportDate}`)) {
          sid = sid.slice(0, -(reportDate.length + 1));
        }
        contribMap.set(sid, data);
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
        const att = attMap.get(sid);
        const dress = dressMap.get(sid);
        const duty = dutyMap.get(sid);
        const finesList = fineMap.get(sid) || [];
        const contribRecord = contribMap.get(sid);

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

        const contribScore = (contribRecord && (contribRecord.status === 'yes' || contribRecord.isApproved === true)) ? 1 : 0;

        const attPoint = (attendanceStatus === 'present') ? 1 : 0;
        const uniformPoint = (!onLeave && uniformStatus === 'yes') ? 1 : 0;
        const dutyPoint = (!onLeave && dutyStatus === 'yes') ? 1 : 0;
        const contribPoint = (!onLeave && contribScore > 0) ? 1 : 0;

        const totalDailyPoints = attPoint + uniformPoint + dutyPoint + contribPoint;

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
          gpStatus: onLeave ? 'na' : (contribRecord?.status || (contribScore > 0 ? 'yes' : 'no')),
          gpLink: contribRecord?.link || '',
          dailyScore: totalDailyPoints,
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
  }, [session, reportDate]);

  const filteredData = useMemo(() => {
    return reportData.filter(r => {
      const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.designation.toLowerCase().includes(search.toLowerCase());
      const matchesDept = deptFilter === 'all' || r.department === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [reportData, search, deptFilter]);

  const handleDownloadImage = async () => {
    // Target the table directly to avoid scrollbars and get full content width
    const container = document.getElementById('daily-report-table-capture');
    const table = container?.querySelector('table');
    const element = (table || container) as HTMLElement;
    
    if (!element) return;

    try {
      setDownloading(true);
      toast.loading("Preparing high-quality image...", { id: 'download-image' });

      // Use scroll dimensions to ensure the entire table is rendered
      const width = element.scrollWidth;
      const height = element.scrollHeight;

      const dataUrl = await toPng(element, {
        quality: 1.0,
        pixelRatio: 3, 
        backgroundColor: '#FFFFFF',
        width: width + 48, // Add space for padding
        height: height + 48,
        style: {
          padding: '24px',
          margin: '0',
          width: width + 'px',
          height: height + 'px',
          overflow: 'visible'
        }
      });

      const link = document.createElement('a');
      link.download = `HQ_Daily_Report_${reportDate}.png`;
      link.href = dataUrl;
      link.click();

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

  const getAutoValues = (status: DailyReportRow['attendance']) => {
    switch (status) {
      case 'present':
        return { uniform: 'yes', duties: 'yes', gp: 'no', score: 3, fine: 0 };
      case 'absent':
        return { uniform: 'no', duties: 'no', gp: 'no', score: 0, fine: 500 };
      case 'late':
        return { uniform: 'incomplete', duties: 'incomplete', gp: 'invalid', score: 0, fine: 0 };
      case 'leave':
        return { uniform: 'na', duties: 'na', gp: 'na', score: 0, fine: 0 };
      default:
        return null;
    }
  };

  const handleUpdateStatus = (id: string, status: DailyReportRow['attendance']) => {
    const auto = getAutoValues(status);
    if (!auto) return;

    setReportData(prev => prev.map(row => {
      if (row.id === id) {
        return {
          ...row,
          attendance: status,
          uniformStatus: auto.uniform as any,
          dutyStatus: auto.duties as any,
          gpStatus: auto.gp as any,
          dailyScore: auto.score,
          fines: auto.fine,
          isDirty: true
        };
      }
      return row;
    }));
  };

  const handleInlineUpdate = (id: string, field: 'attendance' | 'uniformStatus' | 'dutyStatus' | 'gpStatus' | 'fines' | 'fineReason' | 'gpLink', value: any) => {
    setReportData(prev => prev.map(row => {
      if (row.id === id) {
        const updatedRow = {
          ...row,
          [field]: value,
          isDirty: true
        };

        const onLeave = updatedRow.attendance === 'leave';
        const attPoint = (updatedRow.attendance === 'present') ? 1 : 0;
        const uniformPoint = (!onLeave && updatedRow.uniformStatus === 'yes') ? 1 : 0;
        const dutyPoint = (!onLeave && updatedRow.dutyStatus === 'yes') ? 1 : 0;
        const contribPoint = (!onLeave && updatedRow.gpStatus === 'yes') ? 1 : 0;

        updatedRow.dailyScore = attPoint + uniformPoint + dutyPoint + contribPoint;

        if (field === 'attendance') {
          if (value === 'absent') {
            updatedRow.fines = 500;
            updatedRow.fineReason = 'Absent without leave';
          } else if (value === 'unmarked') {
            updatedRow.fines = 0;
            updatedRow.fineReason = '';
          } else if (value === 'late') {
            const start = updatedRow.dutyStartTime || '09:00';
            setLatePicker({
              id: updatedRow.id,
              dutyStartTime: start,
              arrivalTime: start,
              lateMinutes: 0
            });
            updatedRow.fines = 0;
            updatedRow.fineReason = '';
          } else {
            updatedRow.fines = 0;
            updatedRow.fineReason = '';
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

  const handleSaveChecklist = (id: string, type: 'uniform' | 'duty', checkedKeys: string[]) => {
    setReportData(prev => prev.map(row => {
      if (row.id === id) {
        const config = type === 'uniform' ? (row.uniformConfig || []) : (row.dutyConfig || []);
        const total = config.length;
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
          updatedRow.uniformItems = config.map((c: any) => ({
            key: c.key,
            status: checkedKeys.includes(c.key) ? 'yes' : 'no'
          }));
          updatedRow.details = {
            ...updatedRow.details,
            uniformMissing: config.filter((c: any) => !checkedKeys.includes(c.key)).map((c: any) => c.label)
          };
        } else {
          updatedRow.dutyStatus = status;
          updatedRow.dutyItems = config.map((c: any) => ({
            key: c.key,
            status: checkedKeys.includes(c.key) ? 'done' : 'pending'
          }));
          updatedRow.details = {
            ...updatedRow.details,
            dutiesPending: config.filter((c: any) => !checkedKeys.includes(c.key)).map((c: any) => c.label)
          };
        }

        const onLeave = updatedRow.attendance === 'leave';
        const attPoint = (updatedRow.attendance === 'present') ? 1 : 0;
        const uniformPoint = (!onLeave && updatedRow.uniformStatus === 'yes') ? 1 : 0;
        const dutyPoint = (!onLeave && updatedRow.dutyStatus === 'yes') ? 1 : 0;
        const contribPoint = (!onLeave && updatedRow.gpStatus === 'yes') ? 1 : 0;

        updatedRow.dailyScore = attPoint + uniformPoint + dutyPoint + contribPoint;

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
        const attId = `${row.id}_${reportDate}`;

        await setDoc(doc(db, `${prefix}_attendance`, attId), {
          staffId: row.id,
          date: reportDate,
          status: row.attendance === 'late' ? 'present' : row.attendance,
          isLate: row.attendance === 'late',
          arrivalTime: (row as any).arrivalTime || null,
          updatedAt: Timestamp.now(),
          markedBy: session?.uid
        }, { merge: true });

        if (row.uniformStatus !== 'na') {
          await setDoc(doc(db, `${prefix}_dress_logs`, attId), {
            staffId: row.id,
            date: reportDate,
            status: row.uniformStatus,
            items: (row as any).uniformItems || [],
            updatedAt: Timestamp.now(),
            markedBy: session?.uid
          }, { merge: true });
        }

        if (row.dutyStatus !== 'na') {
          await setDoc(doc(db, `${prefix}_duty_logs`, attId), {
            staffId: row.id,
            date: reportDate,
            status: row.dutyStatus,
            duties: (row as any).dutyItems || [],
            updatedAt: Timestamp.now(),
            markedBy: session?.uid
          }, { merge: true });
        }

        if (row.gpStatus !== 'na') {
          await setDoc(doc(db, `${prefix}_contributions`, attId), {
            staffId: row.id,
            date: reportDate,
            status: row.gpStatus,
            isApproved: row.gpStatus === 'yes',
            link: row.gpLink || '',
            updatedAt: Timestamp.now(),
            markedBy: session?.uid
          }, { merge: true });
        }

        if (row.fines > 0) {
          await setDoc(doc(db, `${prefix}_fines`, attId), {
            staffId: row.id,
            amount: row.fines,
            reason: row.fineReason || (row.attendance === 'absent' ? 'Absent without leave' : 'Penalty'),
            status: 'unpaid',
            date: reportDate,
            createdAt: Timestamp.now(),
            markedBy: session?.uid
          }, { merge: true });
        } else {
          try {
            await deleteDoc(doc(db, `${prefix}_fines`, attId));
          } catch (err) {
            // Document might not exist, safe to ignore
          }
        }

        // Sync to primary staff document for immediate visibility across pages
        const staffDocRef = doc(db, `${prefix}_users`, row.id);
        await updateDoc(staffDocRef, {
          todayAttendance: row.attendance,
          todayUniformStatus: row.uniformStatus,
          todayDutyStatus: row.dutyStatus,
          todayDailyScore: row.dailyScore,
          todayFines: row.fines,
          todayFineReason: row.fineReason || '',
          lastDailyAssessmentDate: reportDate,
          updatedAt: Timestamp.now()
        }).catch((err) => {
          console.warn(`Could not sync to ${prefix}_users/${row.id}:`, err);
        });
      }
      setReportData(prev => prev.map(r => ({ ...r, isDirty: false })));
      toast.success("Assessment saved successfully!", { id: 'save-assessment' });
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
    <div className="min-h-screen bg-[#FDFDFD] text-gray-900 font-sans p-4 md:p-8 pb-32">
      <div id="daily-performance-report-content" className="max-w-7xl mx-auto space-y-8 p-6 md:p-8 rounded-3xl bg-white border border-gray-100 shadow-sm print:p-0 print:shadow-none print:border-none">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
          <div className="flex items-center gap-4">
            <Link
              href="/hq/dashboard/manager"
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

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:border-gray-200">
              <Calendar size={18} className="text-indigo-500" />
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="bg-transparent border-none outline-none font-bold text-xs text-gray-800"
              />
            </div>
            <button
              onClick={saveAssessment}
              disabled={saving || !reportData.some(r => r.isDirty)}
              className="flex items-center gap-2 px-5 py-3.5 bg-indigo-600 text-white rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0 duration-200"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              Save Assessment
            </button>
            <button
              onClick={handleDownloadImage}
              disabled={downloading}
              className="flex items-center gap-2 px-5 py-3.5 bg-white border border-gray-100 text-gray-700 rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-gray-50 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <Loader2 size={16} className="animate-spin text-indigo-600" />
              ) : (
                <Download size={16} />
              )}
              {downloading ? 'Processing...' : 'Export Image'}
            </button>
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-300">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Total Points Earned</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-gray-900">
                {reportData.reduce((acc, curr) => acc + curr.dailyScore, 0).toLocaleString()}
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
                ₨{reportData.reduce((acc, curr) => acc + curr.fines, 0).toLocaleString()}
              </span>
              <div className="p-2 bg-rose-50 rounded-xl">
                <AlertTriangle size={20} className="text-rose-500" />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-300">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Operational GP Index</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-gray-900">
                {reportData.length > 0 ? (reportData.reduce((acc, curr) => acc + curr.dailyScore, 0) / (reportData.length * 4) * 100).toFixed(0) : 0}%
              </span>
              <div className="p-2 bg-indigo-50 rounded-xl">
                <CheckCircle size={20} className="text-indigo-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Controls & Filter Tabs */}
        <div className="space-y-4 print:hidden">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-indigo-600" size={18} />
              <input
                type="text"
                placeholder="Search staff by name or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-100 bg-white font-semibold text-sm transition-all focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none placeholder:text-gray-300"
              />
            </div>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-4 py-3 rounded-2xl border border-gray-100 bg-white font-bold text-xs text-gray-700 cursor-pointer focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all duration-200"
            >
              <option value="all">Global Matrix</option>
              {['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'].map(d => (
                <option key={d} value={d}>{d.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {['all', 'present', 'absent', 'late', 'leave'].map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border shadow-sm ${activeFilter === f
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'
                  }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Report Table */}
        <div id="daily-report-table-capture" className="rounded-3xl border border-gray-100 overflow-hidden shadow-sm bg-white transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Staff Identity</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Attendance</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Uniform</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Duties</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">GP</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Score (4)</th>
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
                        <div>
                          <a
                            href={`/hq/dashboard/manager/staff/${row.id.includes('_') ? row.id : `${row.department}_${row.id}`}`}
                            onClick={(e) => {
                              e.preventDefault();
                              router.push(`/hq/dashboard/manager/staff/${row.id.includes('_') ? row.id : `${row.department}_${row.id}`}`);
                            }}
                            className="font-bold text-sm text-gray-900 group-hover:text-indigo-600 transition-colors leading-snug hover:underline cursor-pointer select-none"
                          >
                            {row.name}
                          </a>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{row.designation}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <select
                        value={row.attendance}
                        onChange={(e) => handleInlineUpdate(row.id, 'attendance', e.target.value)}
                        className={`inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border outline-none cursor-pointer select-none transition-all duration-200 appearance-none text-center ${
                          row.attendance === 'present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          row.attendance === 'absent' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                          row.attendance === 'late' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          row.attendance === 'leave' ? 'bg-cyan-50 text-cyan-700 border border-cyan-100' :
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
                            row.uniformStatus === 'yes' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            row.uniformStatus === 'no' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                            row.uniformStatus === 'incomplete' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
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
                            row.dutyStatus === 'yes' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            row.dutyStatus === 'no' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                            row.dutyStatus === 'incomplete' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
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
                                      const item = row.dutyItems?.find((i: any) => i.key === c.key);
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
                      <div className="flex flex-col gap-1 items-center">
                        <select
                          value={row.gpStatus}
                          onChange={(e) => handleInlineUpdate(row.id, 'gpStatus', e.target.value)}
                          className={`inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border outline-none cursor-pointer select-none transition-all duration-200 appearance-none text-center ${
                            row.gpStatus === 'yes' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                        {row.gpStatus === 'yes' && (
                          <input
                            type="text"
                            value={row.gpLink || ''}
                            onChange={(e) => handleInlineUpdate(row.id, 'gpLink', e.target.value)}
                            placeholder="GP Line / Post"
                            className="w-24 px-2 py-1 text-[10px] border border-gray-200 rounded-lg focus:border-indigo-500 font-medium text-center outline-none bg-white transition-all select-none mt-1"
                          />
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className={`text-sm font-bold ${row.dailyScore >= 3 ? 'text-emerald-600' : row.dailyScore >= 2 ? 'text-amber-500' : 'text-rose-500'}`}>
                        {row.dailyScore} / 4
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col gap-1.5 items-center">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={row.fines || ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : Number(e.target.value);
                              handleInlineUpdate(row.id, 'fines', val);
                            }}
                            placeholder="0"
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
                        {row.fines > 0 && (
                          <input
                            type="text"
                            value={row.fineReason || ''}
                            onChange={(e) => handleInlineUpdate(row.id, 'fineReason', e.target.value)}
                            placeholder="Reason"
                            className="w-24 px-2 py-1 text-[10px] border border-gray-200 rounded-lg focus:border-indigo-500 font-medium text-center outline-none bg-white transition-all select-none"
                          />
                        )}
                      </div>
                    </td>


                  </tr>
                ))}
              </tbody>
            </table>
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
        </div>

        {/* Signature & Legal Disclaimer */}
        <div className="flex items-center justify-between pt-8 mt-8 border-t border-gray-100 print:pt-6 print:mt-6">
          <div className="flex flex-col gap-1">
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

        {/* ACTIVE CHECKLIST MODAL */}
        {activeChecklist && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-gray-100 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
              <h3 className="text-base font-bold text-gray-900 leading-snug tracking-tight mb-1">
                Configure {activeChecklist.type === 'uniform' ? 'Uniform Status' : 'Duty Completion'}
              </h3>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-4">
                Mark completed items for {activeChecklist.type === 'uniform' ? 'dress code' : 'daily tasks'}
              </p>

              <div className="space-y-2 mb-6 max-h-52 overflow-y-auto pr-1">
                {activeChecklist.items.map((item) => {
                  const isChecked = activeChecklist.checkedKeys.includes(item.key);
                  return (
                    <label
                      key={item.key}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                        isChecked ? 'bg-indigo-50/40 border-indigo-100 text-indigo-900' : 'bg-gray-50/30 border-gray-100 text-gray-600 hover:bg-gray-50'
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

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveChecklist(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-50 text-gray-600 font-bold text-xs uppercase tracking-wider rounded-xl border border-gray-100 hover:bg-gray-100 transition-all select-none"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveChecklist(activeChecklist.id, activeChecklist.type, activeChecklist.checkedKeys)}
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
      </div>
    </div>
  );
}
