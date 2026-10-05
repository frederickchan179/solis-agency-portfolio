export interface Value {
  title: string
  text: string
  // File name in public/images/values, without the -480/-960.webp suffix
  photo: string
}

export const values: Value[] = [
  {
    title: 'Be brutally honest',
    photo: 'be-brutally-honest',
    text: "We aim to help clients avoid unpleasant surprises close to launches by being completely transparent about potential complexity, budgetary or timeline risks at every step of the way. This lack of sugarcoating doesn't help us win every contract or any popularity contest. But clients can count on us to tell it like it is."
  },
  {
    title: 'Lead fearlessly',
    photo: 'lead-fearlessly',
    text: "Our team consists of strong resilient individuals who take ownership and initiative of everything they do. We don't give up or give excuses, but take every opportunity to learn from past failure and mistakes."
  },
  {
    title: 'Embrace changes',
    photo: 'embrace-changes',
    text: 'Trends shift. Platforms and frameworks come and go. Digital campaigns have to adapt to customer needs, sometimes at the last minute. We welcome these challenges as catalysts for our next stage of evolution, for only the fittest will survive.'
  },
  {
    title: 'Attend to details',
    photo: 'attend-to-details',
    text: 'We execute even the smallest details with precision and finesse so that no creative direction is lost in the translation process from design to code. No compromise. No shortcuts.'
  }
]
