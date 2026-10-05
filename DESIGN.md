# DESIGN.md

The design rules for solislab.com. The real values live in code. This file explains how to use them and points to
where they are, so check the code when the two seem to disagree.

- Tokens: `src/styles/global.css` (`:root`)
- Fonts: `astro.config.ts`
- Stage motion constants: `src/scripts/stage/index.ts` and `src/scripts/stage/scene.ts`

## Concept

- The Solis Lab logo is the hero. The "o" is a planet, the dot of the "i" is its sun, and the bowls of "a" and "b"
  can turn into rings around the planet (the "key animation" from the brand guideline).
- A fixed WebGL particle stage sits behind the whole page. As the page scrolls it morphs from the logotype (hero) to a
  dotted world map globe (What We Do) to a wave field at sunrise (Values).
- The look is dark, technical and bold: navy night, one warm sun color, large uppercase type.
- The page should feel crafted, not templated. Avoid generic looks (purple gradients, glassmorphism cards, stock
  illustrations, emoji icons).

## Brand

- The brand identity is by Bento Graphics:
  https://bentographics.com/work/corporate-identity-design/solis-lab-web-development-agency/
- Draw the logo only from the official SVG paths (`public/logo.svg`, `src/data/logo.ts`). Never redraw, stretch,
  recolor outside the palette, or set it in a font.

## Color

| Token        | Value       | Use                                                              |
| ------------ | ----------- | ---------------------------------------------------------------- |
| `--night`    | `#000e1f`   | Page background, theme color                                     |
| `--navy`     | `#001e3f`   | Brand navy; text on sun-colored fills                            |
| `--dusk`     | `#03369c`   | Brand blue from the palette; not used yet                        |
| `--sun`      | `#fec321`   | The one accent: primary buttons, highlights, focus ring, the sun |
| `--sun-deep` | `#fbb116`   | Darker brand sun from the palette; not used yet                  |
| `--day`      | `#f3f6fb`   | Brand light, the fill when a solid button is hovered             |
| `--ink`      | `#f3f6fb`   | Body text                                                        |
| `--muted`    | `#93a6bf`   | Secondary text and labels                                        |
| `--line`     | 14% `--ink` | Hairlines and outlined buttons                                   |
| `--panel`    | 78% night   | Panels over the stage                                            |

- Keep the sun scarce. It marks what matters (the main call to action, a highlighted word, an open accordion item);
  if everything is yellow, nothing stands out.
- Text on `--sun` is always `--navy`.
- The page is dark only (`color-scheme: dark`). There is no light theme.

## Typography

- Display and body: Jost, a stand-in for the brand font Neue Einstellung (its web license is not checked yet).
- Labels, buttons and small technical text: Geist Mono.
- Both are self-hosted through Astro's Fonts API. Do not add fonts or load them from a CDN.

| Role               | Style                                                             |
| ------------------ | ----------------------------------------------------------------- |
| Hero `h1`          | Jost 600, `clamp(34px, 4.4vw, 72px)`, line-height 1               |
| Section title `h2` | Jost 700, `clamp(44px, 8.4vw, 136px)`, line-height 0.9, uppercase |
| Marquee            | Jost 700, `clamp(28px, 4.4vw, 64px)`                              |
| Lede               | `clamp(17px, 1.5vw, 22px)`, up to 52ch                            |
| Body               | Jost 400, 17px, line-height 1.6                                   |
| Label (`.label`)   | Geist Mono 500, 12px, uppercase, letter-spacing 0.14em, `--muted` |
| Button             | Geist Mono 600, 13px, uppercase, letter-spacing 0.08em            |

- Use `text-wrap: balance` on headings, and keep lines of text under about 52 characters.
- Use tabular numbers (`font-variant-numeric: tabular-nums`) for times and figures that change.

## Layout

- One content column, capped at `--maxw` (1600px) and centered on wide screens. `.gutter` sets the side padding
  (`--pad`, 16px to 56px).
- Sections share one two-column grid, `.split` (`--split`: 1.2fr / 1fr, gap `--gx`): the title on the left, the
  text and actions on the right. It stacks below 960px.
- Vertical rhythm: `.section` padding `clamp(64px, 8vw, 120px)`; spacing inside a section uses `--block`.
- Styles are mobile-first. CSS breakpoints in use: 760px, 860px (header nav), 960px (`.split`), 1100px (contact
  cards in three columns). The stage switches to its phone layout below 720px (`MOBILE_BREAKPOINT`).
- No horizontal scroll at any width. Check 390px.

## Components

- Header nav: the link of the section in the middle of the screen gets `aria-current` and a small sun dot.
- Buttons: pill shaped. Outlined by default; `.button-solid` (sun fill) only for the main action in a group. On hover
  a slanted sun panel wipes in from the left and the arrow nudges 4px to the right.
