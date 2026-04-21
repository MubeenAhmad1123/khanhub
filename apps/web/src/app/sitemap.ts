import { MetadataRoute } from 'next';
import { DEPARTMENTS } from '@/data/departments';
import { SITE } from '@/data/site';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = SITE.url || 'https://khanhub.com.pk';

    // Specific pages
    const routes = [
        '',
        '/about',
        '/certificates',
        '/contact',
        '/donate',
        '/emergency',
        '/departments',
        '/media',
        '/success-stories',
        '/whatsapp',
        '/privacy-policy',
        '/terms',
        '/auth/signin',
        '/app-download',
        '/affiliate',
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

    // Dynamic program pages (only those with defined slugs)
    const programRoutes = DEPARTMENTS.flatMap((dept) => {
        if (!Array.isArray(dept.programs)) return [];
        return (dept.programs as any[])
            .filter(p => typeof p === 'object' && p !== null && p.slug)
            .map((program) => ({
                url: `${baseUrl}/departments/${dept.slug}/${program.slug}`,
                lastModified: new Date(),
                changeFrequency: 'weekly' as const,
                priority: 0.6,
            }));
    });

    // Sub-department courses (e.g. Institute and Rehab courses)
    const courseRoutes = DEPARTMENTS.flatMap((dept) => {
        if (!Array.isArray(dept.subDepartments)) return [];
        return dept.subDepartments.flatMap(sub => {
            if (!Array.isArray(sub.courses)) return [];
            return sub.courses
                .filter(course => course && course.slug)
                .map(course => ({
                    url: `${baseUrl}/departments/${dept.slug}/${course.slug}`,
                    lastModified: new Date(),
                    changeFrequency: 'weekly' as const,
                    priority: 0.6,
                }));
        });
    });

    return [...routes, ...departmentRoutes, ...programRoutes, ...courseRoutes];
}
