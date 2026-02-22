/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://www.khanhub.com.pk',
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/' },
    ],
  },
  exclude: ['/api/*'],
  changefreq: 'weekly',
  priority: 0.7,
}