- Accordion (What We Do, open positions): the same slanted wipe on hover, a plus that turns into a sun-colored minus
  when open, and the panel opens by animating `grid-template-rows` while its content fades in a beat later. One row
  per list is open at a time. Opening a row scrolls the page, in step with the panel, until the row sits centred in
  the space below the header (a row taller than the screen starts just below it). The trigger keeps `aria-expanded`
  in sync.
- Custom cursor: a sun dot with a trailing ring, only on devices with a fine pointer and hover. States: link, label
  (`data-cursor="Play"`), orbit (over the hero logotype) and aim (footer game). Over sun-colored fills the dot turns
  navy. It is hidden in forced-colors mode.
- Values photos (mouse only): hovering a value row shows its photo in a small card above and to the right of the
  pointer. The card follows with a slight tilt and opens with the slanted wipe. Touch screens show no photos and do
  not download them. Photos keep the original site's blue duotone and are pre-sized WebP files in `public/images/`
  (Astro's image service would need `sharp` as a dependency).
- Lists and cards on phones: below 960px, list rows (value rows, accordion items) run to the screen edges, with their
  hairlines, `--panel` background and highlight sharing that edge and the text on the gutter. Cards (contact cards,
  the video) stay inside the gutter as boxes.
- Hover effects sit inside `@media (hover: hover)`, because on touch screens a tap leaves `:hover` stuck.
- Contact team photo: a full-width band above "Get in touch", faded into the page at the top and bottom; the title
  overlaps its faded lower edge. Pre-sized WebP like the values photos.
- Globe markets (960px and up): pins for the client markets in `src/data/markets.ts`, with arcs from the Ha Noi
  studio. A dash of sun travels along each arc in turn, and the studio pin sends out a slow ring. Pins fade toward
  the rim and past the screen edge; a label that would collide with another hides, and the studio's always stays.
  Pins sit at country centres, not client offices. The globe turns only while it shows and arrives with the studio
  facing the visitor. Below 960px the globe sits behind the copy, so it shows the map without pins.
- Footer: the large official logo. Its sun follows the pointer along the upper arc; a click fires the sun at a
  letter, and hitting all 7 letters plays a celebration.

## Motion

- Easing: `--ease` (`cubic-bezier(0.22, 1, 0.36, 1)`), a fast-out, soft-landing curve. Use it for all UI motion.
- Durations: about 0.3s for color and small shifts, 0.5 to 0.7s for wipes and panels, 1s for the hero entrance.
- Animate `transform`, `opacity` and `clip-path`. Avoid animating layout properties, except the accordion's
  `grid-template-rows`.
- Page load: the particles settle from slightly out of focus, left to right, over 1.6s (`INTRO_DURATION`). The sun's
  first orbit starts after 300ms and takes 3s (`SUN_INTRO`). The header fades down at 0.1s. The hero headline rises
  word by word: 1s each, starting at 0.25s, 70ms apart. The description, buttons and Hanoi time follow at 0.45s,
  0.6s and 0.75s (0.9s each). The description is the LCP element, so it fades from 10% opacity, never from 0:
  Chrome skips fully transparent text as an LCP candidate.
- Press feedback: buttons scale to 0.97 (copy buttons 0.94) while pressed.
- Hero: the sun orbits the planet on its own and a moving pointer steers it along the orbit. The key animation (rings
  docking round the planet) loops automatically until the visitor clicks the logotype, which toggles it by hand.
- Motion should feel calm and deliberate. When adding motion, prefer one clear move over several competing ones.

### Reduced motion

When `prefers-reduced-motion: reduce` is set, every new animation needs a reduced-motion version. Currently:

- Stage: no intro, no ambient sway, no automatic ring loop, no pointer or scroll distortion. It redraws only on
  scroll and resize.
- Globe markets: no travelling dash on the arcs and no studio ring.
- The values photo card sits at the pointer without trailing, tilt or wipe; photos only fade.
- Header and hero entrances, headline rise, marquee scroll, press scaling, button and accordion wipes and the
  accordion content's slide are off (the content still fades).
- The cursor ring follows the pointer directly, without trailing behind it. The footer game skips the letter
  knock and wave.
- Smooth scrolling is off.

## Accessibility

- Contrast: `--ink` and `--muted` on `--night`, and `--navy` on `--sun`, meet WCAG AA. Check any new color pair.
- Focus: a 2px `--sun` outline with a 3px offset (`:focus-visible`). Never remove it.
- A skip link to `#what-we-do` appears when focused with the keyboard.
- Decorative layers (the stage canvas, the sun glow, the globe markets, the footer logo) are `aria-hidden`.
- Fallbacks: without JavaScript (`noscript`) or without WebGL (`.no-gl`) the hero shows the static logotype.
- Touch targets: buttons are at least 44px tall.

## Performance budget

- Lighthouse mobile 98 to 100; local LCP well under 1.8s; CLS under 0.01.
- About 20KB of JS and CSS in total. Adding a library needs a strong reason (see AGENTS.md).
- The stage caps the device pixel ratio at 1.5 and builds its scene after the first paint.
