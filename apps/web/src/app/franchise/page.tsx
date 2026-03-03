import { Metadata } from 'next';
import FranchisePageContent from './FranchisePageContent';

export const metadata: Metadata = {
    title: 'Franchise Opportunities | KhanHub',
    description: 'Join KhanHub as a franchise partner. Explore opportunities across our medical, educational, and professional departments at competitive rates.',
    keywords: ['KhanHub franchise', 'business opportunities Pakistan', 'healthcare franchise', 'education franchise', 'KhanHub partnership'],
};

export default function FranchisePage() {
    return <FranchisePageContent />;
}
