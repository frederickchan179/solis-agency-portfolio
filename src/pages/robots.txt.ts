import type { APIRoute } from 'astro'

// Built from `site` in astro.config.ts so the domain lives in one place
export const GET: APIRoute = ({ site }) => {
  const sitemapUrl = new URL('/sitemap.xml', site).href

  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  })
}
