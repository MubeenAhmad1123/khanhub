export const GLOBAL_DUTIES = [
  "Attendance Entry",
  "Patient Vitals",
  "Ward Round",
  "Area Cleanliness",
  "Morning Prayer Supervision",
  "Fajar Wake-up Round",
  "Medication Distribution (Morning)",
  "Medication Distribution (Night)",
  "Meal Supervision (Breakfast)",
  "Meal Supervision (Lunch)",
  "Meal Supervision (Dinner)",
  "Patient Activity Monitoring",
  "Counselling Session Support",
  "Vital Signs Check",
  "Night Security Round",
  "Gate/Entry Management",
  "Cleaning Supervision",
  "Visitor Management"
];

export const GLOBAL_DRESS_ITEMS = [
  "Dress Pant",
  "Dress Shirt",
  "Tie",
  "Uniform Shirt",
  "Black Shoes",
  "ID Card",
  "White Overall",
  "Black OT Kit",
  "Hijab",
  "Lab Coat",
  "Security Uniform",
  "Security Cap",
  "Torch",
  "Whistle"
];

export const UNIFORM_RULES: Record<string, { key: string; label: string }[]> = {
  'hospital_male_doctor': [{ key: 'id_card', label: 'ID Card' }],
  'hospital_female_doctor': [{ key: 'id_card', label: 'ID Card' }],
  'hospital_male_staff': [
    { key: 'black_ot_kit', label: 'Black OT Kit' },
    { key: 'white_overall', label: 'White Overall' },
    { key: 'shoes', label: 'Shoes' },
    { key: 'id_card', label: 'ID Card' }
  ],
  'hospital_female_staff': [
    { key: 'black_ot_kit', label: 'Black OT Kit' },
    { key: 'white_overall', label: 'White Overall' },
    { key: 'shoes', label: 'Shoes' },
    { key: 'id_card', label: 'ID Card' },
    { key: 'hijab', label: 'Hijab' }
  ],
  'spims_male_teacher': [
    { key: 'dress_pant', label: 'Dress Pant' },
    { key: 'dress_shirt', label: 'Dress Shirt' },
    { key: 'tie', label: 'Tie' },
    { key: 'shoes', label: 'Shoes' },
    { key: 'white_overall', label: 'White Overall' },
    { key: 'id_card', label: 'ID Card' }
  ],
  'spims_female_teacher': [
    { key: 'white_overall', label: 'White Overall' },
    { key: 'id_card', label: 'ID Card' }
  ],
  'rehab_male_admin': [
    { key: 'dress_pant', label: 'Dress Pant' },
    { key: 'dress_shirt', label: 'Dress Shirt' },
    { key: 'tie', label: 'Tie' },
    { key: 'shoes', label: 'Shoes' },
    { key: 'id_card', label: 'ID Card' }
  ],
  'rehab_female_doctor': [
    { key: 'white_overall', label: 'White Overall' },
    { key: 'id_card', label: 'ID Card' },
    { key: 'shoes', label: 'Shoes' }
  ],
  'rehab_male_reception': [
    { key: 'dress_pant', label: 'Dress Pant' },
    { key: 'dress_shirt', label: 'Dress Shirt' },
    { key: 'tie', label: 'Tie' },
    { key: 'shoes', label: 'Shoes' },
    { key: 'id_card', label: 'ID Card' }
  ],
  'rehab_female_reception': [
    { key: 'black_ot_kit', label: 'Black OT Kit' },
    { key: 'hijab', label: 'Hijab' },
    { key: 'white_overall', label: 'White Overall' },
    { key: 'shoes', label: 'Shoes' },
    { key: 'id_card', label: 'ID Card' }
  ],
  'rehab_male_security': [
    { key: 'security_uniform', label: 'Security Uniform' },
    { key: 'shoes', label: 'Shoes' },
    { key: 'id_card', label: 'ID Card' },
    { key: 'security_cap', label: 'Security Cap' }
  ],
  'rehab_male_default': [
    { key: 'dress_pant', label: 'Dress Pant' },
    { key: 'dress_shirt', label: 'Dress Shirt' },
    { key: 'tie', label: 'Tie' },
    { key: 'shoes', label: 'Shoes' },
    { key: 'id_card', label: 'ID Card' }
  ],
  'sukoon-center_female_admin': [{ key: 'id_card', label: 'ID Card' }],
  'sukoon-center_male_default': [
    { key: 'dress_pant', label: 'Dress Pant' },
    { key: 'dress_shirt', label: 'Dress Shirt' },
    { key: 'tie', label: 'Tie' },
    { key: 'shoes', label: 'Shoes' },
    { key: 'id_card', label: 'ID Card' }
  ],
  'social-media_male_default': [
    { key: 'dress_pant', label: 'Dress Pant' },
    { key: 'dress_shirt', label: 'Dress Shirt' },
    { key: 'tie', label: 'Tie' },
    { key: 'shoes', label: 'Shoes' },
    { key: 'id_card', label: 'ID Card' }
  ],
  'it_male_default': [
    { key: 'dress_pant', label: 'Dress Pant' },
    { key: 'dress_shirt', label: 'Dress Shirt' },
    { key: 'tie', label: 'Tie' },
    { key: 'shoes', label: 'Shoes' },
    { key: 'id_card', label: 'ID Card' }
  ],
  'welfare_male_admin': [{ key: 'id_card', label: 'ID Card' }],
  'hq_male_cashier': [
    { key: 'dress_pant', label: 'Dress Pant' },
    { key: 'dress_shirt', label: 'Dress Shirt' },
    { key: 'tie', label: 'Tie' },
    { key: 'shoes', label: 'Shoes' },
    { key: 'id_card', label: 'ID Card' }
  ],
  'security_male_default': [
    { key: 'security_uniform', label: 'Security Uniform' },
    { key: 'shoes', label: 'Shoes' },
    { key: 'id_card', label: 'ID Card' },
    { key: 'security_cap', label: 'Security Cap' },
    { key: 'torch', label: 'Torch' },
    { key: 'whistle', label: 'Whistle' }
  ],
  'security_female_default': [{ key: 'id_card', label: 'ID Card' }],
};

