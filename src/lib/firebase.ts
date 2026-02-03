// src/lib/firebase.ts
// ─────────────────────────────────────────────
// Firebase initialization.
// Reads config from environment variables.
// Uses singleton pattern so Firebase only initializes once.
// ─────────────────────────────────────────────
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD31X2_qokpRx4wIRLP99QkzC-9BEndbIs",
  authDomain: "khanhub-5e552.firebaseapp.com",
  projectId: "khanhub-5e552",
  storageBucket: "khanhub-5e552.firebasestorage.app",
  messagingSenderId: "484860653296",
  appId: "1:484860653296:web:b80315c175afed96539c35",
  measurementId: "G-KMPX0DHCL5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);