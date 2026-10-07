export interface Service {
  id: string
  title: string
  text: string
  tags: string[]
}

// Section titles are split into the lines they break on
export const whatWeDo = {
  title: ['What', 'We Do'],
  text: 'We work closely with independent digital agencies around the world to bring visually stunning designs and interactive concepts to life.'
}

export const letsTalk = {
  title: ["Let's", 'talk'],
  text: "Need a hand with any of the above? Shoot us a short email and we'll jump on a quick call or chat with you to discuss your engineering needs."
}

export const services: Service[] = [
  {
    id: 'svc-1',
    title: 'Creative front-end development',
    text: 'We care about front-end precision, accessibility, performance and smooth animation. Our code follows industry best practices in terms of separation of concerns and maintainability.',
    tags: [
      'Structured data and SEO markup',
      'Google Pagespeed Optimized',
      'ADA / WAI-ARIA compliant',
      '60fps animation',
      'BEM / Atomic Design'
    ]
  },
  {
    id: 'svc-2',
    title: 'E-commerce development',
    text: 'Shopify and Big Commerce are our primary E-commerce development platforms. We know them like the back of our hands. We thrive on building complex customized shopping experiences that stretch these platforms to their limits.',
    tags: [
      'Custom app development',
      'Custom theme development',
      'Custom one page checkout',
      'Faceted product filtering',
      'Data import / export / sync'
    ]
  },
  {
    id: 'svc-3',
    title: 'Custom apps and API integrations',
    text: 'Running digital campaigns requires connecting many moving parts such as CMS, CRM, analytics, email marketing, reservations etc. We excel at building integrations between WordPress, Shopify, BigCommerce and multiple platforms.',
    tags: [
      'Analytics: Google Analytics, Google Tag Manager, Segment, Facebook',
      'Events/Ticketing: EventBrite, Fandango',
      'Job boards: Greenhouse API',
      'Email: Constant Contact, MailChimp',
      'Custom API endpoints development',
      'Custom API integration'
    ]
  },
  {
    id: 'svc-4',
    title: 'Technical consulting',
    text: 'Having trouble growing your agency? Feeling constantly overwhelmed despite your 100-hour work week? We can help you get more business but less busy by implementing long-term technical strategies.',
    tags: [
      'Dedicated offshore developers',
      'Maintenance / overflow workload optimization',
      'Custom automated build systems (Webpack, Gulp)',
      'Continuous Delivery / Continuous Integration',
      'Automated visual testing',
      'Custom devop / automation service'
    ]
  }
]

// Marquee strip under the services
export const stack = [
  'Shopify',
  'BigCommerce',
  'WordPress',
  '60fps animation',
  'ADA / WAI-ARIA',
  'Pagespeed optimized',
  'Custom apps',
  'API integrations',
  'Webpack',
  'CI / CD'
]
