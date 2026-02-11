'use client';

import Link from 'next/link';
import { User, MapPin, Briefcase, Star } from 'lucide-react';

interface CandidateCardProps {
    candidate: {
        userId: string;
        name: string;
        email: string;
        skills: string[];
        location?: string;
        yearsOfExperience?: number;
        matchScore: number;
        matchReasons: string[];
    };
}

export default function CandidateCard({ candidate }: CandidateCardProps) {
    const matchColor = candidate.matchScore >= 70 ? 'green' : candidate.matchScore >= 50 ? 'blue' : 'yellow';

    return (
        <Link
            href={`/employer/candidates/${candidate.userId}`}
            className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 hover:scale-105 relative overflow-hidden border border-gray-100"
        >
            {/* Match Score Badge */}
            <div className="absolute top-4 right-4">
                <div className={`
                    ${matchColor === 'green' ? 'bg-green-500' : matchColor === 'blue' ? 'bg-blue-500' : 'bg-yellow-500'}
                    text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg
                `}>
                    {candidate.matchScore}% Match
                </div>
            </div>

            {/* Candidate Info */}
            <div className="flex items-start gap-4 mb-4 pr-20">
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <User className="h-6 w-6 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-gray-900 mb-1 truncate">{candidate.name}</h3>
                    <p className="text-gray-600 text-sm truncate">{candidate.email}</p>
                </div>
            </div>

            {/* Match Reasons */}
            {candidate.matchReasons.length > 0 && (
                <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                        {candidate.matchReasons.slice(0, 2).map((reason, idx) => (
                            <span
                                key={idx}
                                className="text-xs bg-teal-50 text-teal-700 px-2 py-1 rounded-full"
                            >
                                ✓ {reason}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Details */}
            <div className="space-y-2 text-sm text-gray-600">
                {candidate.location && (
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{candidate.location}</span>
                    </div>
                )}
                {candidate.yearsOfExperience !== undefined && (
                    <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 flex-shrink-0" />
                        <span>{candidate.yearsOfExperience} years experience</span>
                    </div>
                )}
                {candidate.skills.length > 0 && (
                    <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{candidate.skills.slice(0, 3).join(', ')}</span>
                    </div>
                )}
            </div>

            {/* View Profile Button */}
            <div className="mt-4 pt-4 border-t border-gray-100">
                <button className="w-full bg-teal-600 text-white py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm">
                    View Full Profile
                </button>
            </div>
        </Link>
    );
}
