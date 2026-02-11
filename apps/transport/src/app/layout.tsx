import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../styles/globals.css';
import ClientShell from '@/components/layout/ClientShell';
import AuthProviderWrapper from '@/components/providers/AuthProviderWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Khanhub Transport - Reliable Rides in Pakistan',
  description: 'Fast, safe and comfortable rides at your fingertips with Khanhub Transport.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
