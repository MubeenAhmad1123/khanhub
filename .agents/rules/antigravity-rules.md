---
trigger: model_decision
description: use these rules whn i am working in the rehab one or in the web one
---

# KhanHub Monorepo — Antigravity Workspace Rules

## WHO I AM
I am Mubi (Mubeen Ahmed), a fullstack developer building the KhanHub platform.
Stack: Next.js 14, TypeScript, Tailwind CSS, Firebase (Auth + Firestore), Cloudinary.
Monorepo root: C:\Users\Mirza Computers\OneDrive\Desktop\khanhub\apps

## PROJECT STRUCTURE
- apps/web    → Main website (khanhub.com.pk) + Rehab Portal
- apps/job    → Job portal (LIVE — NEVER TOUCH THIS)
- apps/enterprise, apps/surgical, apps/transport → Other shops

## CRITICAL: NEVER TOUCH
- apps/job/ — it is live production, do not modify any file here
- Firestore collections: users, videos, follows, notifications, payments,
  paymentRequests, videoPayments, jobs, applications, connections,
  adminSettings, likes, video_feedback, reports, interests
- These belong to the job platform. Any change breaks live users.

## CURRENT ACTIVE WORK: REHAB PORTAL
Path: apps/web/src/app/departments/rehab/
All rehab Firestore collections are prefixed: rehab_
Firebase config: apps/web/src/lib/firebase.ts (exports auth and db)
Session hook: apps/web/src/hooks/rehab/useRehabSession.ts
Server actions: apps/web/src/app/departments/rehab/actions/createRehabUser.ts

## FIREBASE RULES
- NEVER use orderBy() together with where() on different fields — causes composite index error
- Always sort results client-side after fetching
- All Timestamp fields: use .toDate?.() safety pattern
- rehab_users collection: allow write: if false from client — only server actions write it
- rehab_meta collection: allow write: if false from client — only server actions write it

## CODE STYLE RULES
- Tailwind CSS only — no new CSS files, no styled-components, no CSS modules
- No new npm packages without asking first
- Use 'use client' on all dashboard pages
- All pages must be mobile responsive — minimum 320px screen width
- Mobile first: always use sm: md: lg: breakpoints, never desktop-only classes
- Never render objects directly in JSX — always access .fieldName
- Photo uploads: use uploadToCloudinary from @/lib/cloudinaryUpload
- Error states: always show error to user on screen, never just console.log

## FIRESTORE QUERY RULES (VERY IMPORTANT)
- NEVER: query(collection, where('a','==',x), orderBy('b')) — needs composite index
- ALWAYS: query(collection, where('a','==',x)) then sort array client-side
- Date comparisons: always use string comparison on YYYY-MM-DD format
- Use getDocs for one-time fetches, onSnapshot only for real-time needs

## RESPONSIVE DESIGN RULES
- grid-cols-3 → grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
- grid-cols-4 → grid-cols-2 lg:grid-cols-4
- p-8 or higher → p-4 sm:p-6 lg:p-8
- text-4xl or higher → text-xl sm:text-3xl lg:text-4xl
- Every <table> must be inside <div className="overflow-x-auto w-full">
- flex items-center gap-6 → flex flex-wrap items-center gap-3
- Page title + action button row → flex flex-col sm:flex-row gap-3

## REHAB PORTAL — 5 ROLES
superadmin → /dashboard/superadmin (creates admin + cashier)
admin      → /dashboard/admin (creates family + staff users)
cashier    → /dashboard/cashier (records all transactions)
staff      → /dashboard/staff (self attendance only)
family     → /dashboard/family/[patientId] (read-only patient view)

## BUSINESS RULES
- Only cashier enters financial transactions
- Every transaction starts status:'pending', superadmin approves/rejects
- Transactions NEVER deleted — audit trail forever
- On approval of patient_fee → auto-update rehab_fees (create if not exists)
- On approval of canteen_deposit → auto-update rehab_canteen
- On approval of staff_salary → auto-create rehab_salary_records
- Salary formula: dailyRate = salary/26, deductions = absent*dailyRate + fines
- Patient fee due check: if today >= 10th and amountRemaining > 0 → show badge

## ENVIRONMENT VARIABLES
Firebase Admin: FIREBASE_SERVICE_ACCOUNT_JSON (full JSON, use JSON.parse())
Do NOT use FIREBASE_PRIVATE_KEY directly — Vercel corrupts it.
Client Firebase: NEXT_PUBLIC_FIREBASE_* variables

## OUTPUT FORMAT I WANT
- Always give complete file rewrites, not partial diffs
- Include full import statements
- End every task with: cd apps/web && git add -A && git commit -m "..." && git push
- If firestore.rules was changed: also run firebase deploy --only firestore:rules
- Never explain what you did — just do it and confirm done