// ── ROLE & DEPARTMENT SPECIFIC COMPREHENSIVE DUTIES ─────────────────────────
export const ROLE_SPECIFIC_DUTIES: Record<string, { key: string; label: string }[]> = {
  // College (SPIMS) Administrator
  'spims_admin': [
    { key: 'morning_assembly_attendance', label: 'Morning Assembly & Student Attendance Monitoring' },
    { key: 'faculty_staff_verification', label: 'Faculty & Staff Daily Duty Verification' },
    { key: 'lecture_lab_readiness', label: 'Lecture Hall & Lab Readiness Inspection' },
    { key: 'admissions_inquiries_supervision', label: 'Admissions & Student Inquiries Supervision' },
    { key: 'fee_financial_review', label: 'Fee Collection & Financial Record Review' },
    { key: 'syllabus_schedule_adherence', label: 'Academic Syllabus & Class Schedule Adherence' },
    { key: 'lab_session_supervision', label: 'Practical Clinical & Lab Sessions Supervision' },
    { key: 'student_discipline_uniform', label: 'Student Discipline & Uniform Code Enforcement' },
    { key: 'campus_cleanliness_inspection', label: 'Campus Cleanliness & Hygiene Inspection' },
    { key: 'grievance_parent_dealing', label: 'Student Grievances & Parent Dealing' },
    { key: 'daily_reporting_management', label: 'Daily Operational Report to Management' },
    { key: 'closing_security_handover', label: 'Evening Closing & Security Protocol Handover' }
  ],

  // College (SPIMS) Faculty / Teacher
  'spims_teacher': [
    { key: 'curriculum_class_delivery', label: 'Class Delivery According to Prescribed Curriculum' },
    { key: 'daily_lecture_plan', label: 'Daily Lecture Plan Preparation & Execution' },
    { key: 'student_attendance_entry', label: 'Student Classroom Attendance Record Maintenance' },
    { key: 'assignments_quizzes_conduction', label: 'Conducting Quizzes, Tests & Class Assignments' },
    { key: 'practical_training_supervision', label: 'Supervising Clinical & Practical Training Sessions' },
    { key: 'classroom_discipline', label: 'Classroom & Student Disciplinary Enforcement' },
    { key: 'student_guidance_mentorship', label: 'Providing Ethical & Academic Guidance to Students' },
    { key: 'academic_performance_reporting', label: 'Academic Record & Monthly Performance Reporting' }
  ],

  // Hospital Administrator
  'hospital_admin': [
    { key: 'morning_hospital_inspection', label: 'Morning Hospital Facility & Ward Inspection' },
    { key: 'staff_duty_attendance_verification', label: 'Staff Duty Attendance & Shift Verification' },
    { key: 'emergency_icu_readiness', label: 'Emergency & OT/ICU Readiness Inspection' },
    { key: 'patient_registration_inflow', label: 'Patient Inflow, Registration & Counter Supervision' },
    { key: 'pharmacy_inventory_review', label: 'Pharmacy & Medical Inventory Stock Review' },
    { key: 'patient_care_complaints', label: 'Patient Care Feedback & Grievance Resolution' },
    { key: 'revenue_financial_review', label: 'Revenue & Financial Cashier Handover Review' },
    { key: 'night_security_handover', label: 'Night Security & Staff Shift Handover Protocol' }
  ],

  // Hospital Doctor / Medical Officer
  'hospital_doctor': [
    { key: 'morning_ward_rounds', label: 'Morning In-Patient Ward Rounds & Vitals Review' },
    { key: 'opd_consultation_diagnosis', label: 'OPD Clinical Consultation & Patient Diagnosis' },
    { key: 'emergency_patient_triage', label: 'Emergency Patient Triage & Immediate Resuscitation' },
    { key: 'treatment_charting_prescriptions', label: 'Medication Charting, Prescriptions & Lab Orders' },
    { key: 'critical_patient_monitoring', label: 'Critical / ICU Patient Follow-up & Monitoring' },
    { key: 'clinical_procedures_oversight', label: 'Clinical Procedures & Surgical Assistance Oversight' },
    { key: 'discharge_summary_notes', label: 'Discharge Summaries & Case Documentation' },
    { key: 'evening_medical_handover', label: 'Evening Medical Staff Clinical Handover' }
  ],

  // Hospital Nurse
  'hospital_nurse': [
    { key: 'patient_vital_signs', label: 'Vital Signs Check & Monitoring Record' },
    { key: 'medication_administration', label: 'Timely Medication & Drip/IV Administration' },
    { key: 'ward_cleanliness_bedding', label: 'Ward Cleanliness, Bed Making & Patient Hygiene' },
    { key: 'doctor_procedure_assistance', label: 'Assisting Doctors during Examinations & Rounds' },
    { key: 'emergency_tray_equipment', label: 'Emergency Tray, Oxygen & Equipment Check' },
    { key: 'patient_nursing_notes', label: 'Patient Nursing Charting & Documentation' },
    { key: 'shift_nursing_handover', label: 'Nurse-to-Nurse Shift Handover' }
  ],

  // Rehab Center Administrator
  'rehab_admin': [
    { key: 'patient_morning_routine', label: 'Patient Morning Wake-up & Assembly Routine' },
    { key: 'ward_cleanliness_hygiene', label: 'Ward & Residential Area Cleanliness Audit' },
    { key: 'meal_nutrition_supervision', label: 'Meal & Nutrition Timing Supervision (Breakfast/Lunch/Dinner)' },
    { key: 'therapy_session_supervision', label: 'Therapy & Counselling Schedule Verification' },
    { key: 'family_dealing_updates', label: 'Patient Family Communication & Progress Updates' },
    { key: 'campus_security_surveillance', label: 'Campus Security & CCTV Surveillance Audit' },
    { key: 'daily_financial_expenses', label: 'Daily Expense Logging & Cashier Reconciliation' },
    { key: 'night_shift_protocol_handover', label: 'Night Staff Briefing & Security Handover' }
  ],

  // Rehab Psychologist / Counsellor
  'rehab_counsellor': [
    { key: 'individual_counselling_sessions', label: 'Individual Psychological Counselling Sessions' },
    { key: 'group_therapy_sessions', label: 'Conducting Group Therapy & 12-Step Sessions' },
    { key: 'mental_health_assessments', label: 'Mental Health Status Assessments & Progress Tracking' },
    { key: 'family_counselling_guidance', label: 'Family Counselling & Relapse Prevention Guidance' },
    { key: 'clinical_case_notes', label: 'Daily Clinical Case Notes & Patient File Maintenance' }
  ],

  // Social Media & Content Publishing
  'social-media_admin': [
    { key: 'daily_graphic_designing', label: 'Daily Social Media Posts & Banner Graphic Design' },
    { key: 'video_recording_editing', label: 'Event & Educational Video Recording & Editing' },
    { key: 'multiplatform_publishing', label: 'Multi-Platform Content Uploading & Publishing' },
    { key: 'audience_engagement_comments', label: 'Audience Inquiries & Social Media Comments Dealing' },
    { key: 'campaign_analytics_review', label: 'Post Reach, Engagement & Campaign Analytics Review' },
    { key: 'interdepartmental_media_coverage', label: 'Department Coordination for Live Event Coverage' }
  ],

  // IT & Networks
  'it_admin': [
    { key: 'network_uptime_monitoring', label: 'Network Infrastructure & Router Internet Uptime Check' },
    { key: 'server_database_backups', label: 'Server Services, Cloud Database & Backup Verification' },
    { key: 'helpdesk_support_tickets', label: 'Staff Helpdesk & System Support Ticket Resolution' },
    { key: 'biometric_cctv_devices', label: 'Biometric Attendance Machines & CCTV Maintenance' },
    { key: 'software_security_updates', label: 'Software Updates, Antivirus & Cyber Security Checks' },
    { key: 'hardware_maintenance', label: 'Hardware Maintenance & Asset Inventory Auditing' }
  ],

  // Welfare Organization Admin
  'welfare_admin': [
    { key: 'beneficiary_case_verification', label: 'Beneficiary Registration & Need Verification' },
    { key: 'aid_ration_distribution', label: 'Aid, Ration & Welfare Distribution Supervision' },
    { key: 'donor_receipts_bookkeeping', label: 'Donation Management & Official Receipt Bookkeeping' },
    { key: 'field_home_visits', label: 'Field Need Assessment & Family Home Visits' },
    { key: 'welfare_transparency_audit', label: 'Daily Welfare Logbook & Transparency Record' }
  ],

  // Security Guard / Personal Guard
  'security_guard': [
    { key: 'main_gate_access_control', label: 'Main Gate Access Control & Visitor Log Entry' },
    { key: 'uniform_whistle_inspection', label: 'Security Uniform, Whistle & Torch Inspection' },
    { key: 'perimeter_security_patrol', label: 'Perimeter Patrol & Facility Area Surveillance' },
    { key: 'emergency_protocol_vigilance', label: 'Emergency Protocol Vigilance & Gate Closure' },
    { key: 'night_shift_handover_log', label: 'Shift Handover & Security Incident Log Sign-off' }
  ],

  // General Staff Operational Duties (Reliable universal default)
  'default_staff': [
    { key: 'morning_attendance_punch', label: 'Morning Reporting & Biometric Attendance Punch' },
    { key: 'assigned_tasks_execution', label: 'Daily Operational Tasks Execution According to SOP' },
    { key: 'workstation_cleanliness', label: 'Workstation & Department Area Cleanliness Check' },
    { key: 'standard_sop_compliance', label: 'Standard Operating Procedures & Discipline Compliance' },
    { key: 'team_coordination_updates', label: 'Team Coordination & Daily Progress Updates' },
    { key: 'closing_handover_report', label: 'Daily Closing, Task Documentation & Handover Report' }
  ]
};

