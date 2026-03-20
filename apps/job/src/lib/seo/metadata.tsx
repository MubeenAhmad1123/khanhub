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
    const baseTitle = 'KhanHub — Pakistan\'s #1 Video Job Platform';
    const finalTitle = title ? `${title} | KhanHub` : baseTitle;
    const baseDescription = 'Find jobs, hire talent, and grow your career through short video profiles. Healthcare, Tech, Education, Real Estate and more across Pakistan.';
    const finalDescription = description || baseDescription;
    const baseKeywords = ['jobs in pakistan', 'job search pakistan', 'hire talent pakistan', 'video resume pakistan', 'healthcare jobs pakistan', 'tech jobs pakistan'];
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
        metadataBase: new URL('https://job.khanhub.com.pk'),
        alternates: {
            canonical: canonicalUrlRelative || 'https://job.khanhub.com.pk',
        },
        openGraph: {
            title: finalTitle,
            description: finalDescription,
            url: `https://job.khanhub.com.pk${canonicalUrlRelative}`,
            siteName: 'KhanHub',
            images: [
                {
                    url: image,
                    width: 1200,
                    height: 630,
                    alt: finalTitle,
                },
            ],
            locale: 'en_PK',
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
        robots: {
            index: !noIndex,
            follow: !noIndex,
        },
    };
}
