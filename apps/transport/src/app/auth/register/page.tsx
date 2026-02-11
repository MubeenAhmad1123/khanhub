// File: apps/transport/src/app/auth/register/page.tsx

import type { Metadata } from 'next';
import RegisterPageClient from './RegisterPageClient';

export const metadata: Metadata = {
  title: 'Sign Up - Khanhub Transport',
  description:
    'Create your Khanhub Transport account to access professional healthcare transit services',
};

export default function RegisterPage() {
  return <RegisterPageClient />;
}
