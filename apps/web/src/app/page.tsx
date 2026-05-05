// src/app/page.tsx
// ─────────────────────────────────────────────
// HOME PAGE — the landing page.
// Simply imports and stacks all homepage sections.
// ─────────────────────────────────────────────

import HeroSection from '@/components/sections/HeroSection';
import { DonateCTASection } from '@/components/sections/Donationsection';
import DepartmentsSection from '@/components/sections/DepartmentsSection';
import { MissionSection } from '@/components/sections/MissionSection';
import { SuccessStoriesSection } from '@/components/sections/SuccessStoriesSection';
import { TestimonialsSection } from '@/components/sections/TestimonialsSection';

export default function HomePage() {
  return (
    <main className="w-full overflow-x-hidden relative bg-white">
      <HeroSection />
      <MissionSection />
      <DepartmentsSection />
      <SuccessStoriesSection />
      <TestimonialsSection />
      <DonateCTASection />
    </main>
  );
}
