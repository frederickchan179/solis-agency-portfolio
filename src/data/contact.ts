export interface ContactCard {
  label: string
  title: string
  links: { href: string; text: string }[]
}

export const contactCards: ContactCard[] = [
  {
    label: 'General Inquiries',
    title: 'Ask us anything.',
    links: [{ href: 'mailto:info@solislab.com', text: 'info@solislab.com' }]
  },
  {
    label: 'Partnership',
    title: 'Need engineering help?',
    links: [
      { href: 'mailto:collab@solislab.com', text: 'collab@solislab.com' },
      { href: 'tel:+16463896943', text: '+1 646 389 6943' }
    ]
  },
  {
    label: 'Careers',
    title: 'Grow with us.',
    links: [{ href: 'mailto:careers@solislab.com', text: 'careers@solislab.com' }]
  }
]

export const office = {
  label: 'Hanoi Office',
  address: '4th Floor, Ha Thanh Plaza, 102 Thai Thinh, Dong Da District, Ha Noi'
}
