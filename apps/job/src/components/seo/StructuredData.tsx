interface StructuredDataProps {
    type?: 'Organization' | 'JobPosting' | 'BreadcrumbList' | 'WebSite';
    data?: any;
}

export default function StructuredData({ type = 'Organization', data }: StructuredDataProps) {
    const organizationJsonLd = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "KhanHub Jobs",
        "url": "https://jobs.khanhub.com",
        "logo": "https://jobs.khanhub.com/logo.webp",
        "description": "Pakistan's leading job portal connecting talent with opportunity.",
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "Islamabad",
            "addressCountry": "PK"
        }
    };

    const websiteJsonLd = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "KhanHub Jobs",
        "url": "https://jobs.khanhub.com",
        "potentialAction": {
            "@type": "SearchAction",
            "target": "https://jobs.khanhub.com/browse?q={search_term_string}",
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
