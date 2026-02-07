# Khanhub Job Portal

A comprehensive talent placement job portal built with Next.js 14, Firebase, and Tailwind CSS.

## Features

- **Role-based Authentication**: Job Seekers, Employers, and Admin
- **Payment Verification**: Manual JazzCash screenshot upload and approval
- **CV Parsing**: Automatic extraction from PDF/DOCX files
- **Job Matching**: 4-factor algorithm (skills, experience, location, education)
- **Premium Membership**: Rs. 10,000/month for unlimited applications
- **Points & Gamification**: Reward system for profile completion
- **Commission Tracking**: 50% of first month salary
- **Email Notifications**: Powered by Resend

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Email**: Resend
- **Forms**: React Hook Form + Zod

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env.local` from `.env.example` and fill in your keys

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3002](http://localhost:3002)

## Firebase Setup

1. Create a Firebase project
2. Enable Authentication (Email/Password, Google)
3. Create Firestore database
4. Enable Firebase Storage
5. Deploy security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Environment Variables

See `.env.example` for required variables.

## Project Structure

```
apps/job/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # Reusable components
│   ├── hooks/           # Custom React hooks
│   ├── lib/
│   │   ├── firebase/    # Firebase configuration & helpers
│   │   └── services/    # Business logic (CV parsing, matching, etc.)
│   └── types/           # TypeScript type definitions
├── firestore.rules      # Firestore security rules
└── package.json
```

## Key Pages

- `/auth/register` - Role selection and registration
- `/auth/login` - Login with role-based redirect
- `/auth/verify-payment` - Payment screenshot upload
- `/dashboard` - Job seeker dashboard
- `/employer/dashboard` - Employer dashboard
- `/admin/dashboard` - Admin panel

## Payment Flow

1. User registers (Rs. 1,000 registration fee)
2. Upload JazzCash screenshot
3. Admin approves/rejects payment
4. User gains access to platform
5. Optional premium upgrade (Rs. 10,000/month)

## License

MIT
