import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import TransportNavbar from '@/components/layout/TransportNavbar';
import TransportFooter from '@/components/layout/TransportFooter';
import AuthProviderWrapper from '@/components/providers/AuthProviderWrapper';
import '../styles/globals.css';

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
        <AuthProviderWrapper>
          <TransportNavbar />
          <main className="flex-grow flex flex-col">{children}</main>
          <TransportFooter />
        </AuthProviderWrapper>
      </body>
    </html>
  );
}