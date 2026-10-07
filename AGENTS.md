# AGENTS.md

Guidance for anyone changing this repo, human or AI. Setup and scripts are in [README.md](README.md); visual and
motion rules are in [DESIGN.md](DESIGN.md). Read both before larger changes.

## Project

- solislab.com: a one-page static marketing site for Solis Lab, an engineering partner for digital agencies.
- Astro 7, `output: 'static'`, TypeScript strict. No UI framework, no CSS framework, no runtime dependencies besides
  Astro.
- The hero is a hand-written WebGL particle stage (`src/scripts/stage/`), not three.js.

## Commands

- `pnpm dev`, `pnpm build`, `pnpm preview`
- `pnpm lint` (ESLint with `--fix`), `pnpm check` (`astro check`), `pnpm format` (Prettier)
- Before you finish a change, run `pnpm lint`, `pnpm check` and `pnpm build`. All three must pass.

## Content rules (most important)

- Copy is taken word for word from the previous solislab.com. Do not rewrite, "improve" or invent copy, headings,
  claims, numbers, tech stacks, client names or testimonials. Any new or changed copy needs the site owner's approval.
- All copy (headings, paragraphs, lists) lives in `src/data/*.ts`. Components render data; do not hard-code copy in
  them. Short interface labels (button text, the job posting's field headings, alt text) stay in the component.
- Section ids `what-we-do`, `schedule`, `values`, `careers` and `contact` match the old site's anchors. Keep them, so
  existing links still work.

## Code conventions

- Path alias `@/` maps to `src/`. Use it for imports.
- Descriptive names everywhere. No cryptic short names (`btn`, `svc`, `cur`, `k`, `t2`).
- CSS classes: kebab-case. State classes use `is-*` (`is-open`, `is-visible`). Scripts find elements by id or
  `data-*` attributes (`data-copy`, `data-clock`, `data-vimeo`, `data-cursor`).
- Styles: each component owns a scoped `<style>`. `global.css` holds only tokens, base element styles and the shared
  layout classes (`.section`, `.split`, `.gutter`...). Elements created by scripts need `:global(...)` selectors.
- Use the tokens in `global.css` (colors, fonts, `--ease`, layout spacing). Do not add raw hex values or new fonts.
- Styles are mobile-first: base styles for phones, then `@media (min-width: ...)`.
- Leave a blank line between CSS rule blocks.
- Client scripts are ES modules in `src/scripts/` exporting an `init*()` function, imported from the owning
  component's `<script>`.
- Comments explain why, not what. Do not add comments that repeat the code.
- Prettier formats everything (single quotes in JSX attributes too). Do not hand-format against it.

## Coupling to watch

Scripts depend on these hooks. Renaming one breaks behaviour silently, without a build error:

- Stage: `#stage`, `#sun`, `#site-header`, `#what-we-do`, `#values`, `#careers`, `#marquee-track`, `.value`,
  `.value-number`
- Globe markets: `#globe-pins`, `.globe-pin`, `.globe-pin-label`, `.globe-arc`, `[data-studio]`, and the
  `data-longitude` and `data-latitude` attributes
- Footer game: `#site-footer`, `#footer-logo`, `#footer-planet`, `#footer-sun`, and the letter paths in `#footer-logo g`
- Header nav: `.nav-links` links point at section ids; `src/scripts/nav.ts` marks the current one
- Others: `#toast`, `.accordion`, `.accordion-trigger`, `[data-copy]`, `[data-clock]`, `[data-vimeo]`
- Cursor: when you add an element with a yellow (sun) fill, add it to `LIGHT_FILL_SELECTOR` in
  `src/scripts/cursor.ts`, so the cursor dot stays visible over it.
- `GLOBE_PITCH` and `FOCAL_LENGTH` in `src/scripts/stage/globe-pins.ts` follow the globe's `rotateX` pitch and
  `GLOBE_FOCAL` in `src/scripts/stage/shaders.ts`. Change both together, or the pins drift off their places.
- `MAX_CONTENT_WIDTH` in `src/scripts/stage/scene.ts` follows `--maxw` plus the gutters in `global.css`. Change both
  together.

## Tooling gotchas

- pnpm only. `pnpm-workspace.yaml` sets `minimumReleaseAge: 1440`, so package versions published in the last 24 hours
  are refused. That is on purpose.
- TypeScript stays on 6.x: 7 breaks peer dependencies.
- `eslint.config.js` and `prettier.config.js` stay `.js`. A `.ts` ESLint config needs `jiti`, and `astro check`
  fails on a `.ts` Prettier config because the shared config package has no types.
- `astro:*` imports are virtual modules, so ESLint's `import-x/no-unresolved` ignores them on purpose.
- `pnpm build` downloads the fonts from Google on the first run, so it needs network access.
- Do not skip the pre-commit hook (`--no-verify`).

## Performance and accessibility

- Lighthouse mobile scores 98 to 100. Keep it there. The main risk is the stage's scene build on the main thread:
  no `sort(() => Math.random() - 0.5)`, no spreads or `push(...big)` over large arrays, and write typed arrays by
  index.
- Every animation needs a `prefers-reduced-motion: reduce` path (see DESIGN.md).
- The page must work without JavaScript (the `noscript` logotype) and without WebGL (`.no-gl`).
- Keep one `h1`, labelled sections (`aria-labelledby`), visible focus states, alt text on images and correct `aria`
  state on interactive widgets.

## Dependencies

- Ask before adding any dependency. Three.js, GSAP, Tailwind, Vimeo embed libraries and SEO helper packages were
  considered and rejected as not worth their weight for one page.

## Verifying changes

For anything visible, check the change in a browser on the production build (`pnpm build && pnpm preview`):

- desktop (1440px) and phone (390px), with no horizontal scroll on the phone
- with reduced motion emulated
- no console errors
- the flows you touched, clicked through end to end (accordion, copy buttons, video, cursor, footer game)

## Git

- Conventional Commits in one line (`feat: ...`, `fix: ...`).
- Never commit secrets or `.env` files.
- Personal agent notes (for example `.scratch/`) stay out of the repo.
