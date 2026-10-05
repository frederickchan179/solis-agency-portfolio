export interface Benefit {
  label?: string
  text: string
}

export interface Job {
  id: string
  title: string
  reasons: string[]
  job: string
  perfectIf: string[]
  skills: string[]
  why: string[]
  benefits: Benefit[]
}

// Shared by every position
const reasons = ['Macbook Pro and equipments', 'Clear skillset roadmap', 'Year-end and separate performance bonuses']

const perfectIf = [
  'You have a keen eye for details and can interpret design requirements into front-end code precisely.',
  'You write maintainable code that is well thought out and can be reused across multiple projects.',
  'You are independent and fearless. When we give you a difficult task, you know how to do research and quickly come up with technical solutions. You do your own QA before asking team leader for code and frontend review.',
  'You are also a team player who supports other team mates and happily train or guide less experienced developers.',
  'You consider yourself a craftsman who puts out quality work that you are proud of. Don’t apply if you are not someone who’s willing to put in time and effort to produce best quality works within deadlines.'
]

const skillsBefore = [
  '2+ years front-end working experience. Understand front-end best practices and conventions.',
  'Experienced in building themes or websites for the Western markets.',
  'Experienced with HTML5 and SEO-friendly code.',
  'Experienced with CSS3, especially Flexbox, Transitions, Transforms, Keyframes.',
  'Confident implementing JavaScript without jQuery.',
  'Know how to use Git (GitLab/Bitbucket), Gulp and Grunt. Bonus points for Webpack.'
]

const skillsAfter = [
  'Bonus points for Vue / Vuex experience.',
  'Bonus points for Sass, Less or postCSS experience.',
  'Bonus points for ES6/7 experience.'
]

const why = [
  'Experience a fast-paced development agency life in a team that values teamwork, communication, personal development and attention to details.',
  'We don’t have a big office but it’s cozy. Our Hanoi team is small, but they’re hard-working and passionate. There is a ton of work to do, but it’s all well compensated. All projects have hard deadlines. Our team updates technology stacks, conventions, and workflows on a weekly basis. Your colleagues rely on you to keep up with constant changes while still deliver results effectively within time and budget constraints. You will have to swim to survive. We don’t hand out life jackets.',
  'If all that doesn’t bother you, then you are one of us, and you will love this. Your experience and skills will grow more quickly than that of your peers in other companies. All we focus on is learning and improving through our day-to-day work, and at the same time, enjoy the company of our colleagues, whom we select very carefully.'
]

const benefits: Benefit[] = [
  {
    label: 'Professional working environment:',
    text: 'Clearly-defined internal process and top-notched facilities including iMac, iPhone, Android devices for testing.'
  },
  {
    label: 'Clear vision of your career progress:',
    text: 'Goal evaluation every 3 months, performance review with potential for raise every 6 months.'
  },
  {
    label: 'Personal development:',
    text: 'Access to Team Treehouse or Pluralsight for skill-set development, with career guidance from Technical Lead and CEO.'
  },
  {
    label: 'Grow to be a full-stack developer:',
    text: 'Opportunity to work with cutting-edge technologies, both front-end and back-end.'
  },
  {
    label: 'Opportunity to learn from the best:',
    text: '1-on-1 on the job training with Technical Lead and CEO.'
  },
  {
    label: 'Bonus:',
    text: 'Year-end bonus based on individual performance. Regular spot bonuses when meeting goals or complete projects with good results and adapt our deadline.'
  },
  {
    label: 'Days off:',
    text: 'Public holidays, and on top of that, 12 paid days off a year, with possibility for more depending on performance level or seniority.'
  },
  {
    text: 'Yearly health check-up. We also provide premium health insurance for family members of senior-level members.'
  },
  {
    label: 'You are encouraged to have a life outside of work:',
    text: 'Regular team building activities, tickets to conferences and occasional remote working time. We trust you to be a professional.'
  }
]

export const jobs: Job[] = [
  {
    id: 'job-shopify',
    title: 'Shopify Theme Developer',
    reasons,
    job: 'Your job is to work with us to build e-commerce stores with millions of views per month for well-known brands around the world. The main platform and technologies you will work with are Shopify, HTML5 / CSS3 / JavaScript.',
    perfectIf,
    skills: [
      ...skillsBefore,
      'Solid experience with Shopify theme development (Liquid templating language).',
      ...skillsAfter
    ],
    why,
    benefits
  },
  {
    id: 'job-wordpress',
    title: 'WordPress Theme Developer',
    reasons,
    job: 'Your job is to work with us to build websites with millions of views per month for well-known brands around the world. The main platform and technologies you will work with are WordPress, HTML / CSS3 / JavaScript.',
    perfectIf,
    skills: [...skillsBefore, ...skillsAfter],
    why,
    benefits
  }
]
