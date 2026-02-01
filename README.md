# Khan Hub — Website Rebuild

**Khan Hub (Pvt.) Ltd.** — A modern, scalable, multi-department welfare organization website.

Built with **Next.js 14**, **Firebase**, and **Tailwind CSS**.

---

## 📂 Folder Structure

```
khanhub/
├── public/
│   ├── images/              → Static images (logos, photos)
│   └── icons/               → Favicon and app icons
│
├── src/
│   ├── app/                 → Next.js App Router pages
│   │   ├── layout.tsx       → Root layout (Navbar + Footer)
│   │   ├── page.tsx         → Homepage
│   │   ├── not-found.tsx    → Custom 404
│   │   ├── about/page.tsx
│   │   ├── departments/
│   │   │   ├── page.tsx     → All departments listing
│   │   │   └── [slug]/page.tsx → Dynamic department detail (handles all 16)
│   │   ├── media/page.tsx
│   │   ├── certificates/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── donate/page.tsx
│   │   ├── emergency/page.tsx
│   │   ├── app-download/page.tsx
│   │   ├── privacy-policy/page.tsx
│   │   └── terms/page.tsx
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx   → Responsive navbar with dropdown
│   │   │   └── Footer.tsx   → Full footer with links + contact
│   │   ├── ui/
│   │   │   └── index.tsx    → Reusable: SectionHeader, DepartmentCard, StatCard, PageHero, Spinner
│   │   ├── sections/
│   │   │   ├── HeroSection.tsx        → Homepage hero
│   │   │   ├── DepartmentsSection.tsx → Homepage departments grid
│   │   │   └── MissionSection.tsx     → Mission + Donate CTA
│   │   └── forms/
│   │       ├── ContactForm.tsx   → Contact page form → Firestore
│   │       ├── InquiryForm.tsx   → Department inquiry → Firestore
│   │       └── DonationForm.tsx  → Donation form → Firestore
│   │
│   ├── data/
│   │   ├── departments.ts   → All 16 departments (single source of truth)
│   │   └── site.ts          → Site config, nav links, footer links, stats
│   │
│   ├── lib/
│   │   ├── firebase.ts      → Firebase app initialization
│   │   ├── firestore.ts     → All Firestore CRUD functions
│   │   └── utils.ts         → Metadata generator, cn(), slugify, etc.
│   │
│   └── styles/
│       └── globals.css      → Tailwind + custom components + utilities
│
├── package.json
├── next.config.js
├── tailwind.config.js       → Brand colors, fonts, animations
├── tsconfig.json
├── postcss.config.js
├── .eslintrc.json
├── .env.example             → Firebase config template
└── README.md
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
```bash
cp .env.example .env.local
```
Open `.env.local` and fill in your Firebase project credentials from the [Firebase Console](https://console.firebase.google.com/).

### 3. Run Development Server
```bash
npm run dev
```
Visit: **http://localhost:3000**

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## 🔥 Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/) → Create a new project
2. Enable **Firestore Database** (Start in test mode for development)
3. Enable **Firebase Storage**
4. Go to **Project Settings** → copy the config into your `.env.local`
5. Later: Enable **Firebase Auth** for admin dashboard

### Firestore Collections (created automatically on first form submission):
| Collection     | Purpose                           |
|----------------|-----------------------------------|
| `contacts`     | Contact form submissions          |
| `inquiries`    | Department inquiry submissions    |
| `donations`    | Donation records                  |
| `appointments` | Appointment requests (future)     |

---

## 🌐 Deployment (Vercel)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → Import your repository
3. Add all environment variables from `.env.local` in Vercel's Settings → Environment Variables
4. Deploy → Connect your domain `khanhub.com.pk`

---

## ✏️ How to Add a New Department

Only **one file** needs to be edited:

**`src/data/departments.ts`** — Add a new object to the `DEPARTMENTS` array:

```typescript
{
  id: 17,
  slug: 'new-department',
  name: 'New Department Name',
  shortName: 'New Dept',
  icon: '🆕',
  color: 'text-blue-400',
  colorHex: '#60a5fa',
  category: 'services',
  tagline: 'Short tagline here',
  description: 'Full description...',
  services: [...],
  facilities: [...],
  programs: [...],
  gallery: [],
  contactEmail: 'newdept@khanhub.com.pk',
  contactPhone: '+92-311-0000017',
}
```

That's it. The department automatically appears in:
- ✅ Navigation dropdown
- ✅ Departments listing page
- ✅ Homepage departments section
- ✅ Its own detail page at `/departments/new-department`

---

## 🎨 Design System

| Element       | Font Family | Weight |
|---------------|-------------|--------|
| Headings (H1–H6) | Sora     | 600–800 |
| Body text     | DM Sans     | 300–600 |

| Color         | Usage                     |
|---------------|---------------------------|
| Primary (#0099b0) | Buttons, links, accents |
| Accent (#f97316)  | Donate CTA, highlights  |
| Neutral-950   | Page background           |
| Neutral-900   | Card backgrounds          |

---

## 📋 Pages Summary (29 total)

| Page                        | Route                          |
|-----------------------------|--------------------------------|
| Home                        | `/`                            |
| About Us                    | `/about`                       |
| Departments (listing)       | `/departments`                 |
| Department (×16, dynamic)   | `/departments/[slug]`          |
| Media                       | `/media`                       |
| Certificates                | `/certificates`                |
| Contact                     | `/contact`                     |
| Donate                      | `/donate`                      |
| Emergency                   | `/emergency`                   |
| Download App                | `/app-download`                |
| Privacy Policy              | `/privacy-policy`              |
| Terms & Conditions          | `/terms`                       |
| 404 Not Found               | (automatic)                    |

---

## 🛣️ Future Roadmap

- [ ] Admin Dashboard (Firebase Auth + role-based access)
- [ ] Appointment Booking System
- [ ] Education LMS Integration
- [ ] Job Portal
- [ ] Mobile App (React Native)
- [ ] Email notifications via Firebase Cloud Functions
- [ ] PayFast payment gateway integration

---

*Built with ❤️ for Khan Hub (Pvt.) Ltd.*