// ── UTILITY: DETECT LEGACY GENERIC PLACEHOLDER DUTIES ─────────────────────────
export function isGenericPlaceholderDuty(dutyNameOrKey: string): boolean {
  if (!dutyNameOrKey) return false;
  const clean = String(dutyNameOrKey).trim().toLowerCase();
  const genericList = [
    'morning', 'afternoon', 'evening',
    'morning duty', 'afternoon duty', 'evening duty',
    'morning_duty', 'afternoon_duty', 'evening_duty',
    'duty_1', 'duty_2', 'duty_3',
    'item_0', 'item_1', 'item_2'
  ];
  return genericList.includes(clean);
}

// ── UTILITY: INTELLIGENT DUTY RESOLVER FOR ANY STAFF ─────────────────────────
export function resolveStaffDuties(staff: any): { key: string; label: string }[] {
  if (!staff) return ROLE_SPECIFIC_DUTIES['default_staff'];

  // 1. Check staff.dutyConfig
  if (Array.isArray(staff.dutyConfig) && staff.dutyConfig.length > 0) {
    const nonGenericConfig = staff.dutyConfig.filter((item: any) => {
      const key = String(item?.key || '').trim();
      const label = String(item?.label || item?.name || '').trim();
      return !isGenericPlaceholderDuty(key) && !isGenericPlaceholderDuty(label);
    });
    if (nonGenericConfig.length > 0) {
      return nonGenericConfig.map((item: any, idx: number) => ({
        key: String(item.key || `duty_${idx + 1}`).trim(),
        label: String(item.label || item.name || item.key || `Duty ${idx + 1}`).trim()
      }));
    }
  }

  // 2. Check staff.duties (string array or object array)
  if (Array.isArray(staff.duties) && staff.duties.length > 0) {
    const nonGenericDuties = staff.duties.filter((d: any) => {
      const label = typeof d === 'string' ? d.trim() : String(d?.name || d?.label || d?.dutyName || '').trim();
      const key = typeof d === 'object' ? String(d?.key || d?.id || '').trim() : '';
      return label && !isGenericPlaceholderDuty(label) && !isGenericPlaceholderDuty(key);
    });

    if (nonGenericDuties.length > 0) {
      return nonGenericDuties.map((d: any, idx: number) => {
        const label = typeof d === 'string' ? d.trim() : String(d?.name || d?.label || d?.dutyName || `Duty ${idx + 1}`).trim();
        const rawKey = typeof d === 'object' && d?.key ? String(d.key) : label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        return {
          key: rawKey || `duty_${idx + 1}`,
          label
        };
      });
    }
  }

  // 3. Match by department and designation / role
  const dept = String(staff.department || staff.dept || staff._dept || '').toLowerCase().trim();
  const desig = String(staff.designation || '').toLowerCase().trim();
  const role = String(staff.role || '').toLowerCase().trim();

  // SPIMS College
  if (dept.includes('spims') || dept.includes('college') || dept.includes('health-science')) {
    if (desig.includes('admin') || role.includes('admin') || desig.includes('principal') || desig.includes('coordinator')) {
      return ROLE_SPECIFIC_DUTIES['spims_admin'];
    }
    return ROLE_SPECIFIC_DUTIES['spims_teacher'];
  }

  // Hospital
  if (dept.includes('hospital')) {
    if (desig.includes('admin') || role.includes('admin') || desig.includes('manager')) {
      return ROLE_SPECIFIC_DUTIES['hospital_admin'];
    }
    if (desig.includes('doc') || desig.includes('mo') || desig.includes('surgeon') || desig.includes('physician')) {
      return ROLE_SPECIFIC_DUTIES['hospital_doctor'];
    }
    if (desig.includes('nurse') || desig.includes('sister') || desig.includes('dispenser')) {
      return ROLE_SPECIFIC_DUTIES['hospital_nurse'];
    }
  }

  // Rehab
  if (dept.includes('rehab')) {
    if (desig.includes('psych') || desig.includes('counsel') || desig.includes('therap')) {
      return ROLE_SPECIFIC_DUTIES['rehab_counsellor'];
    }
    if (desig.includes('admin') || role.includes('admin') || desig.includes('manager') || desig.includes('incharge')) {
      return ROLE_SPECIFIC_DUTIES['rehab_admin'];
    }
  }

  // Social Media
  if (dept.includes('media') || dept.includes('social')) {
    return ROLE_SPECIFIC_DUTIES['social-media_admin'];
  }

  // IT
  if (dept.includes('it') || desig.includes('developer') || desig.includes('network') || desig.includes('system')) {
    return ROLE_SPECIFIC_DUTIES['it_admin'];
  }

  // Welfare
  if (dept.includes('welfare')) {
    return ROLE_SPECIFIC_DUTIES['welfare_admin'];
  }

  // Security
  if (desig.includes('guard') || desig.includes('security') || role.includes('security')) {
    return ROLE_SPECIFIC_DUTIES['security_guard'];
  }

  // Designation based fallbacks across other departments
  if (desig.includes('admin') || role.includes('admin') || desig.includes('manager')) {
    return ROLE_SPECIFIC_DUTIES['spims_admin'];
  }
  if (desig.includes('teacher') || desig.includes('lecturer') || desig.includes('faculty')) {
    return ROLE_SPECIFIC_DUTIES['spims_teacher'];
  }
  if (desig.includes('nurse')) {
    return ROLE_SPECIFIC_DUTIES['hospital_nurse'];
  }

  return ROLE_SPECIFIC_DUTIES['default_staff'];
}

