export default function StructuredData() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": "Software Engineer", // This should be dynamic on job pages, but for home we can use Organization or JobBoard
        "description": "Find the best jobs in Pakistan on KhanHub.",
        "hiringOrganization": {
            "@type": "Organization",
            "name": "KhanHub",
            "sameAs": "https://jobs.khanhub.com",
            "logo": "https://jobs.khanhub.com/logo.webp"
        }
    };

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

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
    );
}
