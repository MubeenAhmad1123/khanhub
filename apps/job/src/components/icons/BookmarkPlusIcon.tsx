'use client';

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface BookmarkPlusIconProps {
 size?: number;
 className?: string;
}

export function BookmarkPlusIcon({ size = 24, className }: BookmarkPlusIconProps) {
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
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
        <line x1="12" x2="12" y1="7" y2="13" />
        <line x1="15" x2="9" y1="10" y2="10" />
      </svg>
    </motion.div>
  );
}
