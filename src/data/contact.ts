export interface ContactCard {
  label: string
  title: string
  links: { href: string; text: string }[]
}

export const contactIntro = {
  title: ['Get In', 'Touch'],
  text: 'If you have any inquiry or questions, feel free to contact us via email. Our team will respond to you within 12 hours.'
}

export const email = {
  general: 'info@solislab.com',
  partnership: 'collab@solislab.com',
  careers: 'careers@solislab.com'
}

export const phone = '+1 646 389 6943'

const emailLink = (address: string) => ({ href: `mailto:${address}`, text: address })

export const contactCards: ContactCard[] = [
  {
    label: 'General Inquiries',
    title: 'Ask us anything.',
    links: [emailLink(email.general)]
  },
  {
    label: 'Partnership',
    title: 'Need engineering help?',
    links: [emailLink(email.partnership), { href: `tel:${phone.replaceAll(' ', '')}`, text: phone }]
  },
  {
    label: 'Careers',
    title: 'Grow with us.',
    links: [emailLink(email.careers)]
  }
]

export const office = {
  label: 'Hanoi Office',
  street: '4th Floor, Ha Thanh Plaza, 102 Thai Thinh, Dong Da District',
  locality: 'Ha Noi',
  country: 'VN'
}
