// apps/web/src/components/shared/SiteBlockGate.tsx
import { headers } from 'next/headers';
import { getSiteBlockState } from '@/lib/siteBlock';
import { ShieldAlert } from 'lucide-react';

interface SiteBlockGateProps {
  children: React.ReactNode;
}

export default async function SiteBlockGate({ children }: SiteBlockGateProps) {
  const headersList = headers();
  const pathname = headersList.get('x-pathname') || headersList.get('x-invoke-path') || '';

  // Exclude /developer routes from the block
  if (pathname.startsWith('/developer')) {
    return <>{children}</>;
  }

  const { isBlocked, heading, message } = await getSiteBlockState();

  if (!isBlocked) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-neutral-950 overflow-hidden font-sans">
      {/* Dynamic abstract mesh background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />
      
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main glassmorphic block card */}
      <div className="relative z-10 max-w-xl w-full mx-4">
        <div className="backdrop-blur-2xl bg-neutral-900/80 border border-neutral-800/80 rounded-[2.5rem] p-8 sm:p-12 text-center shadow-2xl shadow-black/80 border-t-4 border-t-teal-500 flex flex-col items-center">
          
          {/* Glowing Icon Container */}
          <div className="relative mb-6 sm:mb-8">
            <div className="absolute inset-0 bg-teal-500/20 rounded-2xl blur-xl scale-125 animate-pulse" />
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10 border border-teal-500/30 flex items-center justify-center shadow-inner">
              <ShieldAlert className="w-8 h-8 sm:w-10 sm:h-10 text-teal-400" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-neutral-50 font-display">
            <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
              {heading}
            </span>
          </h1>

          {/* Divider */}
          <div className="w-16 h-1 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full my-6 opacity-60" />

          {/* Message */}
          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed font-medium whitespace-pre-wrap max-w-md">
            {message}
          </p>

          {/* Status Badge */}
          <div className="mt-8 px-4 py-2 bg-neutral-950/60 border border-neutral-800 rounded-full text-xs font-bold text-teal-400 tracking-wider uppercase inline-flex items-center gap-2 shadow-inner">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-ping" />
            System Under Maintenance
          </div>
        </div>
      </div>
    </div>
  );
}
