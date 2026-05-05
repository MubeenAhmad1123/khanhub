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
    <div className={`flex flex-col items-center justify-center gap-6 ${className}`}>
      <div className={`${currentSize.box} relative flex items-center justify-center`}>
        {/* Blue Circular Loader Line */}
        <div className="absolute -inset-1 border-2 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
        
        {/* Still Logo Container */}
        <div className="w-full h-full relative rounded-full overflow-hidden flex items-center justify-center bg-white/5 shadow-inner">
          <Image
            src="/logo-circle.webp"
            alt="Khan Hub Logo"
            width={currentSize.img}
            height={currentSize.img}
            className="w-full h-full object-contain p-1"
            priority
          />
          
          {/* Bright Shine Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -skew-x-45 animate-shine" />
        </div>
      </div>
      
      {showText && (
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] animate-pulse">
          Khan Hub Loading
        </p>
      )}
      
      <style jsx>{`
        @keyframes shine {
          0% { transform: translateX(-200%) skewX(-45deg); }
          20% { transform: translateX(200%) skewX(-45deg); }
          100% { transform: translateX(200%) skewX(-45deg); }
        }
        .animate-shine {
          animation: shine 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default LogoLoader;
