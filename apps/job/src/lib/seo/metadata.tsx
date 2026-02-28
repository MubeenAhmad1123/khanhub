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
    const baseTitle = 'KhanHub Jobs | Pakistan\'s #1 Job Portal';
    const finalTitle = title ? `${title} | KhanHub Jobs` : baseTitle;
    const baseDescription = 'Find your dream job in Pakistan. AI-powered job matching, verified employers, and instant applications.';
    const finalDescription = description || baseDescription;
    const baseKeywords = ['jobs', 'pakistan', 'careers', 'hiring', 'employment', 'khanhub'];
    const finalKeywords = keywords ? [...baseKeywords, ...keywords] : baseKeywords;

    return {
        title: finalTitle,
        description: finalDescription,
        keywords: finalKeywords,
        authors: [{ name: 'KhanHub Team' }],
        creator: 'KhanHub',
        publisher: 'KhanHub',
        metadataBase: new URL('https://jobs.khanhub.com'),
        alternates: {
            canonical: canonicalUrlRelative || '/',
        },
        openGraph: {
            title: finalTitle,
            description: finalDescription,
            url: `https://jobs.khanhub.com${canonicalUrlRelative}`,
            siteName: 'KhanHub Jobs',
            images: [
                {
                    url: image,
                },
            ],
            locale: 'en_US',
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: finalTitle,
            description: finalDescription,
            images: [image],
        },
        icons: {
            icon: '/logo.webp',
            apple: '/logo.webp',
        },
        ...(noIndex && {
            robots: {
                index: false,
                follow: false,
            },
        }),
    };
}
