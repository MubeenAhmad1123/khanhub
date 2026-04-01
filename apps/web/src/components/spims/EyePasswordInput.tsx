'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface EyePasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function EyePasswordInput({
  label,
  className,
  ...props
}: EyePasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="relative">
      {label && (
        <label
          htmlFor={props.id}
          className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-1 ml-2"
        >
          {label}
        </label>
      )}
      <input
        type={showPassword ? 'text' : 'password'}
        className={`w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all ${className}`}
        {...props}
      />
      <div
        className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer transition-transform duration-200 ease-in-out transform hover:scale-110"
        onClick={togglePasswordVisibility}
      >
        {showPassword ? (
          <EyeOff size={20} className="text-gray-500 transition-opacity duration-200 ease-in-out opacity-70 hover:opacity-100" />
        ) : (
          <Eye size={20} className="text-gray-500 transition-opacity duration-200 ease-in-out opacity-70 hover:opacity-100" />
        )}
      </div>
    </div>
  );
}
