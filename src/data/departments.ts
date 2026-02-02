// src/data/departments.ts - WITH IMAGES

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
    isActive: true
  },
  {
    slug: 'education',
    name: 'Education Department',
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
    isActive: true
  },
  {
    slug: 'medical-center',
    name: 'Medical Center',
    icon: '🏥',
    image: '/images/medical-center.webp',
    category: 'social',
    tagline: 'Comprehensive healthcare services',
    description: 'State-of-the-art medical facilities providing comprehensive healthcare services to communities.',
    services: ['Emergency Care', 'Specialized Treatment', 'Diagnostics', 'Patient Care'],
    stats: [
      { value: '1,000+', label: 'Beds' },
      { value: '24/7', label: 'Emergency' }
    ],
    isActive: true
  },
  {
    slug: 'transport',
    name: 'Transport Department',
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
    isActive: true
  },
  {
    slug: 'surgical-services',
    name: 'Surgical Services',
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
    isActive: true
  },
  {
    slug: 'surgical-repair',
    name: 'Surgical Repair Center',
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
    isActive: true
  },
  {
    slug: 'social-welfare',
    name: 'Social Welfare',
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
    isActive: true
  },
  {
    slug: 'job-placement',
    name: 'Job Placement Services',
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
    isActive: true
  },
  {
    slug: 'skill-development',
    name: 'Skill Development',
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
    isActive: true
  },
  {
    slug: 'residential-services',
    name: 'Residential Services',
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
    isActive: true
  },
  {
    slug: 'rehabilitation',
    name: 'Rehabilitation Center',
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
    isActive: true
  },
  {
    slug: 'tourism',
    name: 'Travel & Tourism',
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
    isActive: true
  },
  {
    slug: 'marketing',
    name: 'Marketing & Promotion',
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
    isActive: true
  },
  {
    slug: 'posthetic-services',
    name: 'Prosthetic Services',
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
    isActive: true
  },
  {
    slug: 'enterprises',
    name: 'Enterprise Development',
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
    isActive: true
  },
  {
    slug: 'sukoon-center',
    name: 'Sukoon Mental Health',
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
    isActive: true
  }
];