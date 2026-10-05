# solislab.com

The Solis Lab website: a one-page static site built with [Astro](https://astro.build). A WebGL particle stage draws the
Solis Lab logotype in the hero and morphs it into a globe and a wave field as the page scrolls.

- Design and brand rules: [DESIGN.md](DESIGN.md)
- Conventions for contributors and AI coding tools: [AGENTS.md](AGENTS.md)

## Requirements

- Node 26 or newer (`.nvmrc` pins 26.8.2; run `nvm use`)
- pnpm 12 (pinned in `packageManager`; `corepack enable` picks it up). npm and yarn are blocked by a preinstall check.

## Getting started

```sh
nvm use
corepack enable
pnpm install   # also installs the git hooks
pnpm dev       # http://localhost:4321
```

## Scripts

| Command        | What it does                                        |
| -------------- | --------------------------------------------------- |
| `pnpm dev`     | Start the dev server with hot reload                |
| `pnpm build`   | Build the static site into `dist/`                  |
| `pnpm preview` | Serve `dist/` locally to check the production build |
| `pnpm check`   | Type-check `.astro` and `.ts` files (`astro check`) |
| `pnpm lint`    | Run ESLint and fix what it can                      |
| `pnpm format`  | Format the whole repo with Prettier                 |

The pre-commit hook runs Prettier and ESLint on staged files, then `astro check`. A commit fails if any of them fail.

## Project structure

```text
public/                 Static files served as-is (favicon, og.jpg, logo.svg, pre-sized images/)
src/
  pages/                index.astro (the page), robots.txt.ts and sitemap.xml.ts (generated from `site`)
  layouts/              BaseLayout.astro: <head>, SEO meta, JSON-LD, fonts, global UI
  components/sections/  One component per page section, in page order
  components/ui/        Reusable pieces (Button, AccordionItem, Stage, Cursor, Toast...)
  data/                 All page copy and contact details, as typed TypeScript
  scripts/              Client-side behaviour (accordion, copy, clock, cursor, footer game, video)
  scripts/stage/        The WebGL particle stage (scene, shaders, render loop)
  styles/global.css     Design tokens, base styles and the few shared layout classes
```

## Editing content

All text on the page lives in `src/data/` (`site.ts`, `services.ts`, `values.ts`, `jobs.ts`, `contact.ts`). Change the
data, not the components. Copy comes from the previous solislab.com and is kept word for word: get approval from the
site owner before changing or adding copy.

## Fonts

Jost and Geist Mono are downloaded from Google Fonts at build time by Astro's Fonts API (`astro.config.ts`) and served
from this site, so the page makes no requests to Google. The first build needs network access; later builds use the
cache.

## Deployment

`pnpm build` outputs a fully static site in `dist/` that any static host can serve. The production URL is set in
`astro.config.ts` (`site`), which canonical URLs, Open Graph tags, `robots.txt` and `sitemap.xml` are built from.
