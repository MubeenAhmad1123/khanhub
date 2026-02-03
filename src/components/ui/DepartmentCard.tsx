// src/components/ui/DepartmentCard.tsx - ENHANCED VERSION

'use client'

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Department } from '@/types/department';

interface DepartmentCardProps {
    department: Department;
    index?: number; // For staggered animations
}

export default function DepartmentCard({ department, index = 0 }: DepartmentCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
        >
            <Link
                href={`/departments/${department.slug}`}
                className="group block h-full"
                aria-label={`Learn more about ${department.name}`}
            >
                <article className="relative h-full bg-white border-2 border-neutral-200 rounded-2xl overflow-hidden transition-all duration-500 hover:border-primary-400 hover:shadow-2xl hover:shadow-primary-500/20 hover:-translate-y-2">

                    {/* Image Header */}
                    <div className="relative h-52 w-full overflow-hidden bg-gradient-to-br from-primary-50 to-success-50">
                        {department.image ? (
                            <>
                                <Image
                                    src={department.image}
                                    alt={`${department.name} - ${department.category}`}
                                    fill
                                    className="object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                    loading="lazy"
                                />

                                {/* Gradient overlay - subtle always, stronger on hover */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent group-hover:from-black/60 group-hover:via-black/30 transition-all duration-500" />
                            </>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-7xl transition-transform duration-500 group-hover:scale-110">
                                {department.icon}
                            </div>
                        )}

                        {/* Category Badge */}
                        <motion.div
                            className="absolute top-4 right-4"
                            whileHover={{ scale: 1.05 }}
                            transition={{ type: "spring", stiffness: 400 }}
                        >
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-white/95 backdrop-blur-sm text-neutral-800 border border-white/30 shadow-lg">
                                {department.category}
                            </span>
                        </motion.div>

                        {/* Shimmer Effect on Hover */}
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="relative p-6 flex flex-col">

                        {/* Floating Icon Badge */}
                        <motion.div
                            className="absolute -top-6 left-6 w-14 h-14 rounded-xl bg-white border-2 border-white shadow-xl flex items-center justify-center text-2xl transition-all duration-500 group-hover:shadow-2xl group-hover:border-primary-200"
                            whileHover={{
                                scale: 1.15,
                                rotate: [0, -5, 5, 0],
                                transition: { duration: 0.5 }
                            }}
                        >
                            <span className="transition-transform duration-500 group-hover:scale-110">
                                {department.icon}
                            </span>

                            {/* Glow effect behind icon on hover */}
                            <div className="absolute inset-0 rounded-xl bg-primary-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
                        </motion.div>

                        {/* Title */}
                        <h3 className="text-xl font-bold text-neutral-900 mb-2 mt-10 group-hover:text-primary-600 transition-colors duration-300 line-clamp-2 font-display">
                            {department.name}
                        </h3>

                        {/* Description */}
                        <p className="text-neutral-600 text-sm mb-4 line-clamp-3 flex-grow leading-relaxed">
                            {department.description}
                        </p>

                        {/* Stats/Features with hover effect */}
                        {department.stats && department.stats.length > 0 && (
                            <div className="grid grid-cols-2 gap-4 mb-5 pb-5 border-b border-neutral-200">
                                {department.stats.slice(0, 2).map((stat, idx) => (
                                    <motion.div
                                        key={idx}
                                        className="text-center p-2 rounded-lg transition-all duration-300 group-hover:bg-primary-50"
                                        whileHover={{ scale: 1.05 }}
                                    >
                                        <div className="text-xl font-bold text-primary-600 font-display transition-all duration-300 group-hover:text-primary-700">
                                            {stat.value}
                                        </div>
                                        <div className="text-xs text-neutral-600 font-medium">
                                            {stat.label}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Key Services Tags with improved styling */}
                        {department.services && department.services.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-5">
                                {department.services.slice(0, 3).map((service, idx) => (
                                    <motion.span
                                        key={idx}
                                        className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-50 text-neutral-700 border border-neutral-200 transition-all duration-300 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700"
                                        whileHover={{ scale: 1.05 }}
                                        transition={{ type: "spring", stiffness: 400 }}
                                    >
                                        <svg className="w-3 h-3 mr-1.5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        {typeof service === 'string' ? service : service.title}
                                    </motion.span>
                                ))}
                                {department.services.length > 3 && (
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-50 text-primary-600 border border-primary-100">
                                        +{department.services.length - 3} more
                                    </span>
                                )}
                            </div>
                        )}

                        {/* CTA Link with improved design */}
                        <div className="flex items-center justify-between mt-auto pt-5 border-t border-neutral-200 group-hover:border-primary-200 transition-colors duration-300">
                            <span className="text-sm font-semibold text-primary-600 group-hover:text-primary-700 transition-colors flex items-center gap-2">
                                Learn More
                                <svg
                                    className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-2"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2.5}
                                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                                    />
                                </svg>
                            </span>

                            {/* Enhanced Status Indicator */}
                            {department.isActive !== false && (
                                <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-success-50 border border-success-200">
                                    <motion.div
                                        className="w-2 h-2 bg-success-500 rounded-full"
                                        animate={{
                                            scale: [1, 1.2, 1],
                                            opacity: [1, 0.7, 1]
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                    />
                                    <span className="text-xs font-medium text-success-700">Active</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Enhanced Corner Accent with Glow */}
                    <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-primary-500/10 via-success-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-tl-full blur-2xl" />

                    {/* Top Corner Accent */}
                    <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-success-500/10 via-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-br-full blur-2xl" />

                    {/* Subtle Border Glow on Hover */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary-500/20 via-success-500/20 to-primary-500/20 blur-xl" />
                    </div>
                </article>
            </Link>
        </motion.div>
    );
}