// ── UTILITY: INTELLIGENT DRESS CODE RESOLVER FOR ANY STAFF ───────────────────
export function resolveStaffDressCode(staff: any): { key: string; label: string }[] {
  if (!staff) {
    return [
      { key: 'dress_pant', label: 'Dress Pant' },
      { key: 'dress_shirt', label: 'Dress Shirt' },
      { key: 'tie', label: 'Tie' },
      { key: 'shoes', label: 'Shoes' },
      { key: 'id_card', label: 'ID Card' }
    ];
  }

  // 1. Check staff.dressCodeConfig
  if (Array.isArray(staff.dressCodeConfig) && staff.dressCodeConfig.length > 0) {
    return staff.dressCodeConfig.map((item: any, idx: number) => ({
      key: String(item?.key || `dress_${idx + 1}`).trim(),
      label: String(item?.label || item?.name || item?.key || `Item ${idx + 1}`).trim()
    }));
  }

  // 2. Check staff.uniformItems or staff.dressItems
  const rawUniform = staff.uniformItems || staff.dressItems || staff.uniformRules;
  if (Array.isArray(rawUniform) && rawUniform.length > 0) {
    return rawUniform.map((item: any, idx: number) => ({
      key: typeof item === 'object' && item?.key ? String(item.key) : String(item).toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      label: typeof item === 'object' ? String(item?.label || item?.name || item?.key || `Item ${idx + 1}`) : String(item)
    }));
  }

  // 3. Match from UNIFORM_RULES
  const dept = String(staff.department || staff.dept || staff._dept || '').toLowerCase().trim();
  const gender = String(staff.gender || 'male').toLowerCase().trim();
  const desig = String(staff.designation || '').toLowerCase().trim();

  let ruleKey = `${dept}_${gender}_default`;
  if (desig.includes('doctor')) ruleKey = `${dept}_${gender}_doctor`;
  else if (desig.includes('admin')) ruleKey = `${dept}_${gender}_admin`;
  else if (desig.includes('security') || desig.includes('guard')) ruleKey = `${dept}_${gender}_security`;
  else if (desig.includes('reception')) ruleKey = `${dept}_${gender}_reception`;
  else if (desig.includes('teacher') || desig.includes('lecturer')) ruleKey = `${dept}_${gender}_teacher`;
  else if (desig.includes('cashier')) ruleKey = `${dept}_${gender}_cashier`;
  else if (desig.includes('nurse')) ruleKey = `${dept}_${gender}_staff`;

  if (UNIFORM_RULES[ruleKey]) {
    return UNIFORM_RULES[ruleKey];
  }

  // Generic department fallbacks
  if (UNIFORM_RULES[`${dept}_${gender}_default`]) {
    return UNIFORM_RULES[`${dept}_${gender}_default`];
  }

  // Default gender fallbacks
  if (gender === 'female') {
    return [
      { key: 'white_overall', label: 'White Overall' },
      { key: 'shoes', label: 'Shoes' },
      { key: 'id_card', label: 'ID Card' }
    ];
  }

  return [
    { key: 'dress_pant', label: 'Dress Pant' },
    { key: 'dress_shirt', label: 'Dress Shirt' },
    { key: 'tie', label: 'Tie' },
    { key: 'shoes', label: 'Shoes' },
    { key: 'id_card', label: 'ID Card' }
  ];
}
