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
