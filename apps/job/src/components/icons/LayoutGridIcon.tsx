'use client';

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface LayoutGridIconProps {
 size?: number;
 className?: string;
}

export function LayoutGridIcon({ size = 24, className }: LayoutGridIconProps) {
  return (
    <motion.div
      className={cn("inline-flex items-center justify-center", className)}
      whileHover={{ scale: 1.1 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="7" height="7" x="3" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="14" rx="1" />
        <rect width="7" height="7" x="3" y="14" rx="1" />
      </svg>
    </motion.div>
  );
}
