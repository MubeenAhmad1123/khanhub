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

  // Fetch global HQ meta config
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

       // Save to DB globally (hq_meta)
       try {
         const metaRef = doc(db, `hq_meta`, 'config');
         const metaDoc = await getDoc(metaRef);
         const field = type === 'duty' ? 'customDuties' : 'customDress';
         const existing = metaDoc.exists() ? (metaDoc.data()[field] || []) : [];
         if (!existing.find((e: any) => e.key === key)) {
            await setDoc(metaRef, { [field]: [...existing, newItem] }, { merge: true });
            toast.success(`${type === 'duty' ? 'Duty' : 'Dress Item'} stored globally!`);
            
            // Update local available list immediately
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
    // Smart Timings
    const times = DEFAULT_DUTY_TIMES[formData.department];
    if (times) {
      setFormData(prev => ({ ...prev, dutyStartTime: times.start, dutyEndTime: times.end }));
    }

    // Smart Dress Code
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

    // Global ID Uniqueness Check
    const uniqueness = await checkIdUniqueness(formData.customId);
    if (!uniqueness.isUnique) {
      setMessage({ type: 'error', text: `ABORTED: The User ID "${formData.customId}" is already taken by a profile in the ${uniqueness.existingDept} department. Please choose a different ID.` });
      setSubmitting(false);
      return;
    }

    try {
      // Check for existing admin
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
        undefined, // no patientId
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

    // Global ID Uniqueness Check
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

      // Handle Login Account Creation if toggled ON
      if (formData.createAccount) {
        // BUG 3 FIX: Integrating createRehabUserServer for staff login accounts
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

      // Save to staff collection (unified with main user collection)
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

      // Reset Form (except for credentials view)
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

    // Global ID Uniqueness Check
    const uniqueness = await checkIdUniqueness(formData.customId);
    if (!uniqueness.isUnique) {
      setMessage({ type: 'error', text: `ABORTED: The User ID "${formData.customId}" is already taken by a profile in the ${uniqueness.existingDept} department. Please choose a different ID.` });
      setSubmitting(false);
      return;
    }

    try {
      // Determine client collection and ID field name
      const deptDetails = DEPARTMENTS.find(d => d.id === formData.department) || DEPARTMENTS[0];
      const clientCollection = deptDetails.clientCollection || 'rehab_patients';
      const idLabel = `${deptDetails.clientLabel || 'Patient'} ID`;

      // Validate Client ID exists
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
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-black' : 'bg-white'}`}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 pb-20 overflow-x-hidden w-full max-w-full ${darkMode ? 'bg-[#0A0A0A] text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header Section */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight">
              <Users className="w-10 h-10 text-blue-500" />
              Account Management
            </h1>
            <p className={`mt-1 font-medium ${darkMode ? 'text-black-500' : 'text-black'}`}>
              Create and manage administrative, staff, and family credentials
            </p>
          </div>

          <div className={`flex items-center gap-4 px-5 py-2.5 rounded-2xl border w-full sm:w-auto ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex -space-x-3">
              {[1, 2, 3].map(i => (
                <div key={i} className={`w-8 h-8 rounded-full border-2 ${darkMode ? 'border-gray-800 bg-gray-700' : 'border-white bg-gray-100'} flex items-center justify-center`}>
                  <Users className="w-4 h-4 text-blue-500" />
                </div>
              ))}
            </div>
            <div className="text-right">
              <p className="text-xs font-black uppercase tracking-tight text-blue-500 leading-none">Global Access</p>
              <p className={`text-[10px] font-bold ${darkMode ? 'text-black' : 'text-black'}`}>Unified Account Hub</p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mb-8 p-1.5 rounded-2xl flex flex-wrap gap-1 bg-gray-200/50 dark:bg-gray-900/50 backdrop-blur-md max-w-lg">
          {[
            { id: 'admin', icon: ShieldCheck, label: 'Admin' },
            { id: 'staff', icon: UserPlus, label: 'Staff' },
            { id: 'client', icon: Home, label: 'Client / User' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as TabType); setMessage(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : `hover:bg-gray-300/50 dark:hover:bg-gray-800/50 ${darkMode ? 'text-black' : 'text-black'}`
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
            <div className="mb-6">
              <div className="flex flex-wrap gap-3">
                {DEPARTMENTS.map(dept => (
                  <button
                    key={dept.id}
                    onClick={() => { setFormData({ ...formData, department: dept.id }); fetchCounts(); }}
                    className={`flex items-center gap-3 px-5 py-4 rounded-2xl border-2 transition-all cursor-pointer ${formData.department === dept.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : `border-transparent ${darkMode ? 'bg-zinc-900/60 hover:bg-black/90' : 'bg-white hover:bg-white'} shadow-sm`
                      }`}
                  >
                    <div className={formData.department === dept.id ? 'text-blue-500' : 'text-black'}>
                      <dept.icon size={24} />
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-black tracking-tight ${formData.department === dept.id ? 'text-blue-600 dark:text-blue-400' : ''}`}>{dept.name}</p>
                      <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">{dept.prefix}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className={`rounded-[2.5rem] border p-8 md:p-10 transition-all duration-500 ${darkMode ? 'bg-gray-900/40 border-gray-800 shadow-2xl shadow-black/20' : 'bg-white border-gray-200 shadow-xl shadow-blue-900/5'
              }`}>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${activeTab === 'admin' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                    activeTab === 'staff' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' :
                      'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                  }`}>
                  {activeTab === 'admin' ? <ShieldCheck className="w-7 h-7" /> :
                    activeTab === 'staff' ? <UserPlus className="w-7 h-7" /> :
                      <Home className="w-7 h-7" />}
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">
                    Create {activeTab} Account
                  </h2>
                  <p className={`text-sm ${darkMode ? 'text-black' : 'text-black'}`}>
                    {activeTab === 'admin' ? 'Strategic administrative oversight credentials' :
                      activeTab === 'staff' ? 'Operational and clinical personnel management' :
                        `${DEPARTMENTS.find(d => d.id === formData.department)?.clientLabel || 'Client'} family and guardian portal access`}
                  </p>
                </div>
              </div>

              {lastCreated && (
                <div className="mb-10 p-8 rounded-[2rem] bg-indigo-600 text-white shadow-2xl shadow-indigo-500/40 relative overflow-hidden animate-in zoom-in-95 duration-500">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                          <Unlock className="w-5 h-5" />
                        </div>
                        <h3 className="font-black uppercase tracking-widest">Credentials Generated</h3>
                      </div>
                      <button onClick={() => setLastCreated(null)} className="text-white/60 hover:text-white transition-colors">
                        <XCircle size={24} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-black/20 p-6 rounded-2xl border border-white/10 backdrop-blur-xl">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">Access Identity</p>
                        <p className="text-lg font-mono font-black">{lastCreated.customId}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">Secure Password</p>
                        <p className="text-lg font-mono font-black">{lastCreated.password}</p>
                      </div>
                    </div>

                    <p className="mt-6 text-[10px] font-bold uppercase tracking-widest leading-relaxed opacity-80">
                      IMPORTANT: Please provide these credentials to {lastCreated.name}.
                      The system does not store passwords in plain text after this session.
                    </p>
                  </div>
                  <ShieldCheck size={180} className="absolute -right-12 -bottom-12 opacity-10 rotate-12" />
                </div>
              )}

              {message && (
                <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${message.type === 'success'
                    ? 'bg-green-500/10 border border-green-500/20 text-green-500'
                    : 'bg-red-500/10 border border-red-500/20 text-red-500'
                  }`}>
                  {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  <p className="text-sm font-bold">{message.text}</p>
                </div>
              )}

              <div className="space-y-6">

                {/* ADMIN & CLIENT FORMS (Simplified Grid) */}
                {(activeTab === 'admin' || activeTab === 'client') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
                    {/* Common Fields */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-black ml-1">Custom User ID</label>
                      <div className="relative group">
                        <Users className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${darkMode ? 'text-black group-focus-within:text-blue-500' : 'text-black group-focus-within:text-blue-600'}`} />
                        <input
                          type="text"
                          placeholder="e.g. jdoe_001"
                          value={formData.customId}
                          onChange={e => setFormData({ ...formData, customId: e.target.value.toLowerCase().replace(/\s/g, '') })}
                          className={`w-full pl-11 pr-4 py-4 rounded-2xl border text-sm font-bold transition-all outline-none ${darkMode ? 'bg-gray-800/50 border-gray-700 focus:border-blue-500 focus:bg-gray-800' : 'bg-gray-50 border-gray-200 focus:border-blue-500 focus:bg-white'
                            }`}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-black ml-1">Full Display Name</label>
                      <div className="relative group">
                        <UserPlus className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${darkMode ? 'text-black group-focus-within:text-blue-500' : 'text-black group-focus-within:text-blue-600'}`} />
                        <input
                          type="text"
                          placeholder="e.g. Johnathan Doe"
                          value={formData.displayName}
                          onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                          className={`w-full pl-11 pr-4 py-4 rounded-2xl border text-sm font-bold transition-all outline-none ${darkMode ? 'bg-gray-800/50 border-gray-700 focus:border-blue-500 focus:bg-gray-800' : 'bg-gray-50 border-gray-200 focus:border-blue-500 focus:bg-white'
                            }`}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-black ml-1">Secure Password</label>
                      <div className="relative group">
                        <ShieldCheck className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${darkMode ? 'text-black group-focus-within:text-blue-500' : 'text-black group-focus-within:text-blue-600'}`} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min 6 characters"
                          value={formData.password}
                          onChange={e => setFormData({ ...formData, password: e.target.value })}
                          className={`w-full pl-11 pr-12 py-4 rounded-2xl border text-sm font-bold transition-all outline-none ${darkMode ? 'bg-gray-800/50 border-gray-700 focus:border-blue-500 focus:bg-gray-800' : 'bg-gray-50 border-gray-200 focus:border-blue-500 focus:bg-white'
                            }`}
                        />
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-black hover:text-blue-500 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {activeTab === 'client' && (
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-widest text-black ml-1">
                          {DEPARTMENTS.find(d => d.id === formData.department)?.clientLabel || 'Patient'} ID Link
                        </label>
                        <div className="relative group">
                          <TrendingUp className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${darkMode ? 'text-black' : 'text-black'}`} />
                          <input
                            type="text"
                            placeholder="e.g. P001, P002"
                            value={formData.patientId}
                            onChange={e => setFormData({ ...formData, patientId: e.target.value.toUpperCase() })}
                            className={`w-full pl-11 pr-4 py-4 rounded-2xl border text-sm font-bold transition-all outline-none ${darkMode ? 'bg-gray-800/50 border-gray-700 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:border-blue-500'
                              }`}
                          />
                        </div>
                      </div>
                    )}

                    <div className="md:col-span-2 pt-6 flex gap-4">
                      {activeTab === 'admin' ? (
                        <>
                          <button
                            type="button"
                            onClick={handleAdminSubmit}
                            disabled={submitting}
                            className={`flex-1 flex items-center justify-center gap-3 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all ${submitting ? 'bg-zinc-100 text-zinc-400' : 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95'}`}
                          >
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                            <span>{submitting ? 'Creating...' : 'Initialize Admin'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, customId: '', displayName: '', password: '' })}
                            disabled={submitting}
                            className={`flex-1 py-5 rounded-[1.5rem] border-2 font-black text-xs uppercase tracking-widest transition-all ${submitting ? 'opacity-20 cursor-not-allowed' : 'border-zinc-200 text-black hover:bg-gray-50'}`}
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
                            className={`flex-1 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${submitting ? 'bg-zinc-100 text-zinc-400' : 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95'}`}
                          >
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Home className="w-5 h-5" />}
                            <span>{submitting ? 'Linking...' : 'Link Family Node'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, customId: '', displayName: '', password: '', patientId: '' })}
                            disabled={submitting}
                            className={`flex-1 py-5 rounded-[1.5rem] border-2 font-black text-xs uppercase tracking-widest transition-all ${submitting ? 'opacity-20 cursor-not-allowed' : 'border-zinc-200 text-black hover:bg-gray-50'}`}
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
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* SECTION 1: PROFILE & IDENTITY */}
                    <div className={`p-6 rounded-[2rem] border transition-all ${darkMode ? 'bg-[#1e1e1e] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                          <User className="text-blue-500" size={20} />
                        </div>
                        <div>
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-black">SECTION 1 — Profile & Identity</h3>
                          <p className="text-sm font-bold opacity-60">Personal information and identity verification</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="sm:col-span-2 lg:col-span-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-4 aspect-square relative hover:border-blue-500 transition-colors cursor-pointer group bg-gray-50/50 dark:bg-black/20">
                          {formData.photoUrl ? (
                            <img src={formData.photoUrl} alt="Profile" className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <div className="text-center">
                              <Camera size={32} className="mx-auto mb-2 opacity-40 group-hover:opacity-100 transition-opacity text-blue-500" />
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Upload Photo*</span>
                            </div>
                          )}
                          <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            accept="image/webp"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'profile')}
                          />
                          {uploading === 'photoUrl' && (
                            <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                            </div>
                          )}
                        </div>

                        <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black ml-1">First Name*</label>
                            <input
                              type="text"
                              placeholder="Enter first name"
                              value={formData.firstName}
                              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                              className={`w-full h-14 px-5 rounded-2xl outline-none transition-all font-bold text-sm ${darkMode ? 'bg-white/5 focus:bg-white/10 border-white/5 focus:border-blue-500' : 'bg-gray-50 focus:bg-white border-gray-100 focus:border-blue-500'}`}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black ml-1">Last Name</label>
                            <input
                              type="text"
                              placeholder="Enter last name"
                              value={formData.lastName}
                              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                              className={`w-full h-14 px-5 rounded-2xl outline-none transition-all font-bold text-sm ${darkMode ? 'bg-white/5 focus:bg-white/10 border-white/5 focus:border-blue-500' : 'bg-gray-50 focus:bg-white border-gray-100 focus:border-blue-500'}`}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black ml-1">Father's Name*</label>
                            <input
                              type="text"
                              placeholder="Enter father's name"
                              value={formData.fatherName}
                              onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                              className={`w-full h-14 px-5 rounded-2xl outline-none transition-all font-bold text-sm ${darkMode ? 'bg-white/5 focus:bg-white/10 border-white/5 focus:border-blue-500' : 'bg-gray-50 focus:bg-white border-gray-100 focus:border-blue-500'}`}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black ml-1">Gender*</label>
                            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-2xl">
                              {['male', 'female'].map(g => (
                                <button
                                  key={g}
                                  onClick={() => setFormData({ ...formData, gender: g })}
                                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.gender === g
                                      ? 'bg-blue-600 text-white shadow-lg'
                                      : 'text-black hover:text-black dark:hover:text-gray-200'
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
                            <label className="text-[10px] font-black uppercase tracking-widest text-black ml-1">CNIC Number (00000-0000000-0)</label>
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
                              className={`w-full h-14 px-5 rounded-2xl outline-none transition-all font-bold text-sm ${darkMode ? 'bg-white/5 focus:bg-white/10 border-white/5 focus:border-blue-500' : 'bg-gray-50 focus:bg-white border-gray-100 focus:border-blue-500'}`}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black ml-1">Phone / WhatsApp*</label>
                            <div className="relative">
                              <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-black' : 'text-black'}`} />
                              <input
                                type="tel"
                                placeholder="+92 3XX XXXXXXX"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className={`w-full pl-11 pr-5 h-14 rounded-2xl outline-none transition-all font-bold text-sm ${darkMode ? 'bg-white/5 focus:bg-white/10 border-white/5 focus:border-blue-500' : 'bg-gray-50 focus:bg-white border-gray-100 focus:border-blue-500'}`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 dark:border-white/5 pt-6">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-black ml-1">Emergency Contact Name</label>
                          <input
                            type="text"
                            placeholder="John Doe"
                            value={formData.emergencyContact.name}
                            onChange={(e) => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, name: e.target.value } })}
                            className={`w-full h-14 px-5 rounded-2xl outline-none transition-all font-bold text-sm ${darkMode ? 'bg-white/5 focus:bg-white/10 border-white/5 focus:border-blue-500' : 'bg-gray-50 focus:bg-white border-gray-100 focus:border-blue-500'}`}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-black ml-1">Emergency Contact Phone</label>
                          <input
                            type="tel"
                            placeholder="+92 3XX XXXXXXX"
                            value={formData.emergencyContact.phone}
                            onChange={(e) => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, phone: e.target.value } })}
                            className={`w-full h-14 px-5 rounded-2xl outline-none transition-all font-bold text-sm ${darkMode ? 'bg-white/5 focus:bg-white/10 border-white/5 focus:border-blue-500' : 'bg-gray-50 focus:bg-white border-gray-100 focus:border-blue-500'}`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: EMPLOYMENT DETAILS */}
                    <div className={`p-6 rounded-[2rem] border transition-all ${darkMode ? 'bg-[#1e1e1e] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                          <Building2 className="text-emerald-500" size={20} />
                        </div>
                        <div>
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-black">SECTION 2 — Employment Details</h3>
                          <p className="text-sm font-bold opacity-60">Job location, role and initial salary</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black tracking-[0.25em] opacity-60 uppercase ml-1">
                              Employee ID *
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder={generateEmployeeId()}
                                value={formData.employeeId}
                                onChange={e => setFormData({ ...formData, employeeId: e.target.value.toUpperCase() })}
                                className={`flex-1 h-14 px-5 rounded-2xl font-mono text-sm outline-none transition-all ${darkMode
                                    ? 'bg-white/10 border-white/10 text-white placeholder:text-white/20 focus:border-indigo-500/50'
                                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-black focus:border-indigo-500/50'
                                  }`}
                              />
                              <button
                                onClick={() => setFormData({ ...formData, employeeId: generateEmployeeId() })}
                                className={`px-4 h-14 rounded-2xl border text-xs font-black transition-all whitespace-nowrap ${darkMode ? 'bg-white/10 border-white/10 text-white/60 hover:bg-white/20' : 'bg-gray-100 border-gray-200 text-black hover:bg-gray-200'
                                  }`}
                              >
                                Auto
                              </button>
                            </div>
                            <p className="text-[9px] opacity-30 font-bold ml-1 uppercase tracking-widest italic">
                              Internal HR number shown on staff badge and profile.
                            </p>
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
                            <label className="text-[10px] font-black uppercase tracking-widest text-black ml-1">Designation / Title*</label>
                            <input
                              type="text"
                              placeholder="e.g. Senior Doctor"
                              value={formData.designation}
                              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                              className={`w-full h-14 px-5 rounded-2xl outline-none transition-all font-bold text-sm ${darkMode ? 'bg-white/5 focus:bg-white/10 border-white/5 focus:border-blue-500' : 'bg-gray-50 focus:bg-white border-gray-100 focus:border-blue-500'}`}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black ml-1">Category / Role*</label>
                            <select
                              value={formData.staffRole}
                              onChange={(e) => setFormData({ ...formData, staffRole: e.target.value })}
                              className={`w-full h-14 px-5 rounded-2xl outline-none transition-all font-bold text-sm ${darkMode ? 'bg-white/5 focus:bg-white/10 border-white/5 focus:border-blue-500' : 'bg-gray-50 focus:bg-white border-gray-100 focus:border-blue-500'}`}
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
                          <label className="text-[10px] font-black uppercase tracking-widest text-black ml-1">Starting Basic Salary (PKR)*</label>
                          <div className="relative">
                            <DollarSign className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-black' : 'text-black'}`} />
                            <input
                              type="number"
                              placeholder="50000"
                              value={formData.salary}
                              onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                              className={`w-full pl-11 pr-5 h-14 rounded-2xl outline-none transition-all font-bold text-sm ${darkMode ? 'bg-white/5 focus:bg-white/10 border-white/5 focus:border-blue-500' : 'bg-gray-50 focus:bg-white border-gray-100 focus:border-blue-500'}`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: DUTIES ASSIGNMENT */}
                    <div className={`p-6 rounded-[2rem] border transition-all ${darkMode ? 'bg-[#1e1e1e] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                          <ClipboardList className="text-purple-500" size={20} />
                        </div>
                        <div>
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-black">SECTION 3 — Duties & Timings</h3>
                          <p className="text-sm font-bold opacity-60">Working hours and specific responsibilities</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-black ml-1">Daily Duty Shift</label>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <span className="text-[8px] font-black uppercase tracking-widest opacity-40 ml-1">Start Time</span>
                              <input
                                type="time"
                                value={formData.dutyStartTime}
                                onChange={(e) => setFormData({ ...formData, dutyStartTime: e.target.value })}
                                className={`w-full h-12 px-4 rounded-xl outline-none font-bold text-xs ${darkMode ? 'bg-white/5 focus:bg-white/10 border-white/5' : 'bg-gray-50 border-gray-100'}`}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <span className="text-[8px] font-black uppercase tracking-widest opacity-40 ml-1">End Time</span>
                              <input
                                type="time"
                                value={formData.dutyEndTime}
                                onChange={(e) => setFormData({ ...formData, dutyEndTime: e.target.value })}
                                className={`w-full h-12 px-4 rounded-xl outline-none font-bold text-xs ${darkMode ? 'bg-white/5 focus:bg-white/10 border-white/5' : 'bg-gray-50 border-gray-100'}`}
                              />
                            </div>
                          </div>
                          <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertCircle size={12} className="text-blue-500" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Auto-calculated</span>
                            </div>
                            <p className="text-[10px] font-bold opacity-60">Shift times are suggested based on department policy but can be customized.</p>
                          </div>
                        </div>

                        <div className="lg:col-span-2 space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-black ml-1">Select Responsibilities / Duties</label>
                          <div className="flex flex-wrap gap-2">
                             <button 
                               onClick={() => setAddingConfig({ type: 'duty', mode: 'select' })}
                               className="p-2.5 rounded-xl bg-purple-500 text-white hover:scale-105 transition-all shadow-lg shadow-purple-500/20"
                             >
                                <Plus size={14} />
                             </button>

                             {addingConfig?.type === 'duty' && (
                               <div className={`p-4 rounded-2xl border w-full mb-4 transition-all ${darkMode ? 'bg-zinc-900 border-purple-500/30' : 'bg-white border-purple-200 shadow-xl shadow-purple-500/10'}`}>
                                 <div className="flex flex-col gap-3">
                                   {addingConfig.mode === 'select' ? (
                                     <select 
                                       className={`w-full p-3 rounded-xl text-xs font-bold outline-none border-2 transition-all ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-gray-50 border-gray-100 text-gray-900'}`}
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
                                       className={`w-full p-3 rounded-xl text-xs font-bold outline-none border-2 focus:border-purple-500 transition-all ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-gray-50 border-gray-200'}`}
                                       value={addingConfigCustom}
                                       onChange={e => setAddingConfigCustom(e.target.value)}
                                     />
                                   )}
                                   <div className="flex gap-2">
                                     <button 
                                       onClick={handleAddConfig} 
                                       disabled={processingConfig || (addingConfig.mode === 'select' && !addingConfigSelection) || (addingConfig.mode === 'custom' && !addingConfigCustom.trim())}
                                       className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest bg-purple-500 text-white rounded-xl shadow-lg transition-all disabled:opacity-50"
                                     >
                                       {processingConfig ? 'Processing...' : 'Save & Add'}
                                     </button>
                                     <button onClick={() => setAddingConfig(null)} className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest border-2 rounded-xl border-zinc-700 text-black">Cancel</button>
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
                                className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-500/30"
                              >
                                {duty.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 4: DRESS CODE */}
                    <div className={`p-6 rounded-[2rem] border transition-all ${darkMode ? 'bg-[#1e1e1e] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                          <Scissors className="text-orange-500" size={20} />
                        </div>
                        <div>
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-black">SECTION 4 — Uniform Policy</h3>
                          <p className="text-sm font-bold opacity-60">Required attire and equipment (Gender Aware)</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                         <button 
                           onClick={() => setAddingConfig({ type: 'dress', mode: 'select' })}
                           className="p-2.5 rounded-[1.25rem] bg-orange-500 text-white hover:scale-105 transition-all shadow-lg shadow-orange-500/20"
                         >
                            <Plus size={16} />
                         </button>

                         {addingConfig?.type === 'dress' && (
                           <div className={`p-4 rounded-2xl border w-full mb-4 transition-all ${darkMode ? 'bg-zinc-900 border-orange-500/30' : 'bg-white border-orange-200 shadow-xl shadow-orange-500/10'}`}>
                             <div className="flex flex-col gap-3">
                               {addingConfig.mode === 'select' ? (
                                 <select 
                                   className={`w-full p-3 rounded-xl text-xs font-bold outline-none border-2 transition-all ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-gray-50 border-gray-100 text-gray-900'}`}
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
                                   className={`w-full p-3 rounded-xl text-xs font-bold outline-none border-2 focus:border-orange-500 transition-all ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-gray-50 border-gray-100'}`}
                                   value={addingConfigCustom}
                                   onChange={e => setAddingConfigCustom(e.target.value)}
                                 />
                               )}
                               <div className="flex gap-2">
                                 <button 
                                   onClick={handleAddConfig} 
                                   disabled={processingConfig || (addingConfig.mode === 'select' && !addingConfigSelection) || (addingConfig.mode === 'custom' && !addingConfigCustom.trim())}
                                   className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest bg-orange-500 text-white rounded-xl shadow-lg transition-all disabled:opacity-50"
                                 >
                                   {processingConfig ? 'Processing...' : 'Save & Add'}
                                 </button>
                                 <button onClick={() => setAddingConfig(null)} className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest border-2 rounded-xl border-zinc-700 text-black">Cancel</button>
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
                              className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-600 transition-all"
                            >
                              <div className="w-5 h-5 rounded-lg flex items-center justify-center bg-orange-500 text-white">
                                <CheckCircle size={12} />
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                            </button>
                        ))}
                      </div>

                      <div className="mt-6 p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 flex items-center gap-3">
                        <ShieldCheck size={16} className="text-orange-500" />
                        <p className="text-[10px] font-bold text-orange-600/80 uppercase tracking-wider">Note: Selected items will be strictly monitored during daily attendance rounds.</p>
                      </div>
                    </div>

                    {/* SECTION 5: EDUCATION & EXPERIENCE */}
                    <div className={`p-6 rounded-[2rem] border transition-all ${darkMode ? 'bg-[#1e1e1e] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                          <BookOpen className="text-blue-500" size={20} />
                        </div>
                        <div>
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-black">SECTION 5 — Education & Experience</h3>
                          <p className="text-sm font-bold opacity-60">Academic background and professional history</p>
                        </div>
                      </div>

                      <div className="space-y-8">
                        {/* Education Builder */}
                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-black ml-1">Academic Background</label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <input
                              type="text"
                              placeholder="Degree (e.g. Matric)"
                              value={newEdu.degree}
                              onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })}
                              className={`h-12 px-4 rounded-xl outline-none font-bold text-xs ${darkMode ? 'bg-white/5 border-white/5 focus:border-blue-500' : 'bg-gray-50 border-gray-100 focus:border-blue-500'}`}
                            />
                            <input
                              type="text"
                              placeholder="Institution"
                              value={newEdu.institution}
                              onChange={(e) => setNewEdu({ ...newEdu, institution: e.target.value })}
                              className={`h-12 px-4 rounded-xl outline-none font-bold text-xs ${darkMode ? 'bg-white/5 border-white/5 focus:border-blue-500' : 'bg-gray-50 border-gray-100 focus:border-blue-500'}`}
                            />
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Year"
                                value={newEdu.year}
                                onChange={(e) => setNewEdu({ ...newEdu, year: e.target.value })}
                                className={`flex-1 h-12 px-4 rounded-xl outline-none font-bold text-xs ${darkMode ? 'bg-white/5 border-white/5 focus:border-blue-500' : 'bg-gray-50 border-gray-100 focus:border-blue-500'}`}
                              />
                              <button onClick={addEdu} className="px-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20">Add</button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                            {(formData.education || []).map((edu, idx) => (
                              <div key={idx} className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-between group">
                                <div>
                                  <p className="text-xs font-black uppercase tracking-wider">{edu.degree}</p>
                                  <p className="text-[10px] font-bold opacity-50 uppercase">{edu.institution} • {edu.year}</p>
                                </div>
                                <button onClick={() => removeEdu(idx)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/10 rounded-lg">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Experience Builder */}
                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-black ml-1">Professional Experience</label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <input
                              type="text"
                              placeholder="Job Title"
                              value={newExp.title}
                              onChange={(e) => setNewExp({ ...newExp, title: e.target.value })}
                              className={`h-12 px-4 rounded-xl outline-none font-bold text-xs ${darkMode ? 'bg-white/5 border-white/5 focus:border-emerald-500' : 'bg-gray-50 border-gray-100 focus:border-emerald-500'}`}
                            />
                            <input
                              type="text"
                              placeholder="Company"
                              value={newExp.company}
                              onChange={(e) => setNewExp({ ...newExp, company: e.target.value })}
                              className={`h-12 px-4 rounded-xl outline-none font-bold text-xs ${darkMode ? 'bg-white/5 border-white/5 focus:border-emerald-500' : 'bg-gray-50 border-gray-100 focus:border-emerald-500'}`}
                            />
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Duration"
                                value={newExp.duration}
                                onChange={(e) => setNewExp({ ...newExp, duration: e.target.value })}
                                className={`flex-1 h-12 px-4 rounded-xl outline-none font-bold text-xs ${darkMode ? 'bg-white/5 border-white/5 focus:border-emerald-500' : 'bg-gray-50 border-gray-100 focus:border-emerald-500'}`}
                              />
                              <button onClick={addExp} className="px-4 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20">Add</button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                            {(formData.experience || []).map((exp, idx) => (
                              <div key={idx} className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between group">
                                <div>
                                  <p className="text-xs font-black uppercase tracking-wider">{exp.title}</p>
                                  <p className="text-[10px] font-bold opacity-50 uppercase">{exp.company} • {exp.duration}</p>
                                </div>
                                <button onClick={() => removeExp(idx)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/10 rounded-lg">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Skills Builder */}
                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-black ml-1">Key Skills & Expertises</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Add a skill (e.g. Accounting, Nursing, IT Support)"
                              value={newSkill}
                              onChange={(e) => setNewSkill(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                              className={`flex-1 h-12 px-4 rounded-xl outline-none font-bold text-xs ${darkMode ? 'bg-white/5 border-white/5 focus:border-amber-500' : 'bg-gray-50 border-gray-100 focus:border-amber-500'}`}
                            />
                            <button onClick={addSkill} className="px-6 bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20">Add</button>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mt-2">
                            {formData.skills.length === 0 && <p className="text-[10px] text-black font-bold uppercase tracking-tight opacity-40">No skills listed</p>}
                            {(formData.skills || []).map(s => (
                              <span key={s} className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                {s}
                                <button onClick={() => removeSkill(s)} className="hover:text-red-500"><X size={12} /></button>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 6: LOGIN ACCOUNT */}
                    <div className={`p-8 rounded-[2.5rem] border-2 transition-all duration-500 ${formData.createAccount ? 'border-indigo-500/50 bg-indigo-500/5 shadow-2xl shadow-indigo-500/10' : (darkMode ? 'border-white/5 bg-white/5' : 'border-gray-200 bg-white')}`}>
                      <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${formData.createAccount ? 'bg-indigo-500 text-white rotate-6' : 'bg-white/10 opacity-40'}`}>
                            {formData.createAccount ? <Unlock size={28} /> : <Lock size={28} />}
                          </div>
                          <div>
                            <h3 className="text-xl font-black tracking-tight">Khan Hub LOGIN ACCESS</h3>
                            <p className="text-sm opacity-50 font-medium">Enable mobile app & centralized dashboard access</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center bg-black/20 p-2 rounded-[1.5rem] border border-white/5 backdrop-blur-xl">
                          <button
                            onClick={() => setFormData({ ...formData, createAccount: true })}
                            className={`px-6 py-4 rounded-xl text-[11px] font-black tracking-[0.2em] transition-all duration-300 ${formData.createAccount ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/40' : 'opacity-30 hover:opacity-100'}`}
                          >
                            AUTHORIZED
                          </button>
                          <button
                            onClick={() => setFormData({ ...formData, createAccount: false })}
                            className={`px-6 py-4 rounded-xl text-[11px] font-black tracking-[0.2em] transition-all duration-300 ${!formData.createAccount ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'opacity-30 hover:opacity-100'}`}
                          >
                            RESTRICTED
                          </button>
                        </div>
                      </div>

                      {formData.createAccount && (
                        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-black/20 rounded-[2.5rem] border border-white/5 animate-in slide-in-from-top-4 duration-500">
                          <div className="space-y-3">
                            <label className="text-[10px] font-black tracking-[0.25em] text-indigo-400 uppercase ml-1">
                              User ID (Login Username) *
                            </label>
                            <div className="relative">
                              <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-500" />
                              <input
                                type="text"
                                placeholder="e.g. kamran-001 or REHAB-STF-005"
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
                                className={`w-full h-16 pl-12 pr-6 rounded-2xl font-mono text-sm outline-none transition-all ${darkMode
                                    ? 'bg-white/10 border-white/10 text-white placeholder:text-white/20 focus:bg-white/15 focus:border-indigo-500/50'
                                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-black focus:bg-white focus:border-indigo-500/50'
                                  }`}
                              />
                            </div>
                            <p className="text-[9px] text-indigo-400/60 font-bold ml-1 uppercase tracking-widest">
                              Login email will be: <span className="text-indigo-300">{formData.userId || '...'}{DEPARTMENTS.find(d => d.id === formData.department)?.emailDomain || '@rehab.Khan Hub'}</span>
                            </p>
                          </div>

                          <div className="space-y-3 relative">
                            <label className="text-[10px] font-black tracking-[0.25em] text-indigo-400 uppercase ml-1">SECURE ACCESS TOKEN (PASSWORD)*</label>
                            <div className="relative group">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter secure password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full h-16 px-6 rounded-2xl bg-white/10 border border-white/10 text-white font-mono placeholder:text-white/20 focus:bg-white/15 focus:border-indigo-500/50 outline-none transition-all"
                              />
                              <button
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                              >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                            <p className="text-[9px] opacity-30 font-bold ml-1 uppercase tracking-widest italic">Required for the first-time biometric enrollment.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECTION 6: DOCUMENTS */}
                    <div className={`p-8 rounded-[2.5rem] border transition-all relative overflow-hidden group ${darkMode ? 'border-white/5 bg-white/5' : 'bg-white border-gray-200'}`}>
                      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                        <ShieldAlert size={120} />
                      </div>

                      <div className="flex items-center gap-6 mb-10">
                        <div className="w-14 h-14 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shadow-inner shadow-pink-500/10">
                          <FileText className="text-pink-500" size={28} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black tracking-tight">VERIFICATION ARTIFACTS</h3>
                          <p className="text-sm opacity-50 font-medium">Digital archives for CNIC, certifications & employment contracts</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="relative h-48 rounded-[2rem] border-2 border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-pink-500/40 transition-all duration-300 flex flex-col items-center justify-center text-center p-8 group/upload">
                          <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center mb-4 group-hover/upload:scale-110 transition-transform">
                            <Plus className="text-pink-500" size={24} />
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest">Upload Archive</p>
                            <p className="text-[10px] opacity-30 mt-2 font-bold italic">MAX 10MB • PDF/IMG</p>
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

                        <div className="md:col-span-2 space-y-3 max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                          {formData.documents.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-20 border border-dashed border-white/5 rounded-[1.5rem]">
                              <UploadCloud size={32} strokeWidth={1} />
                              <p className="text-[10px] font-black uppercase mt-2">No documents staged</p>
                            </div>
                          ) : (
                            formData.documents.map((doc, idx) => (
                              <div key={idx} className="p-5 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group/item hover:bg-white/10 transition-colors animate-in fade-in slide-in-from-right-4">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-pink-500/5 flex items-center justify-center">
                                    <FileCheck className="text-pink-500" size={18} />
                                  </div>
                                  <div>
                                    <span className="text-xs font-black truncate max-w-[150px] md:max-w-xs block uppercase tracking-wider">{doc.name}</span>
                                    <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest mt-0.5">Verified Asset ID: {doc.url.split('/').pop()?.slice(0, 8)}...</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setFormData({ ...formData, documents: formData.documents.filter((_, i) => i !== idx) })}
                                  className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center opacity-0 group-hover/item:opacity-100 hover:bg-red-500 hover:text-white transition-all"
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
                    <div className="pt-10">
                      <button
                        type="button"
                        onClick={handleStaffSubmit}
                        disabled={submitting}
                        className="w-full group relative overflow-hidden h-24 rounded-[3rem] bg-indigo-600 text-white isolation-auto transition-all duration-700 hover:shadow-[0_0_50px_-12px_rgba(79,70,229,0.5)] active:scale-[0.98] disabled:opacity-50"
                      >
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 w-0 group-hover:w-full transition-all duration-700"></div>
                        <div className="flex items-center justify-center gap-6 relative z-10">
                          {submitting ? (
                            <Loader2 className="w-8 h-8 animate-spin" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all">
                              <ShieldCheck size={28} />
                            </div>
                          )}
                          <div className="text-left">
                            <span className="block text-[11px] font-black uppercase tracking-[0.4em] opacity-50 mb-0.5">Secure Initialization</span>
                            <span className="block text-2xl font-black uppercase tracking-widest">
                              {submitting ? 'PROCESSING PROTOCOL...' : 'DEPLOY STAFF PROFILE'}
                            </span>
                          </div>
                          {!submitting && <ArrowRightCircle size={28} className="ml-4 opacity-30 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />}
                        </div>

                        {/* Background Decorative Flare */}
                        <div className="absolute top-0 -left-1/4 w-1/2 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 group-hover:left-full transition-all duration-1000 ease-in-out"></div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Right Summary Column */}
          <div className="space-y-8">
            <div className={`p-10 rounded-[3rem] border sticky top-8 transition-all duration-500 ${darkMode ? 'bg-black/40 border-white/10 backdrop-blur-3xl shadow-2xl' : 'bg-white border-gray-100 shadow-xl shadow-blue-900/5'}`}>
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-xl font-black uppercase tracking-tight">Live Profile</h3>
                <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[10px] font-black tracking-widest uppercase">
                  STAGING
                </div>
              </div>

              <div className="space-y-8">
                {[
                  {
                    label: 'Authentication ID',
                    value: formData.firstName ? `${formData.firstName.toLowerCase()}.${formData.lastName.toLowerCase() || 'stf'}@rehab.Khan Hub` : 'Awaiting Details',
                    icon: Fingerprint,
                    color: 'text-indigo-500',
                    bg: 'bg-indigo-500/10'
                  },
                  {
                    label: 'Security Clearance',
                    value: 'Operational Staff - L1',
                    icon: ShieldCheck,
                    color: 'text-emerald-500',
                    bg: 'bg-emerald-500/10'
                  },
                  {
                    label: 'Work Area',
                    value: formData.department ? (DEPARTMENTS.find(d => d.id === formData.department)?.name) : 'Physical Therapy Unit',
                    icon: Crosshair,
                    color: 'text-orange-500',
                    bg: 'bg-orange-500/10'
                  },
                  {
                    label: 'Onboarding Date',
                    value: formData.joiningDate || formatDateDMY(new Date()),
                    icon: Calendar,
                    color: 'text-pink-500',
                    bg: 'bg-pink-500/10'
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-6 group cursor-default">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 duration-500 ${item.bg} ${item.color}`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col justify-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 leading-none mb-2">{item.label}</p>
                      <p className="text-sm font-black truncate max-w-[160px] tracking-wide uppercase">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 p-6 rounded-[2rem] bg-white/5 border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">System Readiness</p>
                  <p className="text-[10px] font-black text-indigo-500 tracking-widest">94%</p>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 w-[94%]" />
                </div>
              </div>
            </div>

            <div className={`p-10 rounded-[3rem] border group transition-all duration-500 cursor-pointer overflow-hidden relative ${darkMode ? 'bg-indigo-600/10 border-indigo-500/20' : 'bg-indigo-600 text-white shadow-xl shadow-blue-600/20'}`}>
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform">
                  <BookOpen size={24} />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight mb-3 italic">Protocol V2.0</h3>
                <p className={`text-xs font-bold leading-relaxed mb-8 ${darkMode ? 'text-indigo-400' : 'text-indigo-100'}`}>
                  Every deployment requires valid CNIC and verified joining date for biometric automation.
                </p>
                <button className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition-all ${darkMode ? 'border-indigo-500/30 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white' : 'border-white/30 bg-white/20 text-white hover:bg-white hover:text-indigo-600'
                  }`}>
                  INITIALIZATION DOCS
                </button>
              </div>
              <Activity className={`absolute -right-12 -bottom-12 w-48 h-48 transition-transform duration-1000 group-hover:scale-125 opacity-[0.05] ${darkMode ? 'text-indigo-500' : 'text-white'}`} />
            </div>
          </div>

        </div>

        {/* Audit Table */}
        <div className="mt-12">
          <div className={`rounded-[2.5rem] border overflow-hidden transition-all duration-500 ${darkMode ? 'bg-gray-900/40 border-gray-800 shadow-2xl' : 'bg-white border-gray-200 shadow-xl shadow-blue-900/5'
            }`}>
            <div className={`px-8 py-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${darkMode ? 'border-gray-800 bg-gray-900/60' : 'border-gray-50 bg-gray-50/50'}`}>
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-black" />
                <h2 className="text-lg font-black uppercase tracking-tight">Recent System Access</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${darkMode ? 'bg-gray-800 border-gray-700 text-black' : 'bg-white border-gray-200 text-black'
                  }`}>
                  {users.length} Records
                </span>
              </div>
            </div>

            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800/50">
              {users.length === 0 ? (
                <div className="px-6 py-12 text-center text-black font-bold uppercase tracking-widest text-[11px]">
                  No account records initialized
                </div>
              ) : (
                users.map((u) => (
                  <div key={u.id} className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${u.role === 'admin' ? 'bg-blue-500 text-white' :
                          u.role === 'staff' ? 'bg-indigo-500 text-white' : 'bg-emerald-500 text-white'
                        }`}>
                        {u.displayName?.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black truncate">{u.displayName}</p>
                        <p className={`text-[10px] font-bold truncate ${darkMode ? 'text-black' : 'text-black'}`}>
                          {u.customId}{DEPARTMENTS.find(d => d.id === formData.department)?.emailDomain || '@rehab.Khan Hub'}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <span className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border text-center ${u.role === 'manager' || u.role === 'admin'
                          ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                          : 'bg-green-500/10 text-green-500 border-green-500/20'
                        }`}>
                        {u.role}
                      </span>
                      <button
                        disabled={toggling === u.id}
                        onClick={() => handleToggleStatus(u.id, u.isActive !== false)}
                        className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${u.isActive !== false
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-red-500/10 text-red-500'
                          }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${u.isActive !== false ? 'bg-green-500' : 'bg-red-500'}`} />
                        {u.isActive !== false ? 'Active' : 'Disabled'}
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        const col = u.department === 'rehab' || u._origin === 'rehab' || !u.department ? 'rehab' : u.department;
                        router.push(`/hq/dashboard/manager/staff/${u.id}?collection=${col}`);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest"
                    >
                      Edit
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <div className="overflow-x-auto pb-4">
                <div className="table-responsive">

                  <table className="w-full text-left min-w-[800px]">
                    <thead>
                      <tr className={`text-[10px] font-black uppercase tracking-tighter ${darkMode ? 'text-black border-gray-800' : 'text-black border-gray-50'}`}>
                        <th className="px-8 py-5 text-[9px]">Full Identity</th>
                        <th className="px-8 py-5 text-[9px]">Assigned Role</th>
                        <th className="px-8 py-5 text-[9px]">Initialization Date</th>
                        <th className="px-8 py-5 text-[9px]">Operational Status</th>
                        <th className="px-8 py-5 text-right text-[9px] font-black uppercase tracking-widest opacity-40">Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-gray-800/50' : 'divide-gray-50'}`}>
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-8 py-12 text-center text-black font-bold uppercase tracking-widest text-[11px]">
                            No account records initialized
                          </td>
                        </tr>
                      ) : (
                        users.map(u => (
                          <tr key={u.id} className="group hover:bg-blue-500/5 transition-all">
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${u.role === 'admin' ? 'bg-blue-500 text-white' :
                                    u.role === 'staff' ? 'bg-indigo-500 text-white' : 'bg-emerald-500 text-white'
                                  }`}>
                                  {u.displayName?.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-black truncate">{u.displayName}</p>
                                  <p className={`text-[10px] font-bold truncate ${darkMode ? 'text-black' : 'text-black'}`}>
                                    {u.customId}{DEPARTMENTS.find(d => d.id === formData.department)?.emailDomain || '@rehab.Khan Hub'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-5 capitalize">
                              <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${u.role === 'manager' || u.role === 'admin'
                                  ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                  : 'bg-green-500/10 text-green-500 border-green-500/20'
                                }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className={`px-8 py-5 text-xs font-bold ${darkMode ? 'text-black' : 'text-black'}`}>
                              {u.createdAt ? (() => {
                                try {
                                  const date = u.createdAt.seconds ? new Date(u.createdAt.seconds * 1000) : new Date(u.createdAt);
                                  return formatDateDMY(date);
                                } catch {
                                  return 'Format Error';
                                }
                              })() : 'Pending'}
                            </td>
                            <td className="px-8 py-5">
                              <button
                                disabled={toggling === u.id}
                                onClick={() => handleToggleStatus(u.id, u.isActive !== false)}
                                className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${u.isActive !== false
                                    ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                                    : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                                  }`}
                              >
                                <div className={`w-1.5 h-1.5 rounded-full ${u.isActive !== false ? 'bg-green-500' : 'bg-red-500'}`} />
                                {u.isActive !== false ? 'Active' : 'Disabled'}
                                {toggling === u.id && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
                              </button>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <button
                                onClick={() => {
                                  const col = u.department === 'rehab' || u._origin === 'rehab' || !u.department
                                    ? 'rehab'
                                    : u.department;
                                  router.push(`/hq/dashboard/manager/staff/${u.id}?collection=${col}`);
                                }}
                                className="px-6 py-2.5 rounded-xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20"
                              >
                                Edit
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

      </div>
    </div>
  );
}
