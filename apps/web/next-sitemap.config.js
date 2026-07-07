/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://khanhub.com.pk',
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/*',
          '/hq/*',
          '*/dashboard/*',
          '*/login'
        ]
      },
      {
        userAgent: 'GPTBot',
        allow: '/',
        disallow: ['/api/*', '/hq/*', '*/dashboard/*', '*/login']
      },
      {
        userAgent: 'ChatGPT-User',
        allow: '/',
        disallow: ['/api/*', '/hq/*', '*/dashboard/*', '*/login']
      },
      {
        userAgent: 'OAI-SearchBot',
        allow: '/',
        disallow: ['/api/*', '/hq/*', '*/dashboard/*', '*/login']
      },
      {
        userAgent: 'Google-Extended',
        allow: '/',
        disallow: ['/api/*', '/hq/*', '*/dashboard/*', '*/login']
      },
      {
        userAgent: 'ClaudeBot',
        allow: '/',
        disallow: ['/api/*', '/hq/*', '*/dashboard/*', '*/login']
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
        disallow: ['/api/*', '/hq/*', '*/dashboard/*', '*/login']
      }
    ],
  },
  exclude: [
    '/api/*',
    '/hq/*',
    '**/dashboard/**',
    '**/login'
  ],
  changefreq: 'weekly',
  priority: 0.7,
}
