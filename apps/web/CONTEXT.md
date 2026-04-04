# KhanHub Web App — AI Context

> **Path:** `apps/web/` — Monorepo: `khanhub`
> **Last Updated:** March 2026

---

## 1. Project Overview

**What it does:** KhanHub is a multi-department welfare organization platform (Pakistan-based) combining a public-facing marketing website with role-based internal management portals for rehabilitation centers, a medical institute (SPIMS), and a centralized HQ oversight system.

**Target users:**
- **Public visitors** — seeking info about services, donations, admissions, success stories
- **Rehab staff** — admins, staff, cashiers, and family members managing patients
- **HQ management** — superadmins, managers, and cashiers overseeing all departments
- **SPIMS users** — students, staff, and admins of the medical institute

**Core purpose:** Unified platform for patient management, finance tracking, attendance, therapy records, transaction approval workflows, and cross-department oversight.

---

## 2. Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js 14.2 (App Router) |
| Language | TypeScript 5.x |
| UI | React 18.3, Tailwind CSS 4.1, clsx + tailwind-merge |
| Animations | Framer Motion 11.x |
| Icons | Lucide React, React Icons |
| Charts | Recharts 2.12 |
| Backend/DB | Firebase (Firestore, Auth, Storage) + Firebase Admin |
| Notifications | react-hot-toast |
| PWA | @ducanh2912/next-pwa |
| SEO | next-sitemap, dynamic metadata |
| Analytics | Vercel Analytics + Speed Insights |
| Image hosting | Cloudinary (unsigned upload) |
| Dev tools | ESLint (next config) |

---

## 3. Architecture

### High-level folder structure (`src/`)

```
src/
  app/                    # Next.js App Router pages
    layout.tsx            # Root layout (ConditionalShell, Toaster, Analytics)
    page.tsx              # Homepage
    departments/          # Rehab + SPIMS portals + department detail pages
    hq/                   # HQ portal (login, setup, dashboard)
    auth/                 # Public auth pages
    ...                   # Public pages (about, contact, donate, media, etc.)
  components/
    layout/               # Navbar, Footer, ConditionalShell, ProtectedRoute, UserMenu
    sections/             # HeroSection, DepartmentsSection, MissionSection, etc.
    forms/                # DonationForm, ContactForm, InquiryForm
    ui/                   # DepartmentCard, SuccessStoryCard, GoogleTranslateWidget
    rehab/                # Rehab-specific (sidebar, patient cards, fee tracker, profile tabs)
    spims/                # SPIMS-specific (student card, sidebar, fee tracker)
  data/
    site.ts               # Global site config, nav links, footer links, stats
    departments.ts        # All 16 departments with themes, programs, courses
  hooks/
    useAuth.ts            # Firebase auth hook (Google sign-in)
    rehab/useRehabSession.ts  # localStorage session (12hr timeout)
    hq/useHqSession.ts        # localStorage session (12hr timeout)
    spims/useSpimsSession.ts  # localStorage session (12hr timeout)
  lib/
    firebase.ts           # Firebase client init (db, auth, googleProvider)
    utils.ts              # toDate, cn, generateMetadata, slugify, formatPhone, debounce
    cloudinaryUpload.ts   # XHR upload to Cloudinary
    whatsapp.ts           # wa.me link generator
    rehab/                # rehabAuth, rehabUsers, patients, transactions, attendance, reports
    spims/                # spimsAuth, spimsUsers, patients, transactions, attendance, reports
  types/
    rehab.ts              # Patient, RehabUser, Transaction, FeeRecord, DailyActivityRecord, etc.
    hq.ts                 # HqUser, HqSession, HqStaff, HqAttendance, HqTransaction, etc.
    spims.ts              # Student, SpimsUser, SpimsSession, etc.
    department.ts         # Department, Program, Course types
```

### Routing
- **Next.js App Router** — file-based under `src/app/`
- Dynamic routes: `departments/[slug]/page.tsx`, `departments/[slug]/[programSlug]/page.tsx`
- Rehab: `/departments/rehab/login`, `/departments/rehab/dashboard/[role]/...`
- HQ: `/hq/login`, `/hq/setup`, `/hq/dashboard/[role]/...`
- SPIMS: types/components exist, pages are WIP

