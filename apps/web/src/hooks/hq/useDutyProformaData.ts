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
import { getDeptPrefix, type StaffDept } from '@/lib/hq/superadmin/staff';

const CACHE_TTL_SECONDS = 300; // 5 minutes cache

function getSimpleId(id?: string): string {
  if (!id) return '';
  const prefixes = [
    'hq_', 'rehab_', 'spims_', 'hospital_', 'sukoon_', 'welfare_',
    'jobcenter_', 'media_', 'it_', 'job-center_', 'social-media_'
  ];
  for (const pref of prefixes) {
    if (id.startsWith(pref)) {
      return id.substring(pref.length);
    }
  }
  return id;
}

function getStaffCollection(dept: StaffDept): string {
  const d = String(dept || '').toLowerCase();
  if (d === 'job-center' || d === 'jobcenter') return 'jobcenter_staff';
  if (d === 'social-media' || d === 'media') return 'media_staff';
  return `${d.replace('-', '_')}_staff`;
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

  const staffId = staff?.id || '';
  const dept = (staff?.department || staff?._dept || 'hq') as StaffDept;

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

        // 1. Fetch latest staff profile if duties are missing or incomplete
        let staffProfile = staff;
        if (!staff?.duties || staff.duties.length === 0) {
          const staffCol = getStaffCollection(dept);
          const staffDocRef = doc(db, staffCol, staffId);
          const staffSnap = await getDoc(staffDocRef).catch(() => null);
          if (staffSnap && staffSnap.exists()) {
            localReads += 1;
            staffProfile = { ...staff, ...staffSnap.data(), id: staffSnap.id };
          } else if (simpleSid && simpleSid !== staffId) {
            const simpleRef = doc(db, staffCol, simpleSid);
            const simpleSnap = await getDoc(simpleRef).catch(() => null);
            if (simpleSnap && simpleSnap.exists()) {
              localReads += 1;
              staffProfile = { ...staff, ...simpleSnap.data(), id: simpleSnap.id };
            }
          }
        }

        // 2. Fetch Duty Logs for this staff (single equality filter: no composite index needed)
        const dutyColName = `${prefix}_duty_logs`;
        const dutyQuery = query(
          collection(db, dutyColName),
          where('staffId', '==', simpleSid)
        );
        const dutySnap = await getDocs(dutyQuery);
        localReads += dutySnap.size;

        const dutyLogs: DailyDutyRecord[] = [];
        dutySnap.forEach((d) => {
          const data = d.data() as DailyDutyRecord;
          const logDate = data.date || '';
          if (logDate.startsWith(monthKey)) {
            dutyLogs.push({ ...data, date: logDate });
          }
        });

        // 3. Fetch Leaves from Attendance for this staff
        const attColName = `${prefix}_attendance`;
        const attQuery = query(
          collection(db, attColName),
          where('staffId', '==', simpleSid)
        );
        const attSnap = await getDocs(attQuery).catch(() => ({ docs: [], size: 0 } as any));
        localReads += attSnap.size;

        const leaves: LeaveRecord[] = [];
        attSnap.docs.forEach((d: any) => {
          const data = d.data();
          const attDate = data.date || '';
          if (attDate.startsWith(monthKey)) {
            leaves.push({ date: attDate, status: data.status });
          }
        });

        // 4. Fetch Holidays from hq_holidays (cacheable)
        let holidays: HolidayRecord[] = [];
        const holidayCacheKey = `holidays_${monthKey}`;
        const cachedHolidays = getCached<HolidayRecord[]>(holidayCacheKey);
        if (cachedHolidays) {
          holidays = cachedHolidays;
        } else {
          const holidaySnap = await getDocs(collection(db, 'hq_holidays')).catch(() => ({ docs: [], size: 0 } as any));
          localReads += holidaySnap.size;
          holidays = holidaySnap.docs
            .map((d: any) => ({ ...d.data() } as HolidayRecord))
            .filter((h: HolidayRecord) => h.date && h.date.startsWith(monthKey));
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
            setError('Permission denied by Firestore rules. Please ensure you are logged in as HQ Superadmin or Manager.');
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
