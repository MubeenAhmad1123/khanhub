// File: apps/transport/src/app/auth/login/page.tsx

import type { Metadata } from 'next';
import LoginPageClient from './LoginPageClient';

export const metadata: Metadata = {
  title: 'Login - Khanhub Transport',
  description:
    'Sign in to your Khanhub Transport account for professional healthcare transit services',
};

export default function LoginPage() {
  return <LoginPageClient />;
}
