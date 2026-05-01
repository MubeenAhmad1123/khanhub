'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  addDoc,
  serverTimestamp,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDateDMY } from '@/lib/utils';
import { loginUniversal } from '@/lib/hq/auth/universalAuth';
import EyePasswordInput from '@/components/job-center/EyePasswordInput';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { checkIdUniqueness } from '@/lib/hq/auth/universalAuth';
import {
  Loader2,
  Users,
  ShieldCheck,
  UserPlus,
  Home,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Phone,
  DollarSign,
  Briefcase,
  Building2,
  ChevronRight,
  TrendingUp,
  History,
  Camera,
  Plus,
  Trash2,
  FileText,
  Smartphone,
  User,
  Mail,
  Lock,
  Unlock,
  X,
  Calendar,
  ClipboardList,
  Scissors,
  CheckCircle,
  XCircle,
  ShieldAlert,
  UploadCloud,
  FileCheck,
  ArrowRightCircle,
  Fingerprint,
  Crosshair,
  Activity,
  BookOpen,
  Heart
} from 'lucide-react';
import { BrutalistCalendar } from '@/components/ui';
import { createRehabUserServer, createStaffMemberServer } from '@/app/departments/rehab/actions/createRehabUser';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import toast from 'react-hot-toast';
import { getDeptCollection, getDeptPrefix, type StaffDept } from '@/lib/hq/superadmin/staff';
import { GLOBAL_DUTIES, GLOBAL_DRESS_ITEMS, UNIFORM_RULES } from '@/data/hqConfig';

type TabType = 'admin' | 'staff' | 'client';

const DEPARTMENTS = [
  { id: 'hq' as StaffDept, name: 'HQ / Khan Hub', fullName: 'HQ / Khan Hub', icon: Users, color: 'gray', emailDomain: '@khanhub.io', prefix: 'HQ' },
  { id: 'rehab' as StaffDept, name: 'Rehab Center', fullName: 'Khan Hub Rehabilitation Center', icon: Building2, color: 'blue', emailDomain: '@rehab.khanhub', prefix: 'REHAB', clientCollection: 'rehab_patients', clientLabel: 'Patient' },
  { id: 'spims' as StaffDept, name: 'SPIMS Academy', fullName: 'SPIMS Academy', icon: TrendingUp, color: 'purple', emailDomain: '@spims.khanhub', prefix: 'SPIMS', clientCollection: 'spims_students', clientLabel: 'Student' },
  { id: 'hospital' as StaffDept, name: 'Khan Hospital', fullName: 'Khan Hospital', icon: Activity, color: 'emerald', emailDomain: '@hospital.khanhub', prefix: 'HOSP', clientCollection: 'hospital_patients', clientLabel: 'Patient' },
  { id: 'sukoon' as StaffDept, name: 'Sukoon Center', fullName: 'Sukoon Center', icon: Home, color: 'orange', emailDomain: '@sukoon.khanhub', prefix: 'SUK', clientCollection: 'sukoon_patients', clientLabel: 'Patient' },
  { id: 'welfare' as StaffDept, name: 'Welfare', fullName: 'Khan Welfare Foundation', icon: Heart, color: 'rose', emailDomain: '@welfare.khanhub', prefix: 'WEL', clientCollection: 'welfare_children', clientLabel: 'Child' },
  { id: 'job-center' as StaffDept, name: 'Job Center', fullName: 'Khan Job Center', icon: Briefcase, color: 'amber', emailDomain: '@job-center.khanhub', prefix: 'JOB', clientCollection: 'job_center_seekers', clientLabel: 'Seeker' },
  { id: 'social-media' as StaffDept, name: 'Social Media', fullName: 'Social Media', icon: Smartphone, color: 'pink', emailDomain: '@media.khanhub', prefix: 'MED' },
  { id: 'it' as StaffDept, name: 'IT Department', fullName: 'IT Department', icon: ShieldCheck, color: 'indigo', emailDomain: '@it.khanhub', prefix: 'IT' },
];

const DOCUMENT_TYPES = [
  "CNIC Copy (Front)", "CNIC Copy (Back)", "Educational Certificate",
  "Medical Certificate", "Police Clearance", "Contract/Agreement", "Other"
];

const DEFAULT_DUTY_TIMES: Record<string, { start: string; end: string }> = {
  'hospital': { start: '08:00', end: '20:00' },
  'spims': { start: '09:00', end: '14:00' },
  'rehab': { start: '08:00', end: '20:00' },
  'sukoon-center': { start: '10:00', end: '17:00' },
  'welfare': { start: '09:00', end: '17:00' },
  'job-center': { start: '09:00', end: '18:00' },
  'social-media': { start: '09:00', end: '21:00' },
  'it': { start: '09:00', end: '21:00' },
  'hq': { start: '09:00', end: '17:00' },
};

function getDressCodeKey(department: string, gender: string, designation: string): string {
  const dept = department.toLowerCase();
  const gen = gender.toLowerCase();
  const desig = designation.toLowerCase();

  if (desig.includes('doctor')) return `${dept}_${gen}_doctor`;
  if (desig.includes('admin')) return `${dept}_${gen}_admin`;
  if (desig.includes('security')) return `${dept}_${gen}_security`;
  if (desig.includes('reception')) return `${dept}_${gen}_reception`;
  if (desig.includes('teacher') || desig.includes('lecturer')) return `${dept}_${gen}_teacher`;
  if (desig.includes('cashier')) return `${dept}_${gen}_cashier`;

  return `${dept}_${gen}_default`;
}

