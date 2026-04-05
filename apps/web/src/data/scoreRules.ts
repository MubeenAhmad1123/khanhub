// src/data/scoreRules.ts
// Official KhanHub Performance Scoring System (April 2026)

export const SCORE_CATEGORIES = {
  attendance: {
    label: 'Attendance',
    maxDaily: 1,
    maxMonthly: 30,
    rule: 'On time = 1 mark. Late or absent = 0 marks.',
    icon: 'CalendarCheck',
    color: 'blue',
  },
  uniform: {
    label: 'Uniform',
    maxDaily: 1,
    maxMonthly: 30,
    rule: 'Full uniform worn = 1 mark. Any item missing = 0 marks.',
    icon: 'Shirt',
    color: 'purple',
  },
  working: {
    label: 'Working',
    maxDaily: 1,
    maxMonthly: 30,
    rule: 'All assigned tasks completed = 1 mark. Any task incomplete = 0 marks.',
    icon: 'CheckSquare',
    color: 'teal',
  },
  growthPoint: {
    label: 'Growth Point',
    maxDaily: 1,
    maxMonthly: 30,
    rule: 'Submit 1 growth contribution for the organization per day = 1 mark.',
    icon: 'TrendingUp',
    color: 'amber',
  },
};

export const TOTAL_MAX_SCORE = 120; // 30 × 4 categories (Group category removed)

// Monthly reward thresholds (pro-rated for 120 max score)
export const MONTHLY_REWARDS = [
  {
    minScore: 120,
    label: 'Excellent',
    reward: 'Prize: Rs. 5,000',
    color: 'green',
    badge: '🏆',
  },
  {
    minScore: 96,
    label: 'Average',
    reward: 'Prize: Rs. 2,000',
    color: 'blue',
    badge: '⭐',
  },
  {
    minScore: 80,
    label: 'Warning',
    reward: 'Warning Letter Issued',
    color: 'amber',
    badge: '⚠️',
  },
  {
    minScore: 64,
    label: 'No Salary',
    reward: 'Salary Withheld This Month',
    color: 'red',
    badge: '🚫',
  },
];

// Weekly reward rule (Max per week is 28 (7 days * 4 cats))
export const WEEKLY_RULE = {
  minScore: 24, 
  reward: 'Eligible for Weekly Quiz Prize Draw',
};

// Department specific working tasks
export const DEPARTMENT_TASKS: Record<string, string[]> = {
  'hospital': [
    'Reception Cleaning',
    'OT Cleaning',
    'Pharmacy Cleaning',
    'Wash Room Cleaning',
    'Dustbin Empty',
    'Staff Attendance',
    'Staff Uniform and Card Check',
    'Bed Sheets',
    'Water Cooler',
    'Reception Register Record',
    'Dusting',
    'Doctor Room Neatness',
    'Overall Hospital Neatness',
    'Electricity Changeover',
  ],
  'rehab': [
    'Reception Cleaning',
    'Patient Khana (Meals)',
    'Patient Tea',
    'Wash Room Cleaning',
    'Dustbin Empty',
    'Staff Attendance',
    'Water Cooler',
    'Patient Record Register',
    'Patient Fees Record',
    'Dusting',
    'Patient Activity Monitoring',
    'Medication Distribution',
    'Night Security Round',
  ],
  'social-media': [
    'Daily Calendar Post (8:00 AM)',
    'Dr Khan Quotes Post (9:00 AM)',
    'Daily Mockup (6:00 PM)',
    'Awareness Post (12:00 PM)',
    'Medical Center Post (2:00 PM)',
    'Rehab Center Post (11:00 AM)',
    'SPIMS Post (7:00 PM)',
    'Job Center Post (10:00 AM)',
    'Travels & Tours Post (8:00 PM)',
    'Welfare Center Post (3:00 PM)',
    'Optional Post (5:00 PM)',
    'CapCut Video (3:00 PM)',
    'Dr Khan TikTok Video (9:30 PM)',
    'Rehab Patient Video (5 videos)',
  ],
  'spims': [
    'Classroom Preparation',
    'Student Attendance',
    'Lecture Delivery',
    'Lab Supervision',
    'Student Record Update',
    'Fee Collection Register',
    'Overall Department Neatness',
  ],
  'sukoon-center': [
    'Client Registration',
    'Session Notes Update',
    'Client Attendance',
    'Report Submission',
    'Overall Cleanliness',
  ],
  'job-center': [
    'Job Posting Update',
    'Candidate Registration',
    'Interview Scheduling',
    'Client Follow-up',
    'Weekly Report',
  ],
  'it': [
    'Website Maintenance',
    'Daily Backup',
    'Bug Report Review',
    'System Health Check',
    'Support Tickets',
  ],
  'default': [
    'Daily Tasks Completion',
    'Report Submission',
    'Team Communication',
    'Record Update',
  ],
};
