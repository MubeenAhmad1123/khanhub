import { Metadata } from 'next';
import FranchisePageContent from './FranchisePageContent';

export const metadata: Metadata = {
    title: 'Franchise Opportunities | Khan Hub',
    description: 'Join Khan Hub as a franchise partner. Explore opportunities across our medical, educational, and professional departments at competitive rates.',
    keywords: ['Khan Hub franchise', 'business opportunities Pakistan', 'healthcare franchise', 'education franchise', 'Khan Hub partnership'],
};

export default function FranchisePage() {
    return <FranchisePageContent />;
}
