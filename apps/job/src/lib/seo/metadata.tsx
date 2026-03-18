import { Metadata } from 'next';

interface SEOProps {
    title?: string;
    description?: string;
    keywords?: string[];
    image?: string;
    noIndex?: boolean;
    canonicalUrlRelative?: string;
}

export function constructMetadata({
    title,
    description,
    keywords,
    image = '/logo.webp',
    noIndex = false,
    canonicalUrlRelative = '',
}: SEOProps = {}): Metadata {
    const baseTitle = 'KHAN HUB | Pakistan\'s Video-First Connection Platform';
    const finalTitle = title ? `${title} | KHAN HUB` : baseTitle;
    const baseDescription = 'Pakistan\'s first video-first connection platform. Bridging Jobs, Healthcare, Education, Marriage, Domestic Help, Legal, Real Estate, and IT & Tech. Scroll. Watch. Connect.';
    const finalDescription = description || baseDescription;
    const baseKeywords = [
        'khan hub', 'video jobs', 'pakistan hiring', 'doctors pakistan', 'teachers pakistan', 'rishta pakistan', 
        'real estate pakistan', 'it freelancers', 'ملازمت', 'پاکستان میں نوکریاں', 'اردو ریسٹہ', 'ڈاکٹر پاکستان'
    ];
    const finalKeywords = keywords ? [...baseKeywords, ...keywords] : baseKeywords;

    return {
        title: finalTitle,
        description: finalDescription,
        keywords: finalKeywords,
        authors: [{ name: 'KhanHub Team' }],
        creator: 'KhanHub',
        publisher: 'KhanHub',
        applicationName: 'KhanHub',
        category: 'Professional Services',
        referrer: 'origin-when-cross-origin',
        metadataBase: new URL('https://jobs.khanhub.com'),
        alternates: {
            canonical: canonicalUrlRelative || '/',
        },
        openGraph: {
            title: finalTitle,
            description: finalDescription,
            url: `https://jobs.khanhub.com${canonicalUrlRelative}`,
            siteName: 'KHAN HUB',
            images: [
                {
                    url: image,
                    width: 1200,
                    height: 630,
                    alt: finalTitle,
                },
            ],
            locale: 'en_US',
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: finalTitle,
            description: finalDescription,
            creator: '@KhanHub',
            images: [image],
        },
        icons: {
            icon: '/logo.webp',
            apple: '/logo.webp',
        },
        verification: {
            google: 'google-site-verification-placeholder',
            yandex: 'yandex-verification-placeholder',
        },
        ...(noIndex && {
            robots: {
                index: false,
                follow: false,
            },
        }),
    };
}
