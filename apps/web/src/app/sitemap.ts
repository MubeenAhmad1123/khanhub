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

    // Dynamic program pages
    const programRoutes = DEPARTMENTS.flatMap((dept) => {
        if (Array.isArray(dept.programs)) {
            return (dept.programs as any[]).map((program) => ({
                url: `${baseUrl}/departments/${dept.slug}/${program.slug}`,
                lastModified: new Date(),
                changeFrequency: 'weekly' as const,
                priority: 0.6,
            }));
        }
        return [];
    });

    // Institute courses
    const courseRoutes = DEPARTMENTS
        .filter(dept => dept.slug === 'institute-health-sciences')
        .flatMap(dept => {
            return (dept.subDepartments || []).flatMap(sub => {
                return (sub.courses || []).map(course => ({
                    url: `${baseUrl}/departments/${dept.slug}/${course.slug}`,
                    lastModified: new Date(),
                    changeFrequency: 'weekly' as const,
                    priority: 0.6,
                }));
            });
        });

    return [...routes, ...departmentRoutes, ...programRoutes, ...courseRoutes];
}
