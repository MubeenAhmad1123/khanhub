// src/lib/welfare/staffConstants.ts
import { DressCodeItem } from '@/types/welfare';

export const MALE_DRESS_CODE_PRESETS = [
  { id: 'dress_pant',    name: 'Dress Pant' },
  { id: 'dress_shirt',   name: 'Dress Shirt' },
  { id: 'tie',           name: 'Tie' },
  { id: 'shoes',         name: 'Shoes' },
  { id: 'employee_card', name: 'Employee Card' },  // COMPULSORY for all
];

export const FEMALE_DRESS_CODE_PRESETS = [
  { id: 'abaya',         name: 'Abaya' },
  { id: 'hijab',         name: 'Hijab' },
  { id: 'shoes',         name: 'Shoes' },
  { id: 'employee_card', name: 'Employee Card' },  // COMPULSORY for all
];

// Employee Card is ALWAYS included and cannot be removed for any staff
export const COMPULSORY_DRESS_ITEM: DressCodeItem = {
  id: 'employee_card',
  name: 'Employee Card',
  required: true,
  isCustom: false,
};
