// src/app/affiliate/page.tsx

import AffiliatePageContent from './AffiliatePageContent';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Affiliate Program | KhanHub",
    description: "Join KhanHub's Affiliate Program. Refer patients, students, and job seekers to our departments and earn commissions. Help your community and earn at the same time.",
    keywords: ["KhanHub affiliate", "refer and earn Pakistan", "healthcare affiliate program", "rehab center referral commission"],
    openGraph: {
        title: "Affiliate Program | KhanHub",
        description: "Turn Your Network Into Impact — And Earn While You Help",
        images: [{ url: '/logo.webp' }],
    }
};

export default function AffiliatePage() {
    return <AffiliatePageContent />;
}