### State Management
- **No global state library** — React `useState`/`useEffect` only
- **localStorage** for sessions: `rehab_session`, `hq_session`, `spims_session`
- **Session timeouts:** All portals = 12 hours (43200000ms)
- **Firebase `onSnapshot`** used only in rehab dashboard layout for real-time user verification

### API Handling
- **Direct Firebase client SDK** — all data operations call Firestore from client components
- **No API routes or server actions** for data operations
- **Firebase Admin SDK** installed but only used server-side (via `serverExternalPackages`)
- **Cloudinary** uploads client-side via unsigned preset (XHR)

---

## 4. Key Features by Department

### Rehab Department (`/departments/rehab/`)

| Role | Capabilities |
|---|---|
| **Admin** | Dashboard, patient CRUD + full profile (5 tabs: admission, daily sheet, therapy, medication, progress), staff management, finance, reports |
| **Staff** | Mark own attendance, view assigned patients |
| **Family** | Read-only view of their specific patient (profile, daily sheet, therapy, medication, progress, finance) |
| **Superadmin** | Full oversight: users, audit logs, reports, approvals, cross-department finance |

**Key features:**
- Patient admission with comprehensive intake form (identity, addiction, health, psychiatric, psychological)
- Daily activity tracking — 21 activities × calendar grid with completion percentages
- Therapy session notes with progress rating (1-4 scale)
- Medication administration records with signatures
- Weekly progress scoring with line chart visualization
- Fee tracking with payment approval workflow (pending → approved/rejected)
- Canteen wallet with deposit/expense tracking
- Staff attendance with streak calculation

### HQ Department (`/hq/`)

| Role | Capabilities |
|---|---|
| **Superadmin** | Overview dashboard, create/manage all users, view all passwords, audit log, approve/reject transactions, rehab finance view, patient lists |
| **Manager** | Overview, staff roster, mark attendance (with dress code + duty tracking), approve transactions, create users |
| **Cashier** | Record income/expense transactions for Rehab/SPIMS, transaction history with filters |

**Key features:**
- Centralized oversight of Rehab and SPIMS departments
- Transaction approval workflow: Cashier creates → Manager/Superadmin approves/rejects
- Staff management across departments with attendance, dress code, duty logging
- Late detection with automatic ₨200 fine
- All passwords view with copy-to-clipboard
- Rehab patient finance summary table (matching Excel "Summry" sheet)

### SPIMS Department (`/departments/spims/`)
- Medical institute management (12 courses: Pharmacy Tech, BSN, LHV, CMW, CNA, etc.)
- Student management, fee tracking, exam records, canteen wallet, attendance
- **Note:** Types, components, and lib functions exist. Page routes are WIP.

### Public Pages
| Route | Purpose |
|---|---|
| `/` | Homepage: Hero, Mission, Departments, Success Stories, Testimonials, Donate CTA |
| `/departments` | All departments listing with category filtering |
| `/departments/[slug]` | Department detail page with programs |
| `/departments/[slug]/[programSlug]` | Program detail page |
| `/about`, `/contact`, `/donate`, `/media`, `/emergency` | Public info pages |
| `/certificates` | Certificate request form |
| `/success-stories` | Success stories with category selector |
| `/auth/signin` | Google sign-in |

---

## 5. Important Components

### Layout
| Component | Purpose |
|---|---|
| `ConditionalShell` | Hides Navbar/Footer for dashboard paths (`/departments/rehab/`, `/hq/`) |
| `ProtectedRoute` | Wraps pages requiring Firebase Google auth |
| `RehabSidebar` | Role-filtered navigation sidebar for rehab portal |
| `SpimsSidebar` | Role-filtered navigation sidebar for SPIMS portal |

### Rehab Patient Profile Tabs
| Component | Purpose |
|---|---|
| `AdmissionTab` | Full admission form (read-only + edit mode) with 6 sections |
| `DailySheetTab` | 21-activity calendar grid with click-to-cycle, completion %, counselling/vital notes modals, read-only mode for family |
| `TherapyTab` | Therapy session list with add modal, progress rating (1-4 stars) |
| `MedicationTab` | Medication records table with add modal (timing, signatures) |
| `ProgressTab` | Weekly progress line chart (Recharts) + week cards with scores |

