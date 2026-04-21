// src/app/affiliate/page.tsx

import AffiliatePageContent from './AffiliatePageContent';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Affiliate Program | Khan Hub",
    description: "Join Khan Hub's Affiliate Program. Refer patients, students, and job seekers to our departments and earn commissions. Help your community and earn at the same time.",
    keywords: ["Khan Hub affiliate", "refer and earn Pakistan", "healthcare affiliate program", "rehab center referral commission"],
    openGraph: {
        title: "Affiliate Program | Khan Hub",
        description: "Turn Your Network Into Impact — And Earn While You Help",
        images: [{ url: '/logo.webp' }],
    }
};

export default function AffiliatePage() {
    return <AffiliatePageContent />;
}
