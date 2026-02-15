// src/data/departments.ts - ENHANCED WITH UNIQUE COLOR THEMES
// ─────────────────────────────────────────────────────────────────
// Each department now has a professional color scheme matching
// real-world enterprise branding standards
// ─────────────────────────────────────────────────────────────────

import { Department, DepartmentCategory } from '@/types/department';

export const DEPARTMENT_CATEGORIES: DepartmentCategory[] = [
  {
    key: 'social',
    label: 'Social Services',
    icon: '🏥',
    description: 'Health, education, and community welfare'
  },
  {
    key: 'infrastructure',
    label: 'Infrastructure',
    icon: '🏗️',
    description: 'Development and public works'
  },
  {
    key: 'governance',
    label: 'Governance',
    icon: '⚖️',
    description: 'Administration and legal services'
  },
  {
    key: 'economy',
    label: 'Economy',
    icon: '💼',
    description: 'Finance, trade, and employment'
  }
];

// ── DEPARTMENT COLOR THEMES ──
// Professional color palettes inspired by industry leaders
export const DEPARTMENT_THEMES = {
  'institute-health-sciences': {
    primary: '#2563EB',      // Blue - Trust & Medical Excellence
    secondary: '#1E40AF',
    accent: '#60A5FA',
    light: '#DBEAFE',
    gradient: 'from-blue-600 to-blue-800'
  },
  'education': {
    primary: '#059669',      // Green - Growth & Learning
    secondary: '#047857',
    accent: '#34D399',
    light: '#D1FAE5',
    gradient: 'from-emerald-600 to-green-700'
  },
  'medical-center': {
    primary: '#DC2626',      // Red - Emergency & Healthcare (KEEP ORIGINAL)
    secondary: '#B91C1C',
    accent: '#F87171',
    light: '#FEE2E2',
    gradient: 'from-red-600 to-red-800'
  },
  'transport': {
    primary: '#F59E0B',      // Amber - Movement & Energy
    secondary: '#D97706',
    accent: '#FBBF24',
    light: '#FEF3C7',
    gradient: 'from-amber-600 to-orange-600'
  },
  'surgical-services': {
    primary: '#7C3AED',      // Purple - Precision & Excellence
    secondary: '#6D28D9',
    accent: '#A78BFA',
    light: '#EDE9FE',
    gradient: 'from-violet-600 to-purple-700'
  },
  'surgical-repair': {
    primary: '#DB2777',      // Pink - Care & Restoration
    secondary: '#BE185D',
    accent: '#F472B6',
    light: '#FCE7F3',
    gradient: 'from-pink-600 to-rose-600'
  },
  'social-welfare': {
    primary: '#0D9488',      // Teal - Community & Support
    secondary: '#0F766E',
    accent: '#2DD4BF',
    light: '#CCFBF1',
    gradient: 'from-teal-600 to-cyan-700'
  },
  'job-placement': {
    primary: '#0EA5E9',      // Sky Blue - Opportunity & Career
    secondary: '#0284C7',
    accent: '#38BDF8',
    light: '#E0F2FE',
    gradient: 'from-sky-600 to-blue-600'
  },
  'skill-development': {
    primary: '#EA580C',      // Orange - Skills & Training
    secondary: '#C2410C',
    accent: '#FB923C',
    light: '#FFEDD5',
    gradient: 'from-orange-600 to-amber-700'
  },
  'residential-services': {
    primary: '#7C3AED',      // Purple - Housing & Development
    secondary: '#6D28D9',
    accent: '#A78BFA',
    light: '#EDE9FE',
    gradient: 'from-purple-600 to-violet-700'
  },
  'rehabilitation': {
    primary: '#0891B2',      // Cyan - Recovery & Healing
    secondary: '#0E7490',
    accent: '#22D3EE',
    light: '#CFFAFE',
    gradient: 'from-cyan-600 to-sky-600'
  },
  'tourism': {
    primary: '#16A34A',      // Green - Nature & Tourism
    secondary: '#15803D',
    accent: '#4ADE80',
    light: '#DCFCE7',
    gradient: 'from-green-600 to-emerald-700'
  },
  'marketing': {
    primary: '#EF4444',      // Red - Energy & Marketing
    secondary: '#DC2626',
    accent: '#F87171',
    light: '#FEE2E2',
    gradient: 'from-red-500 to-rose-600'
  },
  'prosthetic-services': {
    primary: '#4F46E5',      // Indigo - Technology & Innovation
    secondary: '#4338CA',
    accent: '#818CF8',
    light: '#E0E7FF',
    gradient: 'from-indigo-600 to-blue-700'
  },
  'enterprises': {
    primary: '#7C3AED',      // Purple - Business & Enterprise
    secondary: '#6D28D9',
    accent: '#A78BFA',
    light: '#EDE9FE',
    gradient: 'from-purple-600 to-violet-800'
  },
  'sukoon-center': {
    primary: '#14B8A6',      // Teal - Peace & Mental Health
    secondary: '#0D9488',
    accent: '#5EEAD4',
    light: '#CCFBF1',
    gradient: 'from-teal-600 to-emerald-600'
  }
} as const;

