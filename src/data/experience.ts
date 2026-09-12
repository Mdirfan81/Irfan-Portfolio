export type Role = {
  id: string
  company: string
  title: string
  location: string
  period: string
  current?: boolean
  bullets: string[]
  stack: string[]
}

export const experience: Role[] = [
  {
    id: 'lisec',
    company: 'Lisec Automation',
    title: 'Software Engineer',
    location: 'Dubai, UAE',
    period: 'May 2023 — Present',
    current: true,
    bullets: [
      'Helped shape and build the company-wide design system and React component library in Storybook, contributing components now used across every project — 60% better UI consistency and 40% faster feature delivery.',
      'Cut page load times 35% and lifted Core Web Vitals through lazy loading, route-level code splitting and server-driven caching with TanStack Query.',
      'Moved API access onto Hey API generated clients, so request and response types come straight from the OpenAPI spec instead of being hand-written and drifting.',
      'Automated the frontend test pipeline with Playwright, Cypress, Jest and React Testing Library — 85%+ coverage and 10+ hours of manual QA saved every week.',
      'Ran weekly code reviews and pairing sessions, halving review turnaround while raising the floor on React practices across the team.',
      'Implemented WebSockets for real-time telemetry, notifications and live production data.',
      'Designed and built an internal AI coding agent with architecture-aware context on our codebase, so LLM output lands pattern-consistent instead of plausible-looking.',
    ],
    stack: ['React', 'TypeScript', 'TanStack Query', 'Hey API', 'Playwright', 'Storybook', 'WebSockets'],
  },
  {
    id: 'capgemini',
    company: 'Capgemini Technology Services',
    title: 'Software Engineer',
    location: 'Hyderabad, India',
    period: 'Mar 2022 — May 2023',
    bullets: [
      'Built responsive applications serving 2M+ users in React and JavaScript, compiled with Webpack and Babel.',
      'Mentored two junior developers on frontend structure and review practice, lifting team output about 30%.',
      'Drove cross-functional TypeScript adoption, cutting production runtime errors by 30%.',
      'Introduced micro-frontend architecture with Module Federation so teams could ship independently and failures stayed contained.',
    ],
    stack: ['React', 'TypeScript', 'Module Federation', 'Webpack', 'Accessibility'],
  },
  {
    id: 'codekindle',
    company: 'CodeKindle Solutions',
    title: 'Software Engineer',
    location: 'Hyderabad, India',
    period: 'Oct 2020 — Mar 2022',
    bullets: [
      'Built and maintained the Howzdat and DiFu products on a modern React stack, tracing and clearing performance bottlenecks to hold zero downtime.',
      'Optimised real-time data pipelines for 27% faster page loads and measurably higher daily active users.',
    ],
    stack: ['React', 'JavaScript', 'Node.js', 'Real-time data'],
  },
  {
    id: 'kalyt',
    company: 'Kalyt Technologies',
    title: 'Associate Software Engineer — Intern',
    location: 'Hyderabad, India',
    period: 'Sep 2020 — Oct 2020',
    bullets: [
      'Contributed to core product development and deployment across React, JavaScript and Node.js.',
    ],
    stack: ['React', 'JavaScript', 'Node.js'],
  },
]
