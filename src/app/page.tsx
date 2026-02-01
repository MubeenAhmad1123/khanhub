// src/app/page.tsx
// ─────────────────────────────────────────────
// HOME PAGE — the landing page.
// Simply imports and stacks all homepage sections.
// ─────────────────────────────────────────────

import HeroSection        from '@/components/sections/HeroSection';
import DepartmentsSection from '@/components/sections/DepartmentsSection';
import { MissionSection, DonateCTASection } from '@/components/sections/MissionSection';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <MissionSection />
      <DepartmentsSection />
      <DonateCTASection />
    </>
  );
}