### Rehab Utility
| Component | Purpose |
|---|---|
| `PatientCard` | Patient summary (name, diagnosis, admission date, package) |
| `FeeTracker` | Fee record with payment history and status badges |
| `CanteenWallet` | Canteen balance + recent expense list |
| `TransactionForm` | Income/expense transaction entry |
| `EyePasswordInput` | Password input with visibility toggle |

### Public UI
| Component | Purpose |
|---|---|
| `DepartmentCard` | Department display with theme colors |
| `SuccessStoryCard` | Success story display |
| `DonationForm` | Donation submission → Firestore `donations` |
| `ContactForm` | Contact submission → Firestore `contacts` + WhatsApp |
| `GoogleTranslateWidget` | Google Translate integration |

---

## 6. Data Flow

```
User Action (Client Component)
    │
    ▼
Firebase Auth (email/password or Google Sign-In)
    │
    ▼
Session stored in localStorage (rehab_session / hq_session / spims_session)
    │
    ▼
Firestore CRUD operations (direct client SDK — no API routes)
    │
    ├── rehab_patients, rehab_users, rehab_fees, rehab_canteen,
    │   rehab_daily_activities, rehab_therapy_sessions,
    │   rehab_medication_records, rehab_weekly_progress,
    │   rehab_transactions, rehab_attendance, rehab_audit
    │
    ├── spims_patients, spims_users, spims_fees, spims_canteen,
    │   spims_transactions, spims_attendance, spims_audit,
    │   spims_videos, spims_board_fees, spims_exam_records
    │
    ├── hq_users, hq_staff, hq_attendance, hq_dress_code,
    │   hq_duties, hq_duty_logs, hq_transactions
    │
    └── contacts, inquiries, donations, certificates (public forms)
    │
    ▼
Cloudinary (file uploads via unsigned preset)
    │
    ▼
WhatsApp (wa.me links for contact form notifications)
```

**Key pattern:** All data operations are client-side. No server actions, no API routes for data. Firebase Admin SDK is installed but not actively used in client code.

---

## 7. Firestore Collections

### Public Collections
| Collection | Purpose |
|---|---|
| `contacts` | Contact form submissions |
| `inquiries` | Inquiry form submissions |
| `donations` | Donation submissions |
| `certificates` | Certificate requests |

### Rehab Collections
| Collection | Purpose |
|---|---|
| `rehab_users` | Auth users (customId, role, isActive, patientId) |
| `rehab_patients` | Patient records (full admission data) |
| `rehab_fees` | Monthly fee records per patient (nested payments array) |
| `rehab_canteen` | Canteen wallet per patient (nested transactions array) |
| `rehab_daily_activities` | One doc per patient per date (21 activities) |
| `rehab_therapy_sessions` | Individual therapy session notes |
| `rehab_medication_records` | Medication administration records |
| `rehab_weekly_progress` | Weekly progress scores (1-4 scale) |
| `rehab_transactions` | Income/expense (pending → approved/rejected) |
| `rehab_attendance` | Staff attendance records |
| `rehab_audit` | Audit log for rehab actions |

### SPIMS Collections
| Collection | Purpose |
|---|---|
| `spims_users` | Auth users for SPIMS portal |
| `spims_students` | Student records |
| `spims_fees` | Student fee records |
| `spims_canteen` | Student canteen wallet |
| `spims_transactions` | Income/expense transactions |
| `spims_attendance` | Staff/student attendance |
| `spims_audit` | Audit log for SPIMS actions |
| `spims_videos` | Patient/student videos |
| `spims_board_fees` | Board/exam fee payments |
| `spims_exam_records` | Exam results per student |

### HQ Collections
| Collection | Purpose |
|---|---|
| `hq_users` | HQ auth users (superadmin, manager, cashier) |
| `hq_staff` | Staff records across all departments |
| `hq_attendance` | Staff attendance (late detection, fines) |
| `hq_dress_code` | Dress code compliance tracking |
| `hq_duties` | Staff duty definitions |
| `hq_duty_logs` | Duty completion tracking |
| `hq_transactions` | Cross-department transactions (rehab + spims) |

