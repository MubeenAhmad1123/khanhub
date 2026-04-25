'use client';

import React from 'react';
import Image from 'next/image';

interface LogoLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

const LogoLoader: React.FC<LogoLoaderProps> = ({ 
  size = 'md', 
  className = '',
  showText = true 
}) => {
  const sizeMap = {
    sm: { box: 'w-12 h-12', img: 32 },
    md: { box: 'w-20 h-20', img: 64 },
    lg: { box: 'w-32 h-32', img: 96 },
    xl: { box: 'w-48 h-48', img: 128 },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <div className={`${currentSize.box} relative perspective-1000`}>
        <div className="w-full h-full relative preserve-3d animate-flip-logo">
          <Image
            src="/logo-circle.webp"
            alt="Khan Hub Logo"
            width={currentSize.img}
            height={currentSize.img}
            className="w-full h-full object-contain drop-shadow-2xl"
            priority
          />
        </div>
      </div>
      {showText && (
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse">
          Loading...
        </p>
      )}
      
      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        @keyframes flip-logo {
          0% { transform: rotateY(0deg); }
          25% { transform: rotateY(180deg); }
          50% { transform: rotateY(180deg); }
          75% { transform: rotateY(360deg); }
          100% { transform: rotateY(360deg); }
        }
        .animate-flip-logo {
          animation: flip-logo 4s infinite cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
};

export default LogoLoader;
