import { MetadataRoute } from 'next';
import { SITE } from '@/data/site';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = SITE.url || 'https://khanhub.com.pk';

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/dashboard/', '/profile/', '/auth/'],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
