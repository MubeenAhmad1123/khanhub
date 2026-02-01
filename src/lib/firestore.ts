// src/lib/firestore.ts
// ─────────────────────────────────────────────
// All Firestore operations live here.
// Each function maps to one collection.
// Import and call from forms / API routes.
// ─────────────────────────────────────────────

import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ─── Types ──────────────────────────────────────────────

export interface ContactSubmission {
  name:           string;
  email:          string;
  phone:          string;
  subject:        string;
  message:        string;
  createdAt?:     any; // serverTimestamp
}

export interface DepartmentInquiry {
  department:     string;   // slug
  name:           string;
  email:          string;
  phone:          string;
  message:        string;
  createdAt?:     any;
}

export interface DonationRecord {
  name:           string;
  email:          string;
  phone:          string;
  amount:         number;
  currency:       string;  // PKR | USD
  method:         string;  // payfast | bank | jazzcash | easypaisa
  message?:       string;
  status:         'pending' | 'completed' | 'failed';
  createdAt?:     any;
}

export interface AppointmentRequest {
  department:     string;
  name:           string;
  email:          string;
  phone:          string;
  preferredDate: string;
  preferredTime: string;
  message?:       string;
  createdAt?:     any;
}

// ─── Contact Form ───────────────────────────────────────

export async function submitContact(data: Omit<ContactSubmission, 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'contacts'), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// ─── Department Inquiry ─────────────────────────────────

export async function submitInquiry(data: Omit<DepartmentInquiry, 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'inquiries'), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// ─── Donation ───────────────────────────────────────────

export async function createDonation(data: Omit<DonationRecord, 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'donations'), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// ─── Appointment ────────────────────────────────────────

export async function submitAppointment(data: Omit<AppointmentRequest, 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'appointments'), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}
