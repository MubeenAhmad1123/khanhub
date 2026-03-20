interface StructuredDataProps {
    type?: 'Organization' | 'JobPosting' | 'BreadcrumbList' | 'WebSite';
    data?: any;
}

export default function StructuredData({ type = 'Organization', data }: StructuredDataProps) {
    const organizationJsonLd = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "KhanHub",
        "url": "https://job.khanhub.com.pk",
        "logo": "https://job.khanhub.com.pk/logo.webp",
        "description": "KhanHub is Pakistan's #1 Video Job Platform. Find jobs, hire talent, and grow your career through short video profiles.",
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "Islamabad",
            "addressCountry": "PK"
        },
        "sameAs": []
    };

    const websiteJsonLd = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "KhanHub",
        "url": "https://job.khanhub.com.pk",
        "potentialAction": {
            "@type": "SearchAction",
            "target": "https://job.khanhub.com.pk/explore?q={search_term_string}",
            "query-input": "required name=search_term_string"
        }
    };

    const breadcrumbJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": data?.items?.map((item: any, index: number) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.name,
            "item": `https://jobs.khanhub.com${item.path}`
        }))
    };

    let schema: any = organizationJsonLd;

    if (type === 'WebSite') {
        schema = websiteJsonLd;
    } else if (type === 'BreadcrumbList' && data?.items) {
        schema = breadcrumbJsonLd;
    } else if (data) {
        schema = {
            "@context": "https://schema.org",
            "@type": type,
            ...data
        };
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}
