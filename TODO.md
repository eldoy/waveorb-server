// Don't want to build sitemap on deploy

// Want to build sitemap in persistent location:
// /root/apps/firmalisten/data

// Need nginx to point to that location

sitemap: false,
sitemapdir: '/root/apps/firmalisten/data' || '/root/apps/firmalisten/current/dist'

npm run sitemap can then read the sitemapdir in production

