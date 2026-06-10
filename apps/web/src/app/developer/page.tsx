// apps/web/src/app/developer/page.tsx
import DeveloperDashboardClient from './DeveloperDashboardClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Developer Console | KhanHub',
  description: 'KhanHub System-Wide Interception Control Panel.',
};

export default function DeveloperPage() {
  const developerEmail = process.env.DEVELOPER_EMAIL || 'mubeenahma1123@gmail.com';
  
  return <DeveloperDashboardClient developerEmail={developerEmail} />;
}