---

## 8. Auth System

### Three separate auth systems:

**1. Rehab Auth** (`@rehab.khanhub` domain)
- Email/password via Firebase Auth
- Email format: `{customId}@rehab.khanhub`
- Session: `localStorage` → `rehab_session`
- Background verification against `rehab_users` Firestore doc
- 12-hour session timeout
- Roles: `admin`, `staff`, `family`, `cashier`, `superadmin`

**2. HQ Auth** (custom, no Firebase Auth)
- Custom ID + password login against `hq_users` collection
- Session: `localStorage` → `hq_session`
- 12-hour session timeout (43200000ms)
- Roles: `superadmin`, `manager`, `cashier`
- Setup page at `/hq/setup` for initial superadmin creation

**3. SPIMS Auth** (`@spims.khanhub` domain)
- Email/password via Firebase Auth
- Email format: `{customId}@spims.khanhub`
- Session: `localStorage` → `spims_session`
- Roles: `student`, `staff`, `cashier`, `admin`, `superadmin`

**4. Public Auth** (Google only)
- Google Sign-In via Firebase Auth
- Used for general site access (ProtectedRoute)

### Role-Based Access Control
- Each dashboard layout filters nav items by role
- **All RBAC is client-side** — no server-side enforcement
- `isActive` field checked on login to prevent deactivated accounts

---

## 9. Environment & Config

### Environment Variables (`.env.local`)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase client config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Admin SDK service account (JSON string) |
| `NEXT_PUBLIC_SITE_URL` | Site URL (https://khanhub.com.pk) |
| `NEXT_PUBLIC_SUPPORT_PHONE` | Support phone number |
| `NEXT_PUBLIC_EMERGENCY_PHONE` | Emergency phone number |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Cloudinary unsigned upload preset |

### `next.config.js` Key Config
- **PWA** enabled via `@ducanh2912/next-pwa` (disabled in dev)
- **Image remote patterns:** firebasestorage, googleusercontent, dicebear, Cloudinary
- **Image formats:** AVIF, WebP
- **serverExternalPackages:** firebase-admin
- **Redirects:** Legacy `.php` routes → new Next.js routes
- **Headers:** manifest.json content-type and cache-control

---

## 10. Constraints & Patterns

### Firestore Index Constraints
- **NEVER use `orderBy` + `where` on different fields** — causes composite index requirement errors
- **Client-side sorting is standard:** fetch with `where` only, then `.sort()` in JS
- Exception: `orderBy` on the same field as `where` is allowed

### Session Pattern
- All portal sessions use **localStorage** (not cookies or server sessions)
- Session format: `{ uid, customId, role, displayName?, name?, patientId?, loginTime? }`
- No server-side session validation on page load (client-side only)

### Data Entry Patterns
- **Transactions** always start as `pending` status, require approval workflow
- **Audit logging** is fire-and-forget (never throws, silently logs errors)
- **Timestamps** use Firebase `Timestamp.now()` for server-side consistency
- **Date strings** use `YYYY-MM-DD` format for easy range queries

### Naming Conventions
- Collections prefixed by department: `rehab_*`, `spims_*`, `hq_*`
- Types match collection names: `Patient`, `FeeRecord`, `Transaction`, etc.
- Lib functions are CRUD-style: `getPatient`, `createPatient`, `updatePatient`
- Components are domain-scoped: `src/components/rehab/`, `src/components/spims/`

### UI Patterns
- **Dark mode** per-portal via localStorage (`rehab_dark_mode`, `hq_dark_mode`)
- **Sidebar navigation** with role-based filtering
- **Mobile responsive** with hamburger menu and slide-out drawer
- **Toast notifications** via `react-hot-toast` (bottom-right)
- **Conditional shell** hides public layout on dashboard paths

### Known Limitations
- No server-side rendering for dashboard data (all client-side)
- No real-time listeners for most data (only rehab dashboard layout uses `onSnapshot`)
- Password reset requires Firebase Admin SDK (not implemented client-side)
- Creating users client-side signs out the current user (noted in code comments)
- SPIMS portal routes not yet created (components and types exist but no pages)
