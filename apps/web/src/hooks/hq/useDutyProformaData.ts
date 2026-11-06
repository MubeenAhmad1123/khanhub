// apps/web/src/hooks/hq/useDutyProformaData.ts
'use client';

import { useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCached, setCached } from '@/lib/queryCache';
import {
  buildProformaModel,
  getKarachiTodayKey,
  type ProformaModel,
  type DailyDutyRecord,
  type HolidayRecord,
  type LeaveRecord,
} from '@/lib/hq/dutyProforma';
import { getDeptPrefix, getDeptCollection } from '@/lib/hq/superadmin/staff';
import { resolveStaffDuties } from '@/data/hqConfig';

const CACHE_TTL_SECONDS = 300; // 5 minutes cache

function getSimpleId(id?: any): string {
  if (!id) return '';
  const str = String(id).trim();
  const prefixes = [
    'hq_', 'rehab_', 'spims_', 'hospital_', 'sukoon_', 'welfare_',
    'jobcenter_', 'media_', 'it_', 'job-center_', 'social-media_'
  ];
  for (const pref of prefixes) {
    if (str.startsWith(pref)) {
      return str.substring(pref.length);
    }
  }
  return str;
}

function getStaffCollection(dept: string): string {
  const d = String(dept || '').toLowerCase();
  if (d === 'job-center' || d === 'jobcenter') return 'jobcenter_staff';
  if (d === 'social-media' || d === 'media') return 'media_staff';
  return `${d.replace('-', '_')}_staff`;
}

function normalizeDateStr(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') {
    const s = val.trim();
    if (s.includes('T')) return s.split('T')[0];
    if (s.includes(' ')) return s.split(' ')[0];
    return s;
  }
  try {
    if (typeof val?.toDate === 'function') {
      const d = val.toDate();
      if (d instanceof Date && !isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
    }
    if (val instanceof Date && !isNaN(val.getTime())) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const day = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    if (typeof val === 'object') {
      const sec = val.seconds ?? val._seconds;
      if (typeof sec === 'number') {
        const d = new Date(sec * 1000);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        }
      }
    }
    if (typeof val === 'number') {
      const d = new Date(val > 1e11 ? val : val * 1000);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
    }
  } catch {
    // fallback
  }
  return '';
}

export interface UseDutyProformaResult {
  model: ProformaModel | null;
  loading: boolean;
  error: string | null;
  readCount: number;
  reload: () => void;
}

