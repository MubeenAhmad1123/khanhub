import { MetadataRoute } from 'next';
import { DEPARTMENTS } from '@/data/departments';
import { SITE } from '@/data/site';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = SITE.url || 'https://khanhub.com.pk';

    // Specific pages
    const routes = [
        '',
        '/about',
        '/contact',
        '/donate',
        '/emergency',
        '/departments',
        '/media',
        '/app-download',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: route === '' ? 1 : 0.8,
    }));

    // Dynamic department pages
    const departmentRoutes = DEPARTMENTS.map((dept) => ({
        url: `${baseUrl}/departments/${dept.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
    }));

    return [...routes, ...departmentRoutes];
}
