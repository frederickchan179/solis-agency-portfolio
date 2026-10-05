// Where Solis Lab's clients are, pinned on the What We Do globe with an arc from the studio to each. The market names
// are new copy and need the site owner's approval. Pins sit at each country's (or the EU's) centre, not at client
// offices.

export interface Market {
  name: string
  // Place on the globe in degrees
  latitude: number
  longitude: number
  // Neighbouring pins put their labels on opposite sides so they never overlap
  labelSide: 'left' | 'right'
}

export const studio: Market = { name: 'Ha Noi', latitude: 21.03, longitude: 105.85, labelSide: 'left' }

export const markets: Market[] = [
  { name: 'United States', latitude: 39.8, longitude: -98.6, labelSide: 'right' },
  { name: 'United Kingdom', latitude: 52.5, longitude: -1.5, labelSide: 'left' },
  { name: 'European Union', latitude: 50.1, longitude: 9, labelSide: 'right' },
  { name: 'Japan', latitude: 36.2, longitude: 138.25, labelSide: 'right' },
  { name: 'Taiwan', latitude: 23.7, longitude: 121, labelSide: 'right' },
  { name: 'Singapore', latitude: 1.35, longitude: 103.82, labelSide: 'right' },
  { name: 'Australia', latitude: -25.3, longitude: 133.8, labelSide: 'right' }
]
