import { defineConfig, fontProviders } from 'astro/config'

export default defineConfig({
  site: 'https://solislab.com',
  output: 'static',
  // Downloaded from Google at build time and served from this site
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Jost',
      cssVariable: '--font-jost',
      weights: ['300 800'],
      subsets: ['latin'],
      fallbacks: ['Futura', 'Century Gothic', 'sans-serif']
    },
    {
      provider: fontProviders.google(),
      name: 'Geist Mono',
      cssVariable: '--font-geist-mono',
      weights: [400, 500],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'Menlo', 'monospace']
    }
  ]
})
