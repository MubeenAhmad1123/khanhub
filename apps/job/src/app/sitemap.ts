import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://jobs.khanhub.com.pk';

    // In a real scenario, you would fetch job IDs and blog slugs here
    // For now, we'll provide the main static routes

    const routes = ['', '/feed', '/explore', '/categories', '/auth/login', '/auth/register'].map(
        (route) => ({
            url: `${baseUrl}${route}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: route === '' ? 1.0 : 0.8,
        })
    );

    return routes;
}
