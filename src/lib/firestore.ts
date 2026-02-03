// src/lib/firestore.ts
import { db } from './firebase';
import {
  collection,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

// ─── Collection References ────────────────────────────────────
export const contactsCollection = collection(db, 'contacts');
export const inquiriesCollection = collection(db, 'inquiries');
export const donationsCollection = collection(db, 'donations');
export const certificatesCollection = collection(db, 'certificates');


// ─── Contact Form ──────────────────────────────────────────────
export async function submitContactForm(data: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}) {
  try {
    const docRef = await addDoc(contactsCollection, {
      ...data,
      timestamp: serverTimestamp(),
      status: 'new'
    });
    console.log('✅ Contact saved. ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('❌ Contact error:', error.code, error.message);
    return { success: false, error: error.message };
  }
}


// ─── Inquiry Form ─────────────────────────────────────────────
// ⚠️ Security rules REQUIRE these fields: name, email, department, timestamp
// If ANY field is missing → Firebase rejects it → "Something went wrong"
export async function submitInquiryForm(data: {
  name: string;
  email: string;
  phone?: string;
  department: string;   // ← THIS IS REQUIRED. Must come from your form.
  message: string;
}) {
  try {
    // Safety check — if department is empty, it will fail on Firebase side
    if (!data.department) {
      console.error('❌ department field is empty or missing');
      return { success: false, error: 'Department is required' };
    }

    const docRef = await addDoc(inquiriesCollection, {
      ...data,
      timestamp: serverTimestamp(),
      status: 'pending'
    });
    console.log('✅ Inquiry saved. ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('❌ Inquiry error:', error.code, error.message);
    return { success: false, error: error.message };
  }
}


// ─── Donation Form ────────────────────────────────────────────
export async function submitDonation(data: {
  name: string;
  email: string;
  phone?: string;
  amount: number;
  method: string;
}) {
  try {
    const docRef = await addDoc(donationsCollection, {
      ...data,
      timestamp: serverTimestamp(),
      status: 'pending'
    });
    console.log('✅ Donation saved. ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('❌ Donation error:', error.code, error.message);
    return { success: false, error: error.message };
  }
}


// ─── Certificate Form ─────────────────────────────────────────
export async function submitCertificateRequest(data: {
  fullName: string;
  email: string;
  phone?: string;
}) {
  try {
    const docRef = await addDoc(certificatesCollection, {
      ...data,
      timestamp: serverTimestamp(),
      status: 'pending'
    });
    console.log('✅ Certificate request saved. ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('❌ Certificate error:', error.code, error.message);
    return { success: false, error: error.message };
  }
}