function generateEmployeeId(): string {
  const prefix = 'STAFF';
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${num}`;
}

export default function ManagerUsersPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [activeTab, setActiveTab] = useState<TabType | 'tasks'>('admin');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingConfig, setProcessingConfig] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    customId: '',
    userId: '',
    employeeId: '',
    displayName: '',
    password: '',
    firstName: '',
    lastName: '',
    fatherName: '',
    gender: 'male',
    dateOfBirth: '',
    cnic: '',
    phone: '',
    email: '',
    emergencyContact: { name: '', phone: '' },
    photoUrl: '',
    department: 'hq',
    designation: '',
    staffRole: 'Worker',
    joiningDate: new Date().toISOString().split('T')[0],
    salary: '',
    dutyStartTime: '08:00',
    dutyEndTime: '20:00',
    dutyConfig: [] as { key: string; label: string }[],
    dressCodeConfig: [] as { key: string; label: string }[],
    education: [] as { degree: string; institution: string; year: string }[],
    experience: [] as { title: string; company: string; duration: string }[],
    skills: [] as string[],
    documents: [] as { type: string; url: string; name: string }[],
    createAccount: true,
    patientId: '',
  });

  const [newEdu, setNewEdu] = useState({ degree: '', institution: '', year: '' });
  const [newExp, setNewExp] = useState({ title: '', company: '', duration: '' });
  const [newSkill, setNewSkill] = useState('');

  const [uploading, setUploading] = useState<string | null>(null);
  const [employeeCount, setEmployeeCount] = useState(0);

  const [showPassword, setShowPassword] = useState(false);
  const [lastCreated, setLastCreated] = useState<{ customId: string, password: string, name: string } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Dynamic Configuration State
  const [availableDuties, setAvailableDuties] = useState<{key: string, label: string}[]>([]);
  const [availableDress, setAvailableDress] = useState<{key: string, label: string}[]>([]);
  const [addingConfig, setAddingConfig] = useState<{type: 'duty' | 'dress', mode: 'select' | 'custom'} | null>(null);
  const [addingConfigSelection, setAddingConfigSelection] = useState('');
  const [addingConfigCustom, setAddingConfigCustom] = useState('');

  useEffect(() => {
    const isDark = localStorage.getItem('hq_dark_mode') === 'true';
    setDarkMode(isDark);
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'manager') {
      router.push('/hq/login');
      return;
    }
  }, [session, sessionLoading, router]);

  const fetchUsers = async () => {
    try {
      const deptDetails = DEPARTMENTS.find(d => d.id === formData.department) || DEPARTMENTS[0];
      const collectionName = getDeptCollection(deptDetails.id);

      const snap = await getDocs(query(collection(db, collectionName), orderBy('createdAt', 'desc'), limit(50)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setUsers(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCounts = async () => {
    try {
      const deptDetails = DEPARTMENTS.find(d => d.id === formData.department);
      if (!deptDetails) return;
      const snap = await getDocs(collection(db, getDeptCollection(deptDetails.id)));
      setEmployeeCount(snap.size);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!session || session.role !== 'manager') return;
    fetchUsers();
    fetchCounts();
  }, [session, formData.department, activeTab]);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const metaDoc = await getDoc(doc(db, `hq_meta`, 'config'));
        const metaData = metaDoc.exists() ? metaDoc.data() : { customDuties: [], customDress: [] };
        
        setAvailableDuties([
          ...GLOBAL_DUTIES.map(d => ({ key: d.toLowerCase().replace(/\s+/g, '_'), label: d })),
          ...(metaData.customDuties || [])
        ]);
        
        setAvailableDress([
          ...GLOBAL_DRESS_ITEMS.map(d => ({ key: d.toLowerCase().replace(/\s+/g, '_'), label: d })),
          ...(metaData.customDress || [])
        ]);
      } catch (err) {
        console.error("Error fetching global meta config:", err);
      }
    };
    fetchMeta();
  }, []);

  const handleAddConfig = async () => {
    if (!addingConfig || processingConfig) return;
    setProcessingConfig(true);
    const { type, mode } = addingConfig;
    let newItem: {key: string, label: string} | null = null;

    if (mode === 'select' && addingConfigSelection) {
       const opts = type === 'duty' ? availableDuties : availableDress;
       newItem = opts.find(o => o.key === addingConfigSelection) || null;
    } else if (mode === 'custom' && addingConfigCustom.trim()) {
       const label = addingConfigCustom.trim();
       const key = label.toLowerCase().replace(/\s+/g, '_');
       newItem = { key, label };

       try {
         const metaRef = doc(db, `hq_meta`, 'config');
         const metaDoc = await getDoc(metaRef);
         const field = type === 'duty' ? 'customDuties' : 'customDress';
         const existing = metaDoc.exists() ? (metaDoc.data()[field] || []) : [];
         if (!existing.find((e: any) => e.key === key)) {
            await setDoc(metaRef, { [field]: [...existing, newItem] }, { merge: true });
            toast.success(`${type === 'duty' ? 'Duty' : 'Dress Item'} stored globally!`);
            
            if (type === 'duty') setAvailableDuties(prev => [...prev, newItem!]);
            else setAvailableDress(prev => [...prev, newItem!]);
         }
       } catch (err) { console.error(err); }
    }

    if (newItem) {
      if (type === 'duty') {
        if (!formData.dutyConfig.find(d => d.key === newItem!.key)) {
          setFormData(prev => ({ ...prev, dutyConfig: [...prev.dutyConfig, newItem!] }));
        }
      } else {
        if (!formData.dressCodeConfig.find(d => d.key === newItem!.key)) {
          setFormData(prev => ({ ...prev, dressCodeConfig: [...prev.dressCodeConfig, newItem!] }));
        }
      }
    }
    setAddingConfig(null);
    setAddingConfigSelection('');
    setAddingConfigCustom('');
    setProcessingConfig(false);
  };

  const addEdu = () => {
    if (newEdu.degree && newEdu.institution) {
      setFormData({ ...formData, education: [...formData.education, newEdu] });
      setNewEdu({ degree: '', institution: '', year: '' });
    }
  };

  const removeEdu = (index: number) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  const addExp = () => {
    if (newExp.title && newExp.company) {
      setFormData({ ...formData, experience: [...formData.experience, newExp] });
      setNewExp({ title: '', company: '', duration: '' });
    }
  };

  const removeExp = (index: number) => {
    setFormData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
  };

  const addSkill = () => {
    const s = newSkill.trim();
    if (s && !formData.skills.includes(s)) {
      setFormData({ ...formData, skills: [...formData.skills, s] });
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const handleFileUpload = async (file: File, type: string = 'profile') => {
    if (file.type.startsWith('image/') && file.type !== 'image/webp') {
      toast.error("Only .webp images are allowed.");
      return;
    }
    const fieldId = type === 'profile' ? 'photoUrl' : 'document';
    setUploading(fieldId);
    try {
      const url = await uploadToCloudinary(file, `Khan Hub/staff/${type}`);
      if (type === 'profile') {
        setFormData(prev => ({ ...prev, photoUrl: url }));
      } else {
        setFormData(prev => ({
          ...prev,
          documents: [...prev.documents, { type, url, name: file.name }]
        }));
      }
      toast.success(`${type} uploaded successfully`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(null);
    }
  };

  useEffect(() => {
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    const empId = generateEmployeeId();
    const deptDetails = DEPARTMENTS.find(d => d.id === formData.department);
    const domain = deptDetails ? deptDetails.emailDomain : '@rehab.Khan Hub';
    const autoEmail = `${empId.toLowerCase()}${domain}`;

    setFormData(prev => ({
      ...prev,
      customId: empId.toLowerCase(),
      displayName: fullName,
      email: autoEmail
    }));
  }, [formData.firstName, formData.lastName, employeeCount, formData.department]);

  useEffect(() => {
    const times = DEFAULT_DUTY_TIMES[formData.department];
    if (times) {
      setFormData(prev => ({ ...prev, dutyStartTime: times.start, dutyEndTime: times.end }));
    }

    const key = getDressCodeKey(formData.department, formData.gender, formData.designation);
    const suggested = UNIFORM_RULES[key] ||
      (formData.gender === 'male'
        ? [
            { key: 'dress_pant', label: 'Dress Pant' },
            { key: 'dress_shirt', label: 'Dress Shirt' },
            { key: 'tie', label: 'Tie' },
            { key: 'id_card', label: 'ID Card' },
            { key: 'shoes', label: 'Shoes' }
          ]
        : [
            { key: 'id_card', label: 'ID Card' },
            { key: 'shoes', label: 'Shoes' }
          ]);

    setFormData(prev => ({ ...prev, dressCodeConfig: suggested }));
  }, [formData.department, formData.gender, formData.designation]);

  const validateCustomId = (id: string) => /^[a-zA-Z0-9_-]{3,15}$/.test(id);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    setToggling(id);
    try {
      await updateDoc(doc(db, 'hq_users', id), { isActive: !currentStatus });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !currentStatus } : u));
    } catch (err) {
      console.error(err);
    } finally {
      setToggling(null);
    }
  };

  const handleAdminSubmit = async () => {
    if (!formData.customId || !formData.displayName || !formData.password) {
      setMessage({ type: 'error', text: 'Please fill all required fields' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const uniqueness = await checkIdUniqueness(formData.customId);
    if (!uniqueness.isUnique) {
      setMessage({ type: 'error', text: `ABORTED: The User ID "${formData.customId}" is already taken by a profile in the ${uniqueness.existingDept} department. Please choose a different ID.` });
      setSubmitting(false);
      return;
    }

    try {
      const deptDetails = DEPARTMENTS.find(d => d.id === formData.department) || DEPARTMENTS[0];
      const q = query(collection(db, getDeptCollection(deptDetails.id)), where('role', '==', 'admin'), where('isActive', '==', true));
      const snap = await getDocs(q);
      if (!snap.empty) {
        throw new Error('An active Admin account already exists. Only one primary Admin is allowed.');
      }

      const res = await createRehabUserServer(
        formData.customId,
        formData.password,
        'admin',
        formData.displayName,
        undefined,
        deptDetails.emailDomain,
        getDeptCollection(deptDetails.id)
      );

      if (res.success) {
        setLastCreated({
          customId: formData.customId,
          password: formData.password,
          name: formData.displayName
        });
        setMessage({ type: 'success', text: `Admin account ${formData.customId} created successfully.` });
        setFormData({ ...formData, customId: '', displayName: '', password: '' });
        fetchUsers();
      } else {
        throw new Error(res.error || 'Failed to create account');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStaffSubmit = async () => {
    if (!formData.firstName || !formData.fatherName || !formData.phone || !formData.joiningDate || !formData.department) {
      setMessage({ type: 'error', text: 'Please fill all required fields marked with *' });
      toast.error('Missing required fields (Name, Father Name, Phone, etc.)');
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setLastCreated(null);

    const targetUserId = formData.userId || formData.customId;
    if (targetUserId) {
      const uniqueness = await checkIdUniqueness(targetUserId);
      if (!uniqueness.isUnique) {
        setMessage({ type: 'error', text: `ABORTED: The User ID "${targetUserId}" is already taken by a profile in the ${uniqueness.existingDept} department. Please choose a different ID.` });
        setSubmitting(false);
        return;
      }
    }

    try {
      const empId = formData.employeeId || generateEmployeeId();
      let loginUserId = null;
      const pass = formData.password || 'admin123';

      const deptDetails = DEPARTMENTS.find(d => d.id === formData.department) || DEPARTMENTS[0];

      if (formData.createAccount) {
        const res = await createRehabUserServer(
          formData.userId || formData.customId || empId.toLowerCase(),
          pass,
          'staff',
          `${formData.firstName} ${formData.lastName}`,
          undefined,
          deptDetails.emailDomain,
          getDeptCollection(deptDetails.id)
        );

        if (!res.success) throw new Error(res.error || 'Failed to create login account');
        loginUserId = res.uid;
      }

      const collectionName = getDeptCollection(deptDetails.id);
      const staffRef = collection(db, collectionName);

      await addDoc(staffRef, {
        employeeId: empId,
        userId: formData.userId || formData.customId || empId.toLowerCase(),
        loginEmail: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        fatherName: formData.fatherName,
        name: `${formData.firstName} ${formData.lastName}`,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        cnic: formData.cnic,
        phone: formData.phone,
        emergencyContact: formData.emergencyContact,
        photoUrl: formData.photoUrl || null,
        department: formData.department,
        designation: formData.designation,
        role: formData.staffRole,
        joiningDate: formData.joiningDate,
        salary: Number(formData.salary) || 0,
        dutyStartTime: formData.dutyStartTime,
        dutyEndTime: formData.dutyEndTime,
        dutyConfig: formData.dutyConfig,
        dressCodeConfig: formData.dressCodeConfig,
        education: formData.education,
        experience: formData.experience,
        skills: formData.skills,
        documents: formData.documents,
        loginUserId: loginUserId,
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: session?.customId || 'manager',
      });

      if (formData.createAccount) {
        setLastCreated({
          customId: formData.userId || formData.customId || empId.toLowerCase(),
          password: pass,
          name: `${formData.firstName} ${formData.lastName}`
        });
      }

      setMessage({ type: 'success', text: `Staff profile ${empId} created successfully.` });
      toast.success(`Staff profile initialized: ${empId}`);

      setFormData(prev => ({
        ...prev,
        firstName: '', lastName: '', fatherName: '', password: '', photoUrl: '', phone: '', cnic: '', dateOfBirth: '',
        designation: '', salary: '', dutyConfig: [], dressCodeConfig: [], education: [], experience: [], skills: [], documents: [], patientId: '',
        userId: '', employeeId: ''
      }));

      fetchUsers();
      fetchCounts();
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message });
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClientSubmit = async () => {
    if (!formData.customId || !formData.displayName || !formData.password || !formData.patientId) {
      setMessage({ type: 'error', text: 'Please fill all required fields' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const uniqueness = await checkIdUniqueness(formData.customId);
    if (!uniqueness.isUnique) {
      setMessage({ type: 'error', text: `ABORTED: The User ID "${formData.customId}" is already taken by a profile in the ${uniqueness.existingDept} department. Please choose a different ID.` });
      setSubmitting(false);
      return;
    }

    try {
      const deptDetails = DEPARTMENTS.find(d => d.id === formData.department) || DEPARTMENTS[0];
      const clientCollection = deptDetails.clientCollection || 'rehab_patients';
      const idLabel = `${deptDetails.clientLabel || 'Patient'} ID`;

      const q = query(collection(db, clientCollection), where('customId', '==', formData.patientId));
      const snap = await getDocs(q);
      if (snap.empty) {
        throw new Error(`${idLabel} ${formData.patientId} not found in ${formData.department}.`);
      }

      const res = await createRehabUserServer(
        formData.customId,
        formData.password,
        'client',
        formData.displayName,
        formData.patientId,
        deptDetails.emailDomain,
        getDeptCollection(deptDetails.id)
      );

      if (res.success) {
        setLastCreated({
          customId: formData.customId,
          password: formData.password,
          name: formData.displayName
        });
        setMessage({ type: 'success', text: `Client account ${formData.customId} linked to ${formData.patientId} successfully.` });
        setFormData({ ...formData, customId: '', displayName: '', password: '', patientId: '' });
        fetchUsers();
      } else {
        throw new Error(res.error || 'Failed to create client account');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-300 pb-20 overflow-x-hidden w-full max-w-full bg-[#FDFDFD] text-gray-900 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-3">
              <Activity size={14} />
              <span>Identity Provisioning Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 tracking-tight text-gray-900">
              <Users className="w-8 h-8 text-indigo-500" />
              Account Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Create and manage administrative, staff, and family credentials seamlessly.
            </p>
          </div>

          <div className="flex items-center gap-4 px-5 py-3 rounded-2xl border border-gray-100 bg-gray-50/50 w-full sm:w-auto">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-indigo-50 flex items-center justify-center">
                  <Users className="w-4 h-4 text-indigo-500" />
                </div>
              ))}
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-tight text-indigo-600 leading-none">Global Access</p>
              <p className="text-[11px] font-medium text-gray-500">Unified Account Hub</p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="p-1.5 rounded-2xl flex flex-wrap gap-1 bg-gray-50 border border-gray-200/60 max-w-md">
          {[
            { id: 'admin', icon: ShieldCheck, label: 'Admin' },
            { id: 'staff', icon: UserPlus, label: 'Staff' },
            { id: 'client', icon: Home, label: 'Client / User' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as TabType); setMessage(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 ${activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'hover:bg-gray-100/80 text-gray-600 hover:text-gray-900'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Main Form Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <div className="lg:col-span-2 space-y-6">

            {/* Department Horizontal Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Select Active Department</label>
              <div className="flex flex-wrap gap-2.5">
                {DEPARTMENTS.map(dept => (
                  <button
                    key={dept.id}
                    onClick={() => { setFormData({ ...formData, department: dept.id }); fetchCounts(); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all cursor-pointer ${formData.department === dept.id
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-600/10'
                        : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50 shadow-sm'
                      }`}
                  >
                    <div className={formData.department === dept.id ? 'text-indigo-600' : 'text-gray-400'}>
                      <dept.icon size={20} />
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-semibold tracking-tight ${formData.department === dept.id ? 'text-indigo-700' : 'text-gray-800'}`}>{dept.name}</p>
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{dept.prefix}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Form Box */}
            <div className="rounded-3xl border border-gray-100 p-6 md:p-8 bg-white shadow-sm transition-all duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 pb-6 border-b border-gray-50">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${activeTab === 'admin' ? 'bg-indigo-50 text-indigo-600' :
                    activeTab === 'staff' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                  {activeTab === 'admin' ? <ShieldCheck className="w-6 h-6" /> :
                    activeTab === 'staff' ? <UserPlus className="w-6 h-6" /> : <Home className="w-6 h-6" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-gray-900">
                    Create {activeTab} Account
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {activeTab === 'admin' ? 'Strategic administrative oversight credentials' :
                      activeTab === 'staff' ? 'Operational and clinical personnel management' :
                        `${DEPARTMENTS.find(d => d.id === formData.department)?.clientLabel || 'Client'} family and guardian portal access`}
                  </p>
                </div>
              </div>

              {lastCreated && (
                <div className="mb-8 p-6 rounded-2xl bg-indigo-600 text-white shadow-md relative overflow-hidden animate-in zoom-in-95 duration-500">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                          <Unlock className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-sm tracking-wide">Credentials Generated</h3>
                      </div>
                      <button onClick={() => setLastCreated(null)} className="text-white/60 hover:text-white transition-colors">
                        <XCircle size={22} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/10 p-4 rounded-xl border border-white/10">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200 mb-1">Access Identity</p>
                        <p className="text-base font-mono font-bold tracking-tight">{lastCreated.customId}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200 mb-1">Secure Password</p>
                        <p className="text-base font-mono font-bold tracking-tight">{lastCreated.password}</p>
                      </div>
                    </div>

                    <p className="mt-4 text-[10px] font-medium opacity-80 leading-relaxed">
                      IMPORTANT: Please provide these credentials to {lastCreated.name}. Passwords are encrypted after this session.
                    </p>
                  </div>
                </div>
              )}

              {message && (
                <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${message.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-100 text-emerald-600'
                    : 'bg-rose-50 border border-rose-100 text-rose-600'
                  }`}>
                  {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                  <p className="text-sm font-semibold">{message.text}</p>
                </div>
              )}

              <div className="space-y-6">

                {/* ADMIN & CLIENT FORMS (Minimal Grid) */}
                {(activeTab === 'admin' || activeTab === 'client') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-500">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 ml-1 uppercase tracking-wider">Custom User ID</label>
                      <div className="relative group">
                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                          type="text"
                          placeholder="e.g. jdoe_001"
                          value={formData.customId}
                          onChange={e => setFormData({ ...formData, customId: e.target.value.toLowerCase().replace(/\s/g, '') })}
                          className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200/80 bg-gray-50/50 hover:bg-white focus:bg-white text-sm font-semibold transition-all outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 ml-1 uppercase tracking-wider">Full Display Name</label>
                      <div className="relative group">
                        <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                          type="text"
                          placeholder="e.g. Johnathan Doe"
                          value={formData.displayName}
                          onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200/80 bg-gray-50/50 hover:bg-white focus:bg-white text-sm font-semibold transition-all outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 ml-1 uppercase tracking-wider">Secure Password</label>
                      <div className="relative group">
                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min 6 characters"
                          value={formData.password}
                          onChange={e => setFormData({ ...formData, password: e.target.value })}
                          className="w-full pl-11 pr-12 py-3 rounded-xl border border-gray-200/80 bg-gray-50/50 hover:bg-white focus:bg-white text-sm font-semibold transition-all outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {activeTab === 'client' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 ml-1 uppercase tracking-wider">
                          {DEPARTMENTS.find(d => d.id === formData.department)?.clientLabel || 'Patient'} ID Link
                        </label>
                        <div className="relative group">
                          <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                          <input
                            type="text"
                            placeholder="e.g. P001, P002"
                            value={formData.patientId}
                            onChange={e => setFormData({ ...formData, patientId: e.target.value.toUpperCase() })}
                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200/80 bg-gray-50/50 hover:bg-white focus:bg-white text-sm font-semibold transition-all outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                          />
                        </div>
                      </div>
                    )}

                    <div className="md:col-span-2 pt-4 flex gap-3">
                      {activeTab === 'admin' ? (
                        <>
                          <button
                            type="button"
                            onClick={handleAdminSubmit}
                            disabled={submitting}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 hover:shadow active:scale-[0.98] transition-all disabled:opacity-50"
                          >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                            <span>{submitting ? 'Creating...' : 'Initialize Admin'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, customId: '', displayName: '', password: '' })}
                            disabled={submitting}
                            className="flex-1 py-3 rounded-xl border border-gray-200 bg-white font-bold text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-all active:scale-[0.98] disabled:opacity-50"
                          >
                            Reset
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={handleClientSubmit}
                            disabled={submitting}
                            className="flex-1 py-3 rounded-xl font-bold text-sm bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Home className="w-4 h-4" />}
                            <span>{submitting ? 'Linking...' : 'Link Family Node'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, customId: '', displayName: '', password: '', patientId: '' })}
                            disabled={submitting}
                            className="flex-1 py-3 rounded-xl border border-gray-200 bg-white font-bold text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-all active:scale-[0.98] disabled:opacity-50"
                          >
                            Clear
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* STAFF FORM (Comprehensive 6-Section Layout) */}
                {activeTab === 'staff' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* SECTION 1: PROFILE & IDENTITY */}
                    <div className="p-5 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 transition-all duration-300">
                      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-50">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                          <User size={20} />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">SECTION 1 — Profile & Identity</h3>
                          <p className="text-[11px] font-medium text-gray-400">Personal information and identity verification</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        <div className="sm:col-span-2 lg:col-span-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200/80 rounded-2xl p-4 aspect-square relative hover:border-indigo-500 hover:bg-indigo-50/10 transition-colors cursor-pointer group bg-gray-50/40">
                          {formData.photoUrl ? (
                            <img src={formData.photoUrl} alt="Profile" className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <div className="text-center">
                              <Camera size={26} className="mx-auto mb-2 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-indigo-600 transition-colors">Upload WebP Photo</span>
                            </div>
                          )}
                          <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            accept="image/webp"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'profile')}
                          />
                          {uploading === 'photoUrl' && (
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-xl flex items-center justify-center">
                              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                            </div>
                          )}
                        </div>

                        <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 ml-1">First Name*</label>
                            <input
                              type="text"
                              placeholder="First name"
                              value={formData.firstName}
                              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                              className="w-full h-12 px-4 rounded-xl border border-gray-200/80 bg-gray-50/50 focus:bg-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 ml-1">Last Name</label>
                            <input
                              type="text"
                              placeholder="Last name"
                              value={formData.lastName}
                              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                              className="w-full h-12 px-4 rounded-xl border border-gray-200/80 bg-gray-50/50 focus:bg-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 ml-1">Father's Name*</label>
                            <input
                              type="text"
                              placeholder="Father's name"
                              value={formData.fatherName}
                              onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                              className="w-full h-12 px-4 rounded-xl border border-gray-200/80 bg-gray-50/50 focus:bg-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 ml-1">Gender*</label>
                            <div className="flex gap-1.5 p-1 bg-gray-50 border border-gray-200/60 rounded-xl">
                              {['male', 'female'].map(g => (
                                <button
                                  key={g}
                                  onClick={() => setFormData({ ...formData, gender: g })}
                                  className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${formData.gender === g
                                      ? 'bg-indigo-600 text-white shadow-sm'
                                      : 'text-gray-500 hover:text-gray-900 hover:bg-white/60'
                                    }`}
                                >
                                  {g}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <BrutalistCalendar
                              label="Date of Birth*"
                              value={formData.dateOfBirth}
                              onChange={(iso: string) => setFormData({ ...formData, dateOfBirth: iso })}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 ml-1">CNIC Number</label>
                            <input
                              type="text"
                              placeholder="42101-XXXXXXX-X"
                              value={formData.cnic}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').substring(0, 13);
                                let formatted = val;
                                if (val.length > 5) formatted = val.substring(0, 5) + '-' + val.substring(5, 12);
                                if (val.length > 12) formatted = formatted + '-' + val.substring(12, 13);
                                setFormData({ ...formData, cnic: formatted });
                              }}
                              className="w-full h-12 px-4 rounded-xl border border-gray-200/80 bg-gray-50/50 focus:bg-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 ml-1">Phone / WhatsApp*</label>
                            <div className="relative">
                              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                              <input
                                type="tel"
                                placeholder="+92 3XX XXXXXXX"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full pl-11 pr-4 h-12 rounded-xl border border-gray-200/80 bg-gray-50/50 focus:bg-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-50 pt-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 ml-1">Emergency Contact Name</label>
                          <input
                            type="text"
                            placeholder="John Doe"
                            value={formData.emergencyContact.name}
                            onChange={(e) => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, name: e.target.value } })}
                            className="w-full h-12 px-4 rounded-xl border border-gray-200/80 bg-gray-50/50 focus:bg-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 ml-1">Emergency Contact Phone</label>
                          <input
                            type="tel"
                            placeholder="+92 3XX XXXXXXX"
                            value={formData.emergencyContact.phone}
                            onChange={(e) => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, phone: e.target.value } })}
                            className="w-full h-12 px-4 rounded-xl border border-gray-200/80 bg-gray-50/50 focus:bg-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: EMPLOYMENT DETAILS */}
                    <div className="p-5 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 transition-all duration-300">
                      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-50">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <Building2 size={20} />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">SECTION 2 — Employment Details</h3>
                          <p className="text-[11px] font-medium text-gray-400">Job location, role and initial salary</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 ml-1">Employee ID*</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder={generateEmployeeId()}
                                value={formData.employeeId}
                                onChange={e => setFormData({ ...formData, employeeId: e.target.value.toUpperCase() })}
                                className="flex-1 h-12 px-4 rounded-xl font-mono text-sm border border-gray-200/80 bg-gray-50/50 focus:bg-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                              />
                              <button
                                onClick={() => setFormData({ ...formData, employeeId: generateEmployeeId() })}
                                className="px-3.5 h-12 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 font-bold text-xs text-gray-600 transition-all active:scale-[0.98]"
                              >
                                Auto
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <BrutalistCalendar
                              label="Joining Date*"
                              value={formData.joiningDate}
                              onChange={(iso: string) => setFormData({ ...formData, joiningDate: iso })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 ml-1">Designation / Title*</label>
                            <input
                              type="text"
                              placeholder="e.g. Senior Doctor"
                              value={formData.designation}
                              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                              className="w-full h-12 px-4 rounded-xl border border-gray-200/80 bg-gray-50/50 focus:bg-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 ml-1">Category / Role*</label>
                            <select
                              value={formData.staffRole}
                              onChange={(e) => setFormData({ ...formData, staffRole: e.target.value })}
                              className="w-full h-12 px-4 rounded-xl border border-gray-200/80 bg-gray-50/50 focus:bg-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-sm"
                            >
                              <option value="Worker">Worker / Junior</option>
                              <option value="Internee Staff">Internee Staff</option>
                              <option value="Trial Base Staff">Trial Base Staff</option>
                              <option value="Contract Staff">Contract Staff</option>
                              <option value="Volunteer">Volunteer</option>
                              <option value="Doctor">Doctor / Clinical</option>
                              <option value="Nurse">Medical Staff / Nurse</option>
                              <option value="Supervisor">Supervisor</option>
                              <option value="Manager">Management</option>
                              <option value="Executive">Executive</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 ml-1">Starting Basic Salary (PKR)*</label>
                          <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                              type="number"
                              placeholder="50000"
                              value={formData.salary}
                              onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                              className="w-full pl-11 pr-4 h-12 rounded-xl border border-gray-200/80 bg-gray-50/50 focus:bg-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: DUTIES ASSIGNMENT */}
                    <div className="p-5 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 transition-all duration-300">
                      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-50">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                          <ClipboardList size={20} />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">SECTION 3 — Duties & Timings</h3>
                          <p className="text-[11px] font-medium text-gray-400">Working hours and specific responsibilities</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 space-y-3">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 ml-1">Daily Duty Shift</label>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 ml-1">Start Time</span>
                              <input
                                type="time"
                                value={formData.dutyStartTime}
                                onChange={(e) => setFormData({ ...formData, dutyStartTime: e.target.value })}
                                className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:border-indigo-500 transition-all font-semibold text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 ml-1">End Time</span>
                              <input
                                type="time"
                                value={formData.dutyEndTime}
                                onChange={(e) => setFormData({ ...formData, dutyEndTime: e.target.value })}
                                className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:border-indigo-500 transition-all font-semibold text-xs"
                              />
                            </div>
                          </div>
                          <div className="p-3.5 rounded-xl bg-indigo-50/40 border border-indigo-100 flex items-start gap-2.5">
                            <AlertCircle size={14} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                            <p className="text-[10px] font-medium text-indigo-700/80 leading-relaxed">
                              Shift times are pre-populated based on the department default.
                            </p>
                          </div>
                        </div>

                        <div className="lg:col-span-2 space-y-3">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 ml-1">Select Responsibilities / Duties</label>
                          <div className="flex flex-wrap gap-2">
                             <button 
                               onClick={() => setAddingConfig({ type: 'duty', mode: 'select' })}
                               className="p-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-all hover:scale-105"
                             >
                                <Plus size={14} />
                             </button>

                             {addingConfig?.type === 'duty' && (
                               <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/30 w-full mb-3 transition-all animate-in fade-in slide-in-from-top-2">
                                 <div className="flex flex-col gap-3">
                                   {addingConfig.mode === 'select' ? (
                                     <select 
                                       className="w-full p-2.5 rounded-xl text-xs font-bold outline-none border border-gray-200 bg-white"
                                       value={addingConfigSelection}
                                       onChange={e => {
                                         if (e.target.value === '__custom__') setAddingConfig({ ...addingConfig, mode: 'custom' });
                                         else setAddingConfigSelection(e.target.value);
                                       }}
                                     >
                                       <option value="" disabled>Select from presets...</option>
                                       {availableDuties
                                         .filter(o => !formData.dutyConfig.find(existing => existing.key === o.key))
                                         .map(o => <option key={o.key} value={o.key}>{o.label}</option>)
                                       }
                                       <option value="__custom__">+ Create New Item...</option>
                                     </select>
                                   ) : (
                                     <input 
                                       type="text" 
                                       placeholder="Type new duty name..." 
                                       autoFocus
                                       className="w-full p-2.5 rounded-xl text-xs font-bold outline-none border border-gray-200 focus:border-purple-500 transition-all bg-white"
                                       value={addingConfigCustom}
                                       onChange={e => setAddingConfigCustom(e.target.value)}
                                     />
                                   )}
                                   <div className="flex gap-2">
                                     <button 
                                       onClick={handleAddConfig} 
                                       disabled={processingConfig || (addingConfig.mode === 'select' && !addingConfigSelection) || (addingConfig.mode === 'custom' && !addingConfigCustom.trim())}
                                       className="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider bg-purple-600 text-white rounded-xl shadow transition-all disabled:opacity-50"
                                     >
                                       {processingConfig ? 'Processing...' : 'Save & Add'}
                                     </button>
                                     <button onClick={() => setAddingConfig(null)} className="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider border border-gray-200 rounded-xl bg-white text-gray-600">Cancel</button>
                                   </div>
                                 </div>
                               </div>
                             )}

                            {formData.dutyConfig.map(duty => (
                              <button
                                key={duty.key}
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    dutyConfig: formData.dutyConfig.filter(d => d.key !== duty.key)
                                  });
                                }}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold uppercase bg-purple-600 text-white shadow-sm hover:bg-purple-700 transition-all flex items-center gap-1.5"
                              >
                                {duty.label}
                                <X size={12} className="opacity-80" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 4: DRESS CODE */}
                    <div className="p-5 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 transition-all duration-300">
                      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-50">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                          <Scissors size={20} />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">SECTION 4 — Uniform Policy</h3>
                          <p className="text-[11px] font-medium text-gray-400">Required attire and equipment</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2.5">
                         <button 
                           onClick={() => setAddingConfig({ type: 'dress', mode: 'select' })}
                           className="p-2.5 rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition-all hover:scale-105"
                         >
                            <Plus size={14} />
                         </button>

                         {addingConfig?.type === 'dress' && (
                           <div className="p-4 rounded-xl border border-orange-100 bg-orange-50/30 w-full mb-3 transition-all animate-in fade-in slide-in-from-top-2">
                             <div className="flex flex-col gap-3">
                               {addingConfig.mode === 'select' ? (
                                 <select 
                                   className="w-full p-2.5 rounded-xl text-xs font-bold outline-none border border-gray-200 bg-white"
                                   value={addingConfigSelection}
                                   onChange={e => {
                                     if (e.target.value === '__custom__') setAddingConfig({ ...addingConfig, mode: 'custom' });
                                     else setAddingConfigSelection(e.target.value);
                                   }}
                                 >
                                   <option value="" disabled>Select from presets...</option>
                                   {availableDress
                                     .filter(o => !formData.dressCodeConfig.find(existing => existing.key === o.key))
                                     .map(o => <option key={o.key} value={o.key}>{o.label}</option>)
                                   }
                                   <option value="__custom__">+ Create New Item...</option>
                                 </select>
                               ) : (
                                 <input 
                                   type="text" 
                                   placeholder="Type new dress item..." 
                                   autoFocus
                                   className="w-full p-2.5 rounded-xl text-xs font-bold outline-none border border-gray-200 focus:border-orange-500 transition-all bg-white"
                                   value={addingConfigCustom}
                                   onChange={e => setAddingConfigCustom(e.target.value)}
                                 />
                               )}
                               <div className="flex gap-2">
                                 <button 
                                   onClick={handleAddConfig} 
                                   disabled={processingConfig || (addingConfig.mode === 'select' && !addingConfigSelection) || (addingConfig.mode === 'custom' && !addingConfigCustom.trim())}
                                   className="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider bg-orange-600 text-white rounded-xl shadow transition-all disabled:opacity-50"
                                 >
                                   {processingConfig ? 'Processing...' : 'Save & Add'}
                                 </button>
                                 <button onClick={() => setAddingConfig(null)} className="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider border border-gray-200 rounded-xl bg-white text-gray-600">Cancel</button>
                               </div>
                             </div>
                           </div>
                         )}

                        {(formData.dressCodeConfig || []).map((item) => (
                            <button
                              key={item.key}
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  dressCodeConfig: (prev.dressCodeConfig || []).filter(i => i.key !== item.key)
                                }));
                              }}
                              className="flex items-center gap-2.5 px-4 py-2 rounded-xl border border-orange-200/80 bg-orange-50/40 text-orange-700 font-semibold text-xs hover:bg-orange-100/50 transition-all"
                            >
                              <CheckCircle size={14} className="text-orange-500" />
                              <span>{item.label}</span>
                              <X size={12} className="opacity-60" />
                            </button>
                        ))}
                      </div>
                    </div>

                    {/* SECTION 5: EDUCATION & EXPERIENCE */}
                    <div className="p-5 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 transition-all duration-300">
                      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-50">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                          <BookOpen size={20} />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">SECTION 5 — Education & Experience</h3>
                          <p className="text-[11px] font-medium text-gray-400">Academic background and professional history</p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {/* Education Builder */}
                        <div className="space-y-3">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 ml-1">Academic Background</label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <input
                              type="text"
                              placeholder="Degree (e.g. BS IT)"
                              value={newEdu.degree}
                              onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })}
                              className="h-11 px-3.5 rounded-xl outline-none font-semibold text-xs border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-indigo-500 transition-all"
                            />
                            <input
                              type="text"
                              placeholder="Institution"
                              value={newEdu.institution}
                              onChange={(e) => setNewEdu({ ...newEdu, institution: e.target.value })}
                              className="h-11 px-3.5 rounded-xl outline-none font-semibold text-xs border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-indigo-500 transition-all"
                            />
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Year"
                                value={newEdu.year}
                                onChange={(e) => setNewEdu({ ...newEdu, year: e.target.value })}
                                className="flex-1 h-11 px-3.5 rounded-xl outline-none font-semibold text-xs border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-indigo-500 transition-all"
                              />
                              <button onClick={addEdu} className="px-4 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-sm hover:bg-indigo-700 transition-all">Add</button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                            {(formData.education || []).map((edu, idx) => (
                              <div key={idx} className="p-3.5 rounded-xl bg-indigo-50/30 border border-indigo-100 flex items-center justify-between group">
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-wider text-gray-800">{edu.degree}</p>
                                  <p className="text-[10px] font-medium text-gray-500 uppercase">{edu.institution} • {edu.year}</p>
                                </div>
                                <button onClick={() => removeEdu(idx)} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-rose-50/10 rounded-lg">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Experience Builder */}
                        <div className="space-y-3 pt-3 border-t border-gray-50">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 ml-1">Professional Experience</label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <input
                              type="text"
                              placeholder="Job Title"
                              value={newExp.title}
                              onChange={(e) => setNewExp({ ...newExp, title: e.target.value })}
                              className="h-11 px-3.5 rounded-xl outline-none font-semibold text-xs border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-emerald-500 transition-all"
                            />
                            <input
                              type="text"
                              placeholder="Company"
                              value={newExp.company}
                              onChange={(e) => setNewExp({ ...newExp, company: e.target.value })}
                              className="h-11 px-3.5 rounded-xl outline-none font-semibold text-xs border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-emerald-500 transition-all"
                            />
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Duration"
                                value={newExp.duration}
                                onChange={(e) => setNewExp({ ...newExp, duration: e.target.value })}
                                className="flex-1 h-11 px-3.5 rounded-xl outline-none font-semibold text-xs border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-emerald-500 transition-all"
                              />
                              <button onClick={addExp} className="px-4 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-sm hover:bg-emerald-700 transition-all">Add</button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                            {(formData.experience || []).map((exp, idx) => (
                              <div key={idx} className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-100 flex items-center justify-between group">
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-wider text-gray-800">{exp.title}</p>
                                  <p className="text-[10px] font-medium text-gray-500 uppercase">{exp.company} • {exp.duration}</p>
                                </div>
                                <button onClick={() => removeExp(idx)} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-rose-50/10 rounded-lg">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Skills Builder */}
                        <div className="space-y-3 pt-3 border-t border-gray-50">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 ml-1">Key Skills & Expertises</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Add a skill..."
                              value={newSkill}
                              onChange={(e) => setNewSkill(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                              className="flex-1 h-11 px-3.5 rounded-xl outline-none font-semibold text-xs border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-amber-500 transition-all"
                            />
                            <button onClick={addSkill} className="px-5 bg-amber-600 text-white rounded-xl font-bold text-xs shadow-sm hover:bg-amber-700 transition-all">Add</button>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mt-2">
                            {formData.skills.length === 0 && <p className="text-[11px] text-gray-400 font-medium">No skills added yet.</p>}
                            {(formData.skills || []).map(s => (
                              <span key={s} className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 shadow-sm">
                                {s}
                                <button onClick={() => removeSkill(s)} className="hover:text-rose-500"><X size={12} /></button>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 6: LOGIN ACCOUNT */}
                    <div className={`p-6 rounded-2xl border transition-all duration-300 ${formData.createAccount ? 'border-indigo-100 bg-indigo-50/30' : 'border-gray-100 bg-white'}`}>
                      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${formData.createAccount ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                            {formData.createAccount ? <Unlock size={22} /> : <Lock size={22} />}
                          </div>
                          <div>
                            <h3 className="text-base font-bold tracking-tight text-gray-900">Khan Hub LOGIN ACCESS</h3>
                            <p className="text-xs text-gray-500 font-medium">Enable mobile app & centralized dashboard access</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center bg-gray-50 border border-gray-200/80 p-1 rounded-xl">
                          <button
                            onClick={() => setFormData({ ...formData, createAccount: true })}
                            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider transition-all duration-300 ${formData.createAccount ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                          >
                            AUTHORIZED
                          </button>
                          <button
                            onClick={() => setFormData({ ...formData, createAccount: false })}
                            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider transition-all duration-300 ${!formData.createAccount ? 'bg-white border border-gray-100 text-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                          >
                            RESTRICTED
                          </button>
                        </div>
                      </div>

                      {formData.createAccount && (
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-white border border-gray-100/80 rounded-2xl animate-in slide-in-from-top-3 duration-300">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                              User ID (Login Username)*
                            </label>
                            <div className="relative group">
                              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                              <input
                                type="text"
                                placeholder="e.g. kamran_001"
                                value={formData.userId}
                                onChange={e => {
                                  const val = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
                                  const deptDetails = DEPARTMENTS.find(d => d.id === formData.department);
                                  const domain = deptDetails ? deptDetails.emailDomain : '@rehab.Khan Hub';
                                  setFormData({
                                    ...formData,
                                    userId: val,
                                    customId: val,
                                    email: val ? `${val}${domain}` : ''
                                  });
                                }}
                                className="w-full h-12 pl-11 pr-4 rounded-xl border border-gray-200/80 bg-gray-50/50 hover:bg-white focus:bg-white text-sm font-semibold transition-all outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                              />
                            </div>
                            <p className="text-[10px] text-indigo-600/80 font-bold ml-1 uppercase tracking-wider">
                              Login email: <span className="text-indigo-800">{formData.userId || '...'}{DEPARTMENTS.find(d => d.id === formData.department)?.emailDomain || '@rehab.Khan Hub'}</span>
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Secure Access Token (Password)*</label>
                            <div className="relative group">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter secure password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full h-12 px-4 rounded-xl border border-gray-200/80 bg-gray-50/50 hover:bg-white focus:bg-white font-mono text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                              />
                              <button
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                              >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECTION 6: DOCUMENTS */}
                    <div className="p-5 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 transition-all duration-300 relative overflow-hidden group">
                      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-50">
                        <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-pink-600">
                          <FileText size={20} />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">VERIFICATION ARTIFACTS</h3>
                          <p className="text-[11px] font-medium text-gray-400">Digital archives for CNIC, certifications & employment contracts</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="relative h-44 rounded-2xl border-2 border-dashed border-gray-200 hover:border-pink-400 bg-gray-50/50 hover:bg-pink-50/10 transition-all duration-300 flex flex-col items-center justify-center text-center p-6 group/upload cursor-pointer">
                          <div className="w-11 h-11 rounded-full bg-pink-50 flex items-center justify-center mb-3 group-hover/upload:scale-110 transition-transform duration-200">
                            <Plus className="text-pink-600" size={22} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Upload Archive</p>
                            <p className="text-[10px] text-gray-400 mt-1 font-medium">MAX 10MB • WebP/PDF</p>
                          </div>
                          <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            multiple
                            accept="image/webp,application/pdf"
                            onChange={(e) => {
                              const files = e.target.files;
                              if (files) {
                                Array.from(files).forEach(file => {
                                  handleFileUpload(file, 'document');
                                });
                              }
                            }}
                          />
                        </div>

                        <div className="md:col-span-2 space-y-2.5 max-h-44 overflow-y-auto pr-1">
                          {formData.documents.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 border border-dashed border-gray-200/80 rounded-2xl py-8">
                              <UploadCloud size={28} strokeWidth={1.5} className="mb-1 text-gray-300" />
                              <p className="text-[11px] font-bold uppercase tracking-wider opacity-60">No documents staged</p>
                            </div>
                          ) : (
                            formData.documents.map((doc, idx) => (
                              <div key={idx} className="p-3.5 bg-gray-50/60 border border-gray-100 rounded-xl flex items-center justify-between group/item hover:bg-white hover:border-gray-200 transition-all">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-lg bg-pink-50 flex items-center justify-center text-pink-500">
                                    <FileCheck size={18} />
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold text-gray-800 truncate max-w-[140px] sm:max-w-xs block">{doc.name}</span>
                                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mt-0.5">Asset ID: {doc.url.split('/').pop()?.slice(0, 8)}...</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setFormData({ ...formData, documents: formData.documents.filter((_, i) => i !== idx) })}
                                  className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center opacity-0 group-hover/item:opacity-100 hover:bg-rose-500 hover:text-white transition-all duration-200"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Final Action */}
                    <div className="pt-6">
                      <button
                        type="button"
                        onClick={handleStaffSubmit}
                        disabled={submitting}
                        className="w-full h-16 sm:h-20 rounded-2xl bg-indigo-600 text-white font-bold text-base hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-4"
                      >
                        {submitting ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                            <ShieldCheck size={24} />
                          </div>
                        )}
                        <span className="tracking-wide uppercase text-sm sm:text-base">
                          {submitting ? 'PROCESSING PROTOCOL...' : 'DEPLOY STAFF PROFILE'}
                        </span>
                        {!submitting && <ArrowRightCircle size={24} className="opacity-60 group-hover:translate-x-1 transition-all" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Right Summary Column */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl border border-gray-100 bg-white sticky top-8 transition-all duration-300 shadow-sm hover:shadow-md">
              <div className="flex items-center justify-between mb-8 border-b border-gray-50 pb-4">
                <h3 className="text-lg font-bold tracking-tight text-gray-900">Live Profile Staging</h3>
                <div className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-bold tracking-widest uppercase">
                  STAGING
                </div>
              </div>

              <div className="space-y-6">
                {[
                  {
                    label: 'Authentication ID',
                    value: formData.firstName ? `${formData.firstName.toLowerCase()}.${formData.lastName.toLowerCase() || 'stf'}@rehab.Khan Hub` : 'Awaiting Details',
                    icon: Fingerprint,
                    color: 'text-indigo-600',
                    bg: 'bg-indigo-50/60'
                  },
                  {
                    label: 'Security Clearance',
                    value: 'Operational Staff - L1',
                    icon: ShieldCheck,
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50/60'
                  },
                  {
                    label: 'Work Area',
                    value: formData.department ? (DEPARTMENTS.find(d => d.id === formData.department)?.name) : 'Physical Therapy Unit',
                    icon: Crosshair,
                    color: 'text-amber-600',
                    bg: 'bg-amber-50/60'
                  },
                  {
                    label: 'Onboarding Date',
                    value: formData.joiningDate || formatDateDMY(new Date()),
                    icon: Calendar,
                    color: 'text-pink-600',
                    bg: 'bg-pink-50/60'
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4 group cursor-default">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-105 ${item.bg} ${item.color}`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col justify-center truncate">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 leading-none">{item.label}</p>
                      <p className="text-sm font-bold text-gray-800 tracking-tight uppercase truncate">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-gray-50/60 border border-gray-100 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">System Readiness</p>
                  <p className="text-[10px] font-bold text-indigo-600 tracking-widest">100%</p>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 w-full rounded-full" />
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl border border-indigo-100/40 bg-indigo-50/10 hover:border-indigo-100/80 transition-all duration-300 relative overflow-hidden group">
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center mb-4 group-hover:rotate-6 transition-transform text-indigo-600">
                  <BookOpen size={20} />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-indigo-900 mb-1.5">Initialization Protocol</h3>
                <p className="text-xs text-indigo-700/80 leading-relaxed mb-5 font-medium">
                  Every account deployment requires full verification, correct CNIC format, and designated job classification.
                </p>
              </div>
              <Activity className="absolute -right-8 -bottom-8 w-32 h-32 opacity-5 text-indigo-500 transition-transform duration-700 group-hover:scale-110" />
            </div>
          </div>

        </div>

        {/* Audit Table */}
        <div className="mt-8">
          <div className="rounded-3xl border border-gray-100 overflow-hidden bg-white shadow-sm transition-all duration-300">
            <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-indigo-500" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-gray-900">Recent Account Provision Records</h2>
              </div>
              <div>
                <span className="px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border border-gray-200 bg-white text-gray-600 shadow-sm">
                  {users.length} Active Records
                </span>
              </div>
            </div>

            <div className="md:hidden divide-y divide-gray-50">
              {users.length === 0 ? (
                <div className="px-6 py-10 text-center text-gray-400 font-bold uppercase tracking-wider text-[11px]">
                  No account records initialized
                </div>
              ) : (
                users.map((u) => (
                  <div key={u.id} className="p-4 space-y-3 bg-white">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${u.role === 'admin' ? 'bg-indigo-600 text-white' :
                          u.role === 'staff' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                        {u.displayName?.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate leading-tight">{u.displayName}</p>
                        <p className="text-[11px] font-medium text-gray-400 truncate mt-0.5">
                          {u.customId}{DEPARTMENTS.find(d => d.id === formData.department)?.emailDomain || '@rehab.Khan Hub'}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <span className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border text-center ${u.role === 'manager' || u.role === 'admin'
                          ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                        {u.role}
                      </span>
                      <button
                        disabled={toggling === u.id}
                        onClick={() => handleToggleStatus(u.id, u.isActive !== false)}
                        className={`inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${u.isActive !== false
                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100/60'
                            : 'bg-rose-50 text-rose-600 hover:bg-rose-100/60'
                          }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${u.isActive !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {u.isActive !== false ? 'Active' : 'Disabled'}
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        const col = u.department === 'rehab' || u._origin === 'rehab' || !u.department ? 'rehab' : u.department;
                        router.push(`/hq/dashboard/manager/staff/${u.id}?collection=${col}`);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold transition-all hover:bg-indigo-100/50"
                    >
                      Edit
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="hidden md:block overflow-x-auto w-full">
              <table className="w-full text-left min-w-[800px]">
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4">Full Identity</th>
                    <th className="px-6 py-4">Assigned Role</th>
                    <th className="px-6 py-4">Initialization Date</th>
                    <th className="px-6 py-4">Operational Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-800">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-gray-400 font-bold uppercase tracking-wider text-[11px]">
                        No account records initialized
                      </td>
                    </tr>
                  ) : (
                    users.map(u => (
                      <tr key={u.id} className="group hover:bg-gray-50/40 transition-all">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-all ${u.role === 'admin' ? 'bg-indigo-600 text-white' :
                                u.role === 'staff' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                              }`}>
                              {u.displayName?.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{u.displayName}</p>
                              <p className="text-[11px] font-medium text-gray-400 truncate mt-0.5">
                                {u.customId}{DEPARTMENTS.find(d => d.id === formData.department)?.emailDomain || '@rehab.Khan Hub'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 capitalize">
                          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border ${u.role === 'manager' || u.role === 'admin'
                              ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                              : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-gray-600">
                          {u.createdAt ? (() => {
                            try {
                              const date = u.createdAt.seconds ? new Date(u.createdAt.seconds * 1000) : new Date(u.createdAt);
                              return formatDateDMY(date);
                            } catch {
                              return 'Format Error';
                            }
                          })() : 'Pending'}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            disabled={toggling === u.id}
                            onClick={() => handleToggleStatus(u.id, u.isActive !== false)}
                            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${u.isActive !== false
                                ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100/60'
                                : 'bg-rose-50 text-rose-600 hover:bg-rose-100/60'
                              }`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${u.isActive !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {u.isActive !== false ? 'Active' : 'Disabled'}
                            {toggling === u.id && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              const col = u.department === 'rehab' || u._origin === 'rehab' || !u.department
                                ? 'rehab'
                                : u.department;
                              router.push(`/hq/dashboard/manager/staff/${u.id}?collection=${col}`);
                            }}
                            className="px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 font-bold text-xs text-gray-700 hover:bg-gray-100 hover:text-indigo-600 transition-all hover:shadow-sm"
                          >
                            Edit Profile
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