export function useDutyProformaData(
  staff: any | null,
  year: number,
  month: number
): UseDutyProformaResult {
  const [model, setModel] = useState<ProformaModel | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [readCount, setReadCount] = useState<number>(0);
  const [reloadTrigger, setReloadTrigger] = useState<number>(0);

  const staffId = staff?.id ? String(staff.id).trim() : '';
  const dept = (staff?.department || staff?.dept || staff?._dept || 'hq') as any;

  useEffect(() => {
    if (!staffId || !year || !month) {
      setModel(null);
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    const cacheKey = `duty_proforma_${staffId}_${year}_${month}`;

    const cached = getCached<ProformaModel>(cacheKey);
    if (cached) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[useDutyProformaData] Cache HIT for ${staffId} (${year}-${month}) - 0 Firestore reads.`);
      }
      setModel(cached);
      setLoading(false);
      setError(null);
      setReadCount(0);
      return;
    }

    async function fetchData() {
      setLoading(true);
      setError(null);
      let localReads = 0;

      try {
        const prefix = getDeptPrefix(dept);
        const simpleSid = getSimpleId(staffId);
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        const candidateIds = Array.from(new Set([staffId, simpleSid].filter(Boolean)));

        // 1. Fetch latest staff profile if duties or config need enrichment
        let staffProfile = staff;
        if (!staff?.duties || staff.duties.length === 0 || !staff?.dutyConfig || staff.dutyConfig.length === 0) {
          const colCandidates = [getStaffCollection(dept), getDeptCollection(dept)];
          for (const colName of colCandidates) {
            if (staffProfile?.duties && staffProfile.duties.length > 0 && staffProfile?.dutyConfig && staffProfile.dutyConfig.length > 0) break;
            for (const cId of candidateIds) {
              const staffDocRef = doc(db, colName, cId);
              const staffSnap = await getDoc(staffDocRef).catch(() => null);
              if (staffSnap && staffSnap.exists()) {
                localReads += 1;
                staffProfile = { ...staff, ...staffSnap.data(), id: staffSnap.id };
                break;
              }
            }
          }
        }

        // Enrich with intelligent duty resolver
        const resolvedDuties = resolveStaffDuties(staffProfile);
        staffProfile = {
          ...staffProfile,
          dutyConfig: resolvedDuties,
          duties: resolvedDuties.map((d: any) => d.label)
        };

        // 2. Fetch Duty Logs for this staff
        const dutyColName = `${prefix}_duty_logs`;
        const dutySnaps = await Promise.all(
          candidateIds.map((cId) =>
            getDocs(query(collection(db, dutyColName), where('staffId', '==', cId))).catch(
              () => ({ docs: [], size: 0 } as any)
            )
          )
        );

        const dutyLogs: DailyDutyRecord[] = [];
        const seenDutyDates = new Set<string>();

        dutySnaps.forEach((snap) => {
          localReads += snap.size || 0;
          (snap.docs || []).forEach((d: any) => {
            const data = (d.data?.() || {}) as DailyDutyRecord;
            const logDate = normalizeDateStr(data.date);
            if (logDate && logDate.startsWith(monthKey) && !seenDutyDates.has(logDate)) {
              seenDutyDates.add(logDate);
              dutyLogs.push({ ...data, date: logDate });
            }
          });
        });

        // 3. Fetch Leaves from Attendance for this staff
        const attColName = `${prefix}_attendance`;
        const attSnaps = await Promise.all(
          candidateIds.map((cId) =>
            getDocs(query(collection(db, attColName), where('staffId', '==', cId))).catch(
              () => ({ docs: [], size: 0 } as any)
            )
          )
        );

        const leaves: LeaveRecord[] = [];
        const seenAttDates = new Set<string>();

        attSnaps.forEach((snap) => {
          localReads += snap.size || 0;
          (snap.docs || []).forEach((d: any) => {
            const data = d.data?.() || {};
            const attDate = normalizeDateStr(data.date);
            if (attDate && attDate.startsWith(monthKey) && !seenAttDates.has(attDate)) {
              seenAttDates.add(attDate);
              leaves.push({ date: attDate, status: data.status });
            }
          });
        });

        // 4. Fetch Holidays from hq_holidays (cacheable)
        let holidays: HolidayRecord[] = [];
        const holidayCacheKey = `holidays_${monthKey}`;
        const cachedHolidays = getCached<HolidayRecord[]>(holidayCacheKey);
        if (cachedHolidays) {
          holidays = cachedHolidays;
        } else {
          const holidaySnap = await getDocs(collection(db, 'hq_holidays')).catch(
            () => ({ docs: [], size: 0 } as any)
          );
          localReads += holidaySnap.size || 0;
          holidays = (holidaySnap.docs || [])
            .map((d: any) => {
              const data = d.data?.() || {};
              const hDate = normalizeDateStr(data.date);
              return { ...data, date: hDate } as HolidayRecord;
            })
            .filter(
              (h: HolidayRecord) =>
                typeof h.date === 'string' && h.date.length >= 7 && h.date.startsWith(monthKey)
            );
          setCached(holidayCacheKey, holidays, CACHE_TTL_SECONDS);
        }

        if (process.env.NODE_ENV !== 'production') {
          console.log(`[useDutyProformaData] Reads for ${staffId} (${year}-${month}): ${localReads}`);
        }

        const builtModel = buildProformaModel({
          staff: staffProfile,
          logs: dutyLogs,
          holidays,
          leaves,
          year,
          month,
          todayKey: getKarachiTodayKey(),
        });

        // Cache the result
        setCached(cacheKey, builtModel, CACHE_TTL_SECONDS);

        if (isMounted) {
          setModel(builtModel);
          setReadCount(localReads);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('[useDutyProformaData] error:', err);
        if (isMounted) {
          if (err?.code === 'permission-denied') {
            setError(
              'Permission denied by Firestore rules. Please ensure you are logged in as HQ Superadmin or Manager.'
            );
          } else {
            setError(err?.message || 'Failed to load duty records.');
          }
          setLoading(false);
        }
      }
    }

    void fetchData();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId, dept, year, month, reloadTrigger]);

  const reload = () => {
    if (staffId && year && month) {
      const cacheKey = `duty_proforma_${staffId}_${year}_${month}`;
      setCached(cacheKey, null as any, 0); // clear cache
    }
    setReloadTrigger((p) => p + 1);
  };

  return { model, loading, error, readCount, reload };
}
