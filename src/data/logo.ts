// Official logotype. Brand rule: the "o" is a planet and the i-dot its sun (bentographics).
export const LOGO_WIDTH = 140
export const LOGO_HEIGHT = 30.61
export const LOGO_VIEWBOX = `0 0 ${LOGO_WIDTH} ${LOGO_HEIGHT}`

// Letter paths in order: s, l, i stem, s ("solis" without the o) then l, a, b ("lab")
export const LOGO_LETTERS = [
  'M0 26.52l3.29-1.64A4.32 4.32 0 0 0 7.1 27c1.92 0 3-1 3-2.36s-1.6-2-3.93-3C2.85 20.35.92 18.75.92 15.75c0-3.61 2.77-6 6.46-6A6.59 6.59 0 0 1 13.31 13l-3.09 2.08a3.45 3.45 0 0 0-3-1.68 2.1 2.1 0 0 0-2.36 2.16c0 1.52 1.32 2 3.65 3 2.52 1 5.45 2.44 5.45 6s-2.65 6.09-6.78 6.09A8 8 0 0 1 0 26.52',
  'M38.23 30.21h4.09V0h-4.09v30.21z',
  'M47.45 30.21h4.1V10.18h-4.1v20.03z',
  'M55.15 26.52l3.29-1.64A4.32 4.32 0 0 0 62.25 27c1.92 0 3-1 3-2.36s-1.6-2-3.93-3c-3.29-1.28-5.21-2.88-5.21-5.89 0-3.61 2.77-6 6.45-6A6.6 6.6 0 0 1 68.47 13l-3.09 2.08a3.45 3.45 0 0 0-3-1.68A2.1 2.1 0 0 0 60 15.55c0 1.52 1.32 2 3.65 3 2.52 1 5.45 2.44 5.45 6s-2.65 6.09-6.78 6.09a8 8 0 0 1-7.22-4.08',
  'M84.45 30.21h4.09V0h-4.09v30.21z',
  'M109.77 20.19a6.54 6.54 0 1 0-6.54 6.53 6.53 6.53 0 0 0 6.54-6.53zm4-10v20h-4V28a9.87 9.87 0 0 1-6.78 2.64 10.42 10.42 0 0 1 0-20.83 9.77 9.77 0 0 1 6.73 2.64v-2.24z',
  'M135.95 20.19a6.54 6.54 0 1 0-6.53 6.53 6.51 6.51 0 0 0 6.53-6.53zm4.05 0a10.31 10.31 0 0 1-10.27 10.41A9.87 9.87 0 0 1 123 28v2.25h-4.09V0H123v12.42a9.87 9.87 0 0 1 6.78-2.64A10.31 10.31 0 0 1 140 20.19z'
]

// The lit half of the "o" and the i-dot, both in sun yellow
export const LOGO_O_PATH = 'M33.95 19.54a10.43 10.43 0 0 0-15.83-8.21l11.72 17.2a10.4 10.4 0 0 0 4.11-8.99z'
export const LOGO_DOT_PATH = 'M52 2.54A2.55 2.55 0 1 1 49.5 0 2.55 2.55 0 0 1 52 2.54'

export const O_CENTER: [number, number] = [23.98, 19.93]
export const O_RADIUS = 10.42
export const DOT_CENTER: [number, number] = [49.45, 2.54]
export const DOT_RADIUS = 2.55