export const DEPARTMENTS: Department[] = [
  {
    slug: 'institute-health-sciences',
    name: 'Khan Hub Institute of Health & Sciences',
    shortName: 'IHS',
    icon: '🏥',
    image: '/images/institute-health-sciences.webp',
    category: 'social',
    tagline: 'Excellence in Medical Education & Healthcare Training',
    description: 'A premier institution dedicated to producing skilled healthcare professionals through state-of-the-art education and practical training.',
    services: ['Medical Education', 'Paramedical Training', 'Nursing Programs', 'Pharmacy Technician'],
    stats: [
      { value: '3+', label: 'Departments' },
      { value: '10+', label: 'Specialized Courses' },
      { value: '100%', label: 'Practical Training' }
    ],
    isActive: true,
    colorHex: '#2563EB',
    programs: ['Pharmacy Technician', 'LHV', 'CNA', 'OTT', 'MLT'],
    facilities: ['Modern Labs', 'Hostel Facility', 'Digital Library', 'Clinical Training'],
    contactPhone: '+92-300-6395220',
    contactEmail: 'info@ihs.khanhub.pk',
    features: [
      'Less Fee Structure',
      'Better Educational Standards',
      'Experienced Teachers & Faculty',
      'Best Equipped Laboratories',
      'Hostel Facility Available',
      'Scholarship Opportunities'
    ],
    subDepartments: [
      {
        title: 'Department of Pharmacy',
        courses: [
          {
            name: 'Pharmacy Technician (Category-B)',
            duration: '2 Years',
            eligibility: 'Matric (Science) - No minimum division required'
          }
        ]
      },
      {
        title: 'FSc Paramedical Courses',
        courses: [
          {
            name: 'Operation Theater Technology (OTT)',
            duration: '2 Years',
            eligibility: 'Matric (Science) or above - Min 45% marks'
          },
          {
            name: 'Medical Lab Technology (MLT)',
            duration: '2 Years',
            eligibility: 'Matric (Science) or above - Min 45% marks'
          },
          {
            name: 'Radiography & Imaging Technology (RIT)',
            duration: '2 Years',
            eligibility: 'Matric (Science) or above - Min 45% marks'
          },
          {
            name: 'Dispenser',
            duration: '2 Years',
            eligibility: 'Matric (Science) or above - Min 45% marks'
          },
          {
            name: 'Dialysis Technician',
            duration: '2 Years',
            eligibility: 'Matric (Science) or above - Min 45% marks'
          }
        ]
      },
      {
        title: 'Department of Nursing',
        courses: [
          {
            name: 'Lady Health Visitor (LHV)',
            duration: '2 Years',
            eligibility: 'Matric (Science) or above - Min 45% marks'
          },
          {
            name: 'Community Midwife (CMW)',
            duration: '2 Years',
            eligibility: 'Matric (Science) or above - Min 45% marks'
          },
          {
            name: 'Certified Nursing Assistant (CNA)',
            duration: '2 Years',
            eligibility: 'Matric (Science) or above - Min 45% marks'
          }
        ]
      }
    ],
    gallery: [
      {
        title: 'Campus Life',
        images: [
          { url: '/images/ihs/lab-1.webp', alt: 'Advanced Computer Lab' },
          { url: '/images/ihs/lab-2.webp', alt: 'Medical Laboratory' },
          { url: '/images/ihs/classroom.webp', alt: 'Modern Classroom' },
          { url: '/images/ihs/building.webp', alt: 'IHS Campus Building' }
        ]
      }
    ]
  },
  {
    slug: 'education',
    name: 'Khan Hub Education Department',
    shortName: 'Education',
    icon: '📚',
    image: '/images/education.webp',
    category: 'social',
    tagline: 'Quality education for every child',
    description: 'Managing schools, colleges, and educational programs to ensure quality education for all.',
    services: ['Public Schools', 'Scholarships', 'Teacher Training', 'Curriculum Development'],
    stats: [
      { value: '50,000+', label: 'Schools' },
      { value: '15M+', label: 'Students' }
    ],
    isActive: true,
    colorHex: '#059669',
    programs: [
      {
        slug: 'primary-education',
        name: 'Primary Education',
        description: 'Foundational learning for children aged 5-11, focusing on core literacy, numeracy, and social skills.',
        image: '/images/education/primary.webp',
        features: ['Focused Curriculum', 'Holistic Development', 'Expert Educators'],
        details: [
          { label: 'Ages', value: '5 - 11 Years' },
          { label: 'Focus', value: 'Foundational Literacy' }
        ]
      },
      {
        slug: 'secondary-education',
        name: 'Secondary Education',
        description: 'Comprehensive education for adolescents, preparing them for higher studies or vocational paths.',
        image: '/images/education/secondary.webp',
        features: ['Subject Specialization', 'Career Guidance', 'Modern Labs'],
        details: [
          { label: 'Ages', value: '11 - 16 Years' },
          { label: 'Level', value: 'Middle & High School' }
        ]
      },
      {
        slug: 'higher-secondary',
        name: 'Higher Secondary',
        description: 'Advanced schooling focused on specialized streams like Pre-Medical, Pre-Engineering, and ICS.',
        image: '/images/education/higher-secondary.webp',
        features: ['Stream Selection', 'Board Exam Prep', 'Practical Training'],
        details: [
          { label: 'Duration', value: '2 Years' },
          { label: 'Streams', value: 'Medical, Engineering, IT' }
        ]
      },
      {
        slug: 'special-education',
        name: 'Special Education',
        description: 'Tailored educational programs for children with diverse learning needs and abilities.',
        image: '/images/education/special.webp',
        features: ['Individualized Plans', 'Therapeutic Support', 'Inclusive Environment'],
        details: [
          { label: 'Focus', value: 'Inclusivity' },
          { label: 'Support', value: 'Specialized Staff' }
        ]
      },
      {
        slug: 'adult-literacy',
        name: 'Adult Literacy',
        description: 'Empowering adults with essential reading, writing, and life skills for better opportunities.',
        image: '/images/education/adult.webp',
        features: ['Flexible Timing', 'Functional Skills', 'Community Based'],
        details: [
          { label: 'Focus', value: 'Lifelong Learning' },
          { label: 'Eligibility', value: 'Ages 18+' }
        ]
      }
    ],
    facilities: ['District Offices', 'Training Centers', 'Assessment Centers', 'Resource Libraries'],
    contactPhone: '+92-300-2345678',
    contactEmail: 'info@education.khanhub.pk'
  },
  {
    slug: 'medical-center',
    name: 'Khan Hub Medical Center',
    shortName: 'Medical Center',
    icon: '🏥',
    image: '/images/medical-center.webp',
    category: 'social',
    tagline: 'Comprehensive healthcare services',
    description: 'State-of-the-art medical facilities providing comprehensive healthcare services to communities nationwide. Our medical center is equipped with modern technology and staffed by experienced healthcare professionals dedicated to patient care.',
    services: ['Emergency Care', 'Specialized Treatment', 'Diagnostics', 'Patient Care'],
    stats: [
      { value: '1,000+', label: 'Beds' },
      { value: '24/7', label: 'Emergency' }
    ],
    isActive: true,
    colorHex: '#DC2626',
    programs: [
      {
        slug: 'emergency-services',
        name: 'Emergency Services',
        description: '24/7 emergency care with state-of-the-art trauma facilities and expert medical staff.',
        image: '/images/medical/emergency.webp',
        features: ['24/7 Availability', 'Trauma Care', 'Rapid Response'],
        details: [
          { label: 'Service', value: 'Emergency' },
          { label: 'Response', value: 'Immediate' }
        ]
      },
      {
        slug: 'general-medicine',
        name: 'General Medicine',
        description: 'Comprehensive evaluation and treatment of common illnesses and chronic conditions.',
        image: '/images/medical/medicine.webp',
        features: ['Full Checkup', 'Chronic Care', 'Consultations'],
        details: [
          { label: 'Type', value: 'Outpatient' },
          { label: 'Care', value: 'Primary' }
        ]
      },
      {
        slug: 'cardiology',
        name: 'Cardiology',
        description: 'Specialized heart care including diagnostics, treatment, and preventive cardiology.',
        image: '/images/medical/cardiology.webp',
        features: ['ECG/Echo', 'TMT Tests', 'Heart Care'],
        details: [
          { label: 'Specialty', value: 'Heart' },
          { label: 'Tech', value: 'Digital Diagnostics' }
        ]
      },
      {
        slug: 'pediatrics',
        name: 'Pediatrics',
        description: 'Dedicated healthcare for infants, children, and adolescents with a child-friendly environment.',
        image: '/images/medical/pediatrics.webp',
        features: ['Child Wellness', 'Vaccinations', 'Specialized Care'],
        details: [
          { label: 'Focus', value: 'Child Health' },
          { label: 'Ages', value: '0 - 18' }
        ]
      }
    ],
    facilities: [
      '24/7 Emergency Department',
      'Modern ICU Units',
      'Advanced Operating Theaters',
      'CT Scan & MRI',
      'Digital X-Ray',
      'Fully Equipped Laboratory',
      'Pharmacy',
      'Blood Bank',
      'Ambulance Service',
      'Patient Wards'
    ],
    contactPhone: '+92-300-MEDICAL-1',
    contactEmail: 'emergency@medicalcenter.khanhub.pk'
  },
  {
    slug: 'transport',
    name: 'Khan Hub Transport Department',
    shortName: 'Transport',
    icon: '🚗',
    image: '/images/transport.webp',
    category: 'infrastructure',
    tagline: 'Safe and efficient transportation',
    description: 'Regulating transportation, issuing licenses, and managing public transport systems.',
    services: ['Driving Licenses', 'Vehicle Registration', 'Public Transport', 'Traffic Management'],
    stats: [
      { value: '500+', label: 'Routes' },
      { value: '5M+', label: 'Licenses' }
    ],
    isActive: true,
    colorHex: '#F59E0B',
    programs: [
      {
        slug: 'driving-license',
        name: 'Driving License',
        description: 'Simplified process for issuing and renewing driving licenses for all vehicle categories.',
        image: '/images/transport/license.webp',
        features: ['Quick Processing', 'Digital Tracking', 'Renewals'],
        details: [
          { label: 'Level', value: 'All Categories' },
          { label: 'Process', value: 'Digital/Manual' }
        ]
      },
      {
        slug: 'vehicle-registration',
        name: 'Vehicle Registration',
        description: 'New vehicle registration and ownership transfer services with transparent procedures.',
        image: '/images/transport/registration.webp',
        features: ['New Reg', 'Transfer', 'Number Plates'],
        details: [
          { label: 'Efficiency', value: 'Same Day' },
          { label: 'Security', value: 'Verified' }
        ]
      },
      {
        slug: 'route-permits',
        name: 'Route Permits',
        description: 'Issuance and management of route permits for commercial and public transport vehicles.',
        image: '/images/transport/permits.webp',
        features: ['Route Allotment', 'Permit Renewal', 'Safety Check'],
        details: [
          { label: 'Sector', value: 'Commercial' },
          { label: 'Validity', value: 'Annual' }
        ]
      }
    ],
    facilities: ['License Centers', 'Registration Offices', 'Testing Tracks', 'Customer Service Centers'],
    contactPhone: '+92-300-3456789',
    contactEmail: 'info@transport.khanhub.pk'
  },
  {
    slug: 'surgical-services',
    name: 'Khan Hub Surgical Services',
    shortName: 'Surgical Services',
    icon: '⚕️',
    image: '/images/surgical-services.webp',
    category: 'social',
    tagline: 'Expert surgical care',
    description: 'Advanced surgical facilities with expert medical teams providing specialized surgical services.',
    services: ['General Surgery', 'Specialized Procedures', 'Post-Op Care', 'Emergency Surgery'],
    stats: [
      { value: '10K+', label: 'Surgeries' },
      { value: '95%', label: 'Success Rate' }
    ],
    isActive: true,
    colorHex: '#7C3AED',
    programs: ['General Surgery', 'Orthopedic Surgery', 'Cardiac Surgery', 'Neurosurgery', 'Laparoscopic Surgery'],
    facilities: ['Modern Operating Rooms', 'Recovery Wards', 'ICU', 'Surgical Equipment', 'Sterilization Units'],
    contactPhone: '+92-300-4567890',
    contactEmail: 'info@surgical.khanhub.pk'
  },
  {
    slug: 'surgical-repair',
    name: 'Khan Hub Surgical Repair Center',
    shortName: 'Surgical Repair',
    icon: '🔧',
    image: '/images/surgical-repair.webp',
    category: 'social',
    tagline: 'Reconstructive and repair surgery',
    description: 'Specialized center for reconstructive and repair surgical procedures with modern facilities.',
    services: ['Reconstructive Surgery', 'Plastic Surgery', 'Burn Treatment', 'Trauma Care'],
    stats: [
      { value: '5K+', label: 'Procedures' },
      { value: '24/7', label: 'Available' }
    ],
    isActive: true,
    colorHex: '#DB2777',
    programs: ['Reconstructive Surgery', 'Cosmetic Surgery', 'Burn Unit', 'Trauma Surgery', 'Microsurgery'],
    facilities: ['Specialized Operating Theaters', 'Burn Unit', 'Recovery Rooms', 'Physiotherapy', 'Counseling Center'],
    contactPhone: '+92-300-5678901',
    contactEmail: 'info@surgicalrepair.khanhub.pk'
  },
  {
    slug: 'social-welfare',
    name: 'Khan Hub Social Welfare',
    shortName: 'Social Welfare',
    icon: '🤝',
    image: '/images/welfare-organization.webp',
    category: 'social',
    tagline: 'Supporting communities in need',
    description: 'Supporting vulnerable communities through welfare programs and financial assistance.',
    services: ['Pension Programs', 'Disability Support', 'Child Protection', 'Women Empowerment'],
    stats: [
      { value: '2M+', label: 'Beneficiaries' },
      { value: '100+', label: 'Centers' }
    ],
    isActive: true,
    colorHex: '#0D9488',
    programs: [
      {
        slug: 'pension-programs',
        name: 'Pension Programs',
        description: 'Streamlined financial support systems for senior citizens and retired workers to ensure dignity in old age.',
        image: '/images/welfare/pension.webp',
        features: ['Digital Payments', 'Senior Support', 'Easy Enrollment'],
        details: [
          { label: 'Category', value: 'Social Support' },
          { label: 'Frequency', value: 'Monthly' }
        ]
      },
      {
        slug: 'disability-support',
        name: 'Disability Support',
        description: 'Comprehensive aid including financial assistance, assistive devices, and vocational training for people with disabilities.',
        image: '/images/welfare/disability.webp',
        features: ['Assistive Devices', 'Job Coaching', 'Grants'],
        details: [
          { label: 'Service', value: 'Rehabilitation' },
          { label: 'Support', value: 'End-to-End' }
        ]
      },
      {
        slug: 'women-empowerment',
        name: 'Women Empowerment',
        description: 'Skill-building workshops, micro-finance opportunities, and legal support to help women achieve financial independence.',
        image: '/images/welfare/empowerment.webp',
        features: ['Skill Training', 'Micro-Loans', 'Legal Aid'],
        details: [
          { label: 'Focus', value: 'Financial Independence' },
          { label: 'Network', value: 'Female Experts' }
        ]
      },
      {
        slug: 'child-protection',
        name: 'Child Protection',
        description: 'Safe havens and education initiatives for vulnerable children, ensuring their safety and future growth.',
        image: '/images/welfare/child.webp',
        features: ['Safe Shelters', 'Education', 'Health Care'],
        details: [
          { label: 'Ages', value: '0 - 18 Years' },
          { label: 'Support', value: '24/7 Protection' }
        ]
      }
    ],
    facilities: ['Welfare Centers', 'Community Halls', 'Support Offices', 'Distribution Points'],
    contactPhone: '+92-300-6789012',
    contactEmail: 'info@welfare.khanhub.pk'
  },
  {
    slug: 'job-placement',
    name: 'Khan Hub Job Placement Services',
    shortName: 'Job Placement',
    icon: '💼',
    image: '/images/job.webp',
    category: 'economy',
    tagline: 'Connecting talent with opportunity',
    description: 'Facilitating employment opportunities and career development for job seekers across all sectors.',
    services: ['Job Listings', 'Career Counseling', 'Skill Training', 'Placement Support'],
    stats: [
      { value: '50K+', label: 'Jobs/Year' },
      { value: '85%', label: 'Success Rate' }
    ],
    isActive: true,
    colorHex: '#0EA5E9',
    programs: [
      {
        slug: 'job-portal',
        name: 'Job Portal',
        description: 'A modern platform connecting job seekers with top employers across Pakistan with real-time tracking.',
        image: '/images/jobs/portal.webp',
        features: ['Real-time Tracking', 'Mobile Friendly', 'Verified Jobs'],
        details: [
          { label: 'Service', value: 'Online Portal' },
          { label: 'Coverage', value: 'National' }
        ]
      },
      {
        slug: 'career-counseling',
        name: 'Career Counseling',
        description: 'Personalized sessions with industry experts to help you identify your strengths and map your career path.',
        image: '/images/jobs/counseling.webp',
        features: ['Expert Guidance', 'Skill Assessment', 'Roadmaps'],
        details: [
          { label: 'Type', value: 'One-on-One' },
          { label: 'Format', value: 'Online/In-person' }
        ]
      },
      {
        slug: 'resume-building',
        name: 'Resume Building',
        description: 'Professional ATS-friendly resume and cover letter writing services to make you stand out.',
        image: '/images/jobs/resume.webp',
        features: ['ATS Optimization', 'Visual Design', 'Cover Letters'],
        details: [
          { label: 'Goal', value: 'Increase Interviews' },
          { label: 'Style', value: 'Modern & Pro' }
        ]
      },
      {
        slug: 'interview-prep',
        name: 'Interview Prep',
        description: 'Mock interviews and feedback sessions to help you ace your next big opportunity with confidence.',
        image: '/images/jobs/interview.webp',
        features: ['Mock Interviews', 'Expert Feedback', 'Body Language'],
        details: [
          { label: 'Support', value: 'High Success' },
          { label: 'Benefit', value: 'Boost Confidence' }
        ]
      }
    ],
    facilities: ['Career Centers', 'Computer Labs', 'Interview Rooms', 'Resource Libraries'],
    contactPhone: '+92-300-7890123',
    contactEmail: 'jobs@khanhub.pk'
  },
  {
    slug: 'skill-development',
    name: 'Khan Hub Skill Development',
    shortName: 'Skill Development',
    icon: '🎓',
    image: '/images/skill.webp',
    category: 'economy',
    tagline: 'Building skills for tomorrow',
    description: 'Vocational training and skill development programs to enhance employability and entrepreneurship.',
    services: ['Technical Training', 'Vocational Courses', 'Certification Programs', 'Apprenticeships'],
    stats: [
      { value: '100K+', label: 'Trained' },
      { value: '200+', label: 'Courses' }
    ],
    isActive: true,
    colorHex: '#EA580C',
    programs: ['IT Training', 'Welding & Fabrication', 'Electrical Work', 'Plumbing', 'Beautician Courses', 'Tailoring'],
    facilities: ['Training Workshops', 'Computer Labs', 'Practice Areas', 'Certification Centers'],
    contactPhone: '+92-300-8901234',
    contactEmail: 'skills@khanhub.pk'
  },
  {
    slug: 'residential-services',
    name: 'Khan Hub Residential Services',
    shortName: 'Residential',
    icon: '🏘️',
    image: '/images/residential.webp',
    category: 'infrastructure',
    tagline: 'Quality housing solutions',
    description: 'Developing housing schemes and providing affordable residential solutions for citizens.',
    services: ['Housing Schemes', 'Building Approvals', 'Urban Planning', 'Low-Cost Housing'],
    stats: [
      { value: '50+', label: 'Projects' },
      { value: '200K+', label: 'Units' }
    ],
    isActive: true,
    colorHex: '#7C3AED',
    programs: ['Affordable Housing', 'Urban Development', 'Building Permits', 'Infrastructure Development'],
    facilities: ['Planning Offices', 'Approval Centers', 'Display Centers', 'Customer Service'],
    contactPhone: '+92-300-9012345',
    contactEmail: 'housing@khanhub.pk'
  },
  {
    slug: 'rehabilitation',
    name: 'Khan Hub Rehabilitation Center',
    shortName: 'Rehabilitation',
    icon: '♿',
    image: '/images/rehab.webp',
    category: 'social',
    tagline: 'Recovery and rehabilitation support',
    description: 'Comprehensive rehabilitation services for physical, mental, and social recovery programs.',
    services: ['Physical Therapy', 'Mental Health', 'Addiction Treatment', 'Counseling'],
    stats: [
      { value: '10K+', label: 'Patients' },
      { value: '90%', label: 'Recovery' }
    ],
    isActive: true,
    colorHex: '#0891B2',
    programs: [
      {
        slug: 'physical-rehabilitation',
        name: 'Physical Therapy',
        description: 'Advanced physiotherapy and exercise programs to help patients recover mobility after injury or surgery.',
        image: '/images/rehab/physical.webp',
        features: ['Mobility Recovery', 'Pain Management', 'Expert Therapists'],
        details: [
          { label: 'Type', value: 'Physical' },
          { label: 'Care', value: 'Individualized' }
        ]
      },
      {
        slug: 'drug-rehab',
        name: 'Drug Rehabilitation',
        description: 'Holistic recovery programs combining medical detox with psychological counseling and community support.',
        image: '/images/rehab/drug.webp',
        features: ['Medical Detox', 'Counseling', 'Aftercare'],
        details: [
          { label: 'Program', value: 'Inpatient' },
          { label: 'Support', value: '24/7' }
        ]
      },
      {
        slug: 'psychological-counseling',
        name: 'Psychological Counseling',
        description: 'Expert-led sessions focusing on trauma recovery, depression, and mental resilience.',
        image: '/images/rehab/counseling.webp',
        features: ['Trauma Recovery', 'Mental Resilience', 'Safe Space'],
        details: [
          { label: 'Focus', value: 'Mental Health' },
          { label: 'Format', value: 'One-on-One' }
        ]
      },
      {
        slug: 'vocational-rehab',
        name: 'Vocational Rehab',
        description: 'Helping recovering patients learn new skills and find meaningful employment during their recovery journey.',
        image: '/images/rehab/vocational.webp',
        features: ['Skill Building', 'Job Placement', 'Workshops'],
        details: [
          { label: 'Goal', value: 'Independence' },
          { label: 'Benefit', value: 'Career Skills' }
        ]
      }
    ],
    facilities: ['Therapy Rooms', 'Counseling Centers', 'Residential Units', 'Exercise Areas', 'Group Therapy Halls'],
    contactPhone: '+92-300-0123456',
    contactEmail: 'rehab@khanhub.pk'
  },
  {
    slug: 'tourism',
    name: 'Khan Hub Travel & Tourism',
    shortName: 'Tourism',
    icon: '🏔️',
    image: '/images/travel-and-tour.webp',
    category: 'economy',
    tagline: 'Explore the beauty of Pakistan',
    description: 'Promoting tourism, heritage sites, and cultural attractions across Pakistan.',
    services: ['Tourist Info', 'Heritage Sites', 'Travel Permits', 'Hospitality Training'],
    stats: [
      { value: '100+', label: 'Sites' },
      { value: '2M+', label: 'Visitors' }
    ],
    isActive: true,
    colorHex: '#16A34A',
    programs: ['Tourist Guides', 'Heritage Conservation', 'Tourism Promotion', 'Hospitality Training'],
    facilities: ['Information Centers', 'Tourist Facilitation Centers', 'Heritage Museums', 'Rest Areas'],
    contactPhone: '+92-300-1234560',
    contactEmail: 'tourism@khanhub.pk'
  },
  {
    slug: 'marketing',
    name: 'Khan Hub Marketing & Promotion',
    shortName: 'Marketing',
    icon: '📢',
    image: '/images/marketing.webp',
    category: 'economy',
    tagline: 'Promoting growth and opportunities',
    description: 'Strategic marketing and promotional services to support business growth and economic development.',
    services: ['Business Promotion', 'Trade Support', 'Export Facilitation', 'Market Research'],
    stats: [
      { value: '500+', label: 'Campaigns' },
      { value: '1K+', label: 'Businesses' }
    ],
    isActive: true,
    colorHex: '#EF4444',
    programs: ['Digital Marketing', 'Trade Fairs', 'Export Support', 'Brand Development', 'Market Analysis'],
    facilities: ['Marketing Centers', 'Exhibition Halls', 'Conference Rooms', 'Media Studios'],
    contactPhone: '+92-300-2345601',
    contactEmail: 'marketing@khanhub.pk'
  },
  {
    slug: 'prosthetic-services',
    name: 'Khan Hub Prosthetic Services',
    shortName: 'Prosthetics',
    icon: '🦾',
    image: '/images/prosthetic.webp',
    category: 'social',
    tagline: 'Restoring mobility and independence',
    description: 'Advanced prosthetic and orthotic services to help individuals regain mobility and independence.',
    services: ['Prosthetic Limbs', 'Orthotic Devices', 'Fitting Services', 'Rehabilitation'],
    stats: [
      { value: '5K+', label: 'Devices' },
      { value: '95%', label: 'Satisfaction' }
    ],
    isActive: true,
    colorHex: '#4F46E5',
    programs: ['Artificial Limbs', 'Orthotic Braces', 'Custom Fitting', 'Physiotherapy', 'Follow-up Care'],
    facilities: ['Manufacturing Workshop', 'Fitting Rooms', 'Rehabilitation Area', 'Assessment Center'],
    contactPhone: '+92-300-3456012',
    contactEmail: 'prosthetic@khanhub.pk'
  },
  {
    slug: 'enterprises',
    name: 'Enterprise Development',
    shortName: 'Enterprises',
    icon: '🏢',
    image: '/images/enterprises.webp',
    category: 'economy',
    tagline: 'Empowering entrepreneurs',
    description: 'Supporting enterprise development through business incubation, funding, and mentorship programs.',
    services: ['Business Incubation', 'Funding Support', 'Mentorship', 'Networking'],
    stats: [
      { value: '2K+', label: 'Startups' },
      { value: '80%', label: 'Success Rate' }
    ],
    isActive: true,
    colorHex: '#7C3AED',
    programs: [
      {
        slug: 'startup-incubation',
        name: 'Startup Incubation',
        description: 'Nurturing early-stage startups with office space, mentorship, and access to a massive network of investors.',
        image: '/images/enterprises/incubation.webp',
        features: ['Office Space', 'Mentorship', 'Investor Network'],
        details: [
          { label: 'Service', value: 'Incubation' },
          { label: 'Access', value: 'Full Network' }
        ]
      },
      {
        slug: 'business-loans',
        name: 'Business Loans',
        description: 'Easy access to low-interest capital for small and medium enterprises to scale their operations.',
        image: '/images/enterprises/loans.webp',
        features: ['Low Interest', 'Quick Approval', 'Scalable Capital'],
        details: [
          { label: 'Type', value: 'Financial Aid' },
          { label: 'Limit', value: 'Based on Need' }
        ]
      },
      {
        slug: 'mentorship',
        name: 'Mentorship Programs',
        description: 'Connecting aspiring entrepreneurs with seasoned business leaders for strategic guidance and growth.',
        image: '/images/enterprises/mentorship.webp',
        features: ['Strategic Guidance', 'Business Strategy', 'Networking'],
        details: [
          { label: 'Format', value: 'Mentorship' },
          { label: 'Experts', value: 'Industry Leaders' }
        ]
      },
      {
        slug: 'digital-transformation',
        name: 'Digital Transformation',
        description: 'Helping traditional businesses adopt modern technologies and reach global markets through e-commerce.',
        image: '/images/enterprises/digital.webp',
        features: ['E-commerce', 'Tech Adoption', 'Global Reach'],
        details: [
          { label: 'Goal', value: 'Modernization' },
          { label: 'Approach', value: 'Tech-First' }
        ]
      }
    ],
    facilities: ['Incubation Centers', 'Co-working Spaces', 'Meeting Rooms', 'Resource Centers'],
    contactPhone: '+92-300-4560123',
    contactEmail: 'enterprise@khanhub.pk'
  },
  {
    slug: 'sukoon-center',
    name: 'Sukoon Mental Health',
    shortName: 'Sukoon',
    icon: '🧠',
    image: '/images/sukoon.webp',
    category: 'social',
    tagline: 'Peace of mind, path to wellness',
    description: 'Comprehensive mental health services providing counseling, therapy, and psychiatric care.',
    services: ['Counseling', 'Therapy', 'Psychiatric Care', 'Support Groups'],
    stats: [
      { value: '20K+', label: 'Patients' },
      { value: '24/7', label: 'Helpline' }
    ],
    isActive: true,
    colorHex: '#14B8A6',
    programs: [
      {
        slug: 'individual-therapy',
        name: 'Individual Therapy',
        description: 'Private and confidential one-on-one sessions with licensed therapists to address personal mental health challenges.',
        image: '/images/sukoon/individual.webp',
        features: ['Confidential', 'Expert Therapists', 'Personalized'],
        details: [
          { label: 'Format', value: 'One-on-One' },
          { label: 'Privacy', value: '100%' }
        ]
      },
      {
        slug: 'group-therapy',
        name: 'Group Support',
        description: 'Safe community spaces where individuals can share experiences and grow together under professional guidance.',
        image: '/images/sukoon/group.webp',
        features: ['Community Space', 'Shared Growth', 'Safe Environment'],
        details: [
          { label: 'Type', value: 'Group Session' },
          { label: 'Support', value: 'Peer-to-Peer' }
        ]
      },
      {
        slug: 'family-counseling',
        name: 'Family Counseling',
        description: "Helping families navigate conflicts, improve communication, and support each other's mental well-being.",
        image: '/images/sukoon/family.webp',
        features: ['Conflict Resolution', 'Better Communication', 'Supportive'],
        details: [
          { label: 'Focus', value: 'Family Wellness' },
          { label: 'Outcome', value: 'Better Relatioships' }
        ]
      },
      {
        slug: 'crisis-helpline',
        name: 'Crisis Helpline',
        description: '24/7 immediate support for individuals experiencing mental health emergencies or emotional distress.',
        image: '/images/sukoon/helpline.webp',
        features: ['24/7 Support', 'Immediate Crisis Aid', 'Compassionate'],
        details: [
          { label: 'Service', value: 'Helpline' },
          { label: 'Availability', value: 'Always Open' }
        ]
      }
    ],
    facilities: ['Counseling Rooms', 'Group Therapy Halls', 'Crisis Center', '24/7 Helpline', 'Psychiatric Ward'],
    contactPhone: '+92-300-SUKOON-1',
    contactEmail: 'help@sukoon.khanhub.pk'
  }
];

// ── HELPER FUNCTIONS ──
export function getDepartmentBySlug(slug: string): Department | undefined {
  return DEPARTMENTS.find(dept => dept.slug === slug);
}

export function getDepartmentTheme(slug: string) {
  return DEPARTMENT_THEMES[slug as keyof typeof DEPARTMENT_THEMES] || DEPARTMENT_THEMES['medical-center'];
}

export function getDepartmentsByCategory(category: string): Department[] {
  if (category === 'all') return DEPARTMENTS;
  return DEPARTMENTS.filter(dept => dept.category === category);
}

// For dynamic Tailwind class generation
export function getDepartmentTailwindClasses(slug: string) {
  const theme = getDepartmentTheme(slug);
  return {
    bgPrimary: `bg-[${theme.primary}]`,
    textPrimary: `text-[${theme.primary}]`,
    borderPrimary: `border-[${theme.primary}]`,
    gradient: theme.gradient,
    bgLight: `bg-[${theme.light}]`,
    bgAccent: `bg-[${theme.accent}]`
  };
}