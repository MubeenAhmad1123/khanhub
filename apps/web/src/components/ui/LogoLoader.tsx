'use client';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

export default function LogoLoader({ size = 'md', className, showText = true }: LogoLoaderProps) {
  const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
    xl: 'w-32 h-32',
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 py-8", className)}>
      <div className={cn(sizeMap[size], "relative animate-logo-flip")}>
        <Image
          src="/logo-circle.webp"
          alt="Loading..."
          fill
          className="object-contain"
          priority
        />
      </div>
      {showText && (
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 animate-pulse">
          Loading...
        </p>
      )}
    </div>
  );
}
