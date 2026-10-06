import { contactCards, office } from '@/data/contact'
import { jobs } from '@/data/jobs'
import { services } from '@/data/services'
import { navLinks, site } from '@/data/site'
import { values } from '@/data/values'
import type { APIRoute } from 'astro'

// Built from the same data as the page, so it never drifts from the site copy
export const GET: APIRoute = ({ site: siteUrl }) => {
  const sectionUrl = (hash: string) => new URL(`/${hash}`, siteUrl).href
  const navLabel = (hash: string) => navLinks.find((link) => link.href === hash)?.label ?? ''

  const lines = [
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    `## [${navLabel('#what-we-do')}](${sectionUrl('#what-we-do')})`,
    '',
    ...services.map((service) => `- ${service.title}: ${service.text}`),
    '',
    `## [${navLabel('#values')}](${sectionUrl('#values')})`,
    '',
    ...values.map((value) => `- ${value.title}`),
    '',
    `## [${navLabel('#careers')}](${sectionUrl('#careers')})`,
    '',
    ...jobs.map((job) => `- ${job.title}`),
    '',
    `## [Get In Touch](${sectionUrl('#contact')})`,
    '',
    ...contactCards.map((card) => `- ${card.label}: ${card.links.map((link) => link.text).join(', ')}`),
    `- ${office.label}: ${office.address}`,
    ''
  ]

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
  })
}
