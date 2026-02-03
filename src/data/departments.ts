// src/data/departments.ts - UPDATED WITH HELPER FUNCTION

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

export const DEPARTMENTS: Department[] = [
  {
    slug: 'institute-health-sciences',
    name: 'Institute of Health & Sciences',
    shortName: 'IHS',
    icon: '🏥',
    image: '/images/institute-health-sciences.webp',
    category: 'social',
    tagline: 'Advanced healthcare education and research',
    description: 'Leading medical institution providing comprehensive healthcare education, research, and training programs.',
    services: ['Medical Education', 'Research Programs', 'Clinical Training', 'Health Sciences'],
    stats: [
      { value: '5,000+', label: 'Students' },
      { value: '24/7', label: 'Facilities' }
    ],
    isActive: true,
    // Additional fields for individual pages
    colorHex: '#3B82F6',
    programs: ['MBBS', 'BDS', 'Nursing', 'Allied Health Sciences', 'Postgraduate Programs'],
    facilities: ['Modern Lecture Halls', 'Research Labs', 'Medical Library', 'Simulation Center', 'Student Hostels'],
    contactPhone: '+92-300-1234567',
    contactEmail: 'info@ihs.khanhub.pk'
  },
  {
    slug: 'education',
    name: 'Education Department',
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
    colorHex: '#10B981',
    programs: ['Primary Education', 'Secondary Education', 'Higher Secondary', 'Special Education', 'Adult Literacy'],
    facilities: ['District Offices', 'Training Centers', 'Assessment Centers', 'Resource Libraries'],
    contactPhone: '+92-300-2345678',
    contactEmail: 'info@education.khanhub.pk'
  },
  {
    slug: 'medical-center',
    name: 'Medical Center',
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
    colorHex: '#EF4444',
    programs: [
      'Emergency Services',
      'General Medicine',
      'Surgery Department',
      'Pediatrics',
      'Gynecology & Obstetrics',
      'Cardiology',
      'Neurology',
      'Oncology',
      'Radiology',
      'Laboratory Services'
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
    name: 'Transport Department',
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
    programs: ['License Issuance', 'Vehicle Registration', 'Route Permits', 'Traffic Safety'],
    facilities: ['License Centers', 'Registration Offices', 'Testing Tracks', 'Customer Service Centers'],
    contactPhone: '+92-300-3456789',
    contactEmail: 'info@transport.khanhub.pk'
  },
  {
    slug: 'surgical-services',
    name: 'Surgical Services',
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
    colorHex: '#8B5CF6',
    programs: ['General Surgery', 'Orthopedic Surgery', 'Cardiac Surgery', 'Neurosurgery', 'Laparoscopic Surgery'],
    facilities: ['Modern Operating Rooms', 'Recovery Wards', 'ICU', 'Surgical Equipment', 'Sterilization Units'],
    contactPhone: '+92-300-4567890',
    contactEmail: 'info@surgical.khanhub.pk'
  },
  {
    slug: 'surgical-repair',
    name: 'Surgical Repair Center',
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
    colorHex: '#EC4899',
    programs: ['Reconstructive Surgery', 'Cosmetic Surgery', 'Burn Unit', 'Trauma Surgery', 'Microsurgery'],
    facilities: ['Specialized Operating Theaters', 'Burn Unit', 'Recovery Rooms', 'Physiotherapy', 'Counseling Center'],
    contactPhone: '+92-300-5678901',
    contactEmail: 'info@surgicalrepair.khanhub.pk'
  },
  {
    slug: 'social-welfare',
    name: 'Social Welfare',
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
    colorHex: '#14B8A6',
    programs: ['Old Age Pension', 'Disability Allowance', 'Widow Support', 'Orphan Care', 'Emergency Relief'],
    facilities: ['Welfare Centers', 'Community Halls', 'Support Offices', 'Distribution Points'],
    contactPhone: '+92-300-6789012',
    contactEmail: 'info@welfare.khanhub.pk'
  },
  {
    slug: 'job-placement',
    name: 'Job Placement Services',
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
    programs: ['Job Portal', 'Career Counseling', 'Resume Building', 'Interview Prep', 'Job Fairs'],
    facilities: ['Career Centers', 'Computer Labs', 'Interview Rooms', 'Resource Libraries'],
    contactPhone: '+92-300-7890123',
    contactEmail: 'jobs@khanhub.pk'
  },
  {
    slug: 'skill-development',
    name: 'Skill Development',
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
    colorHex: '#F59E0B',
    programs: ['IT Training', 'Welding & Fabrication', 'Electrical Work', 'Plumbing', 'Beautician Courses', 'Tailoring'],
    facilities: ['Training Workshops', 'Computer Labs', 'Practice Areas', 'Certification Centers'],
    contactPhone: '+92-300-8901234',
    contactEmail: 'skills@khanhub.pk'
  },
  {
    slug: 'residential-services',
    name: 'Residential Services',
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
    colorHex: '#8B5CF6',
    programs: ['Affordable Housing', 'Urban Development', 'Building Permits', 'Infrastructure Development'],
    facilities: ['Planning Offices', 'Approval Centers', 'Display Centers', 'Customer Service'],
    contactPhone: '+92-300-9012345',
    contactEmail: 'housing@khanhub.pk'
  },
  {
    slug: 'rehabilitation',
    name: 'Rehabilitation Center',
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
    colorHex: '#06B6D4',
    programs: ['Physical Rehabilitation', 'Drug Rehabilitation', 'Alcohol Treatment', 'Psychological Counseling'],
    facilities: ['Therapy Rooms', 'Counseling Centers', 'Residential Units', 'Exercise Areas', 'Group Therapy Halls'],
    contactPhone: '+92-300-0123456',
    contactEmail: 'rehab@khanhub.pk'
  },
  {
    slug: 'tourism',
    name: 'Travel & Tourism',
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
    colorHex: '#10B981',
    programs: ['Tourist Guides', 'Heritage Conservation', 'Tourism Promotion', 'Hospitality Training'],
    facilities: ['Information Centers', 'Tourist Facilitation Centers', 'Heritage Museums', 'Rest Areas'],
    contactPhone: '+92-300-1234560',
    contactEmail: 'tourism@khanhub.pk'
  },
  {
    slug: 'marketing',
    name: 'Marketing & Promotion',
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
    name: 'Prosthetic Services',
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
    colorHex: '#6366F1',
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
    colorHex: '#8B5CF6',
    programs: ['Startup Incubation', 'Business Loans', 'Mentorship Programs', 'Networking Events', 'Business Training'],
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
    programs: ['Individual Therapy', 'Group Therapy', 'Family Counseling', 'Crisis Intervention', 'Psychiatric Treatment'],
    facilities: ['Counseling Rooms', 'Group Therapy Halls', 'Crisis Center', '24/7 Helpline', 'Psychiatric Ward'],
    contactPhone: '+92-300-SUKOON-1',
    contactEmail: 'help@sukoon.khanhub.pk'
  }
];

// ── HELPER FUNCTION ── (This was missing!)
export function getDepartmentBySlug(slug: string): Department | undefined {
  return DEPARTMENTS.find(dept => dept.slug === slug);
}