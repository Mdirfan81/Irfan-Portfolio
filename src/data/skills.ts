export type SkillGroup = {
  id: string
  label: string
  blurb: string
  items: { name: string; core?: boolean }[]
}

export const skillGroups: SkillGroup[] = [
  {
    id: 'frontend',
    label: 'Frontend & Frameworks',
    blurb: 'Where I spend most of my day.',
    items: [
      { name: 'React 18+', core: true },
      { name: 'Next.js — SSR / SSG / App Router', core: true },
      { name: 'TypeScript', core: true },
      { name: 'Micro-frontends (Module Federation)', core: true },
      { name: 'Redux Toolkit' },
      { name: 'TanStack Query' },
      { name: 'Zustand' },
      { name: 'React Native' },
      { name: 'Tailwind CSS' },
      { name: 'Styled Components' },
      { name: 'Material UI' },
      { name: 'SCSS' },
      { name: 'WebSockets' },
    ],
  },
  {
    id: 'performance',
    label: 'Performance & Design Systems',
    blurb: 'Making it fast, then keeping it fast.',
    items: [
      { name: 'Core Web Vitals', core: true },
      { name: 'Design systems', core: true },
      { name: 'Storybook', core: true },
      { name: 'Code splitting' },
      { name: 'Lazy loading' },
      { name: 'Memoization' },
      { name: 'Lighthouse' },
      { name: 'React Profiler' },
      { name: 'WCAG / ARIA' },
      { name: 'Sentry' },
    ],
  },
  {
    id: 'testing',
    label: 'Testing & DevOps',
    blurb: 'Confidence to ship on a Friday.',
    items: [
      { name: 'Cypress', core: true },
      { name: 'Jest', core: true },
      { name: 'CI/CD — GitHub Actions, Jenkins', core: true },
      { name: 'React Testing Library' },
      { name: 'TDD' },
      { name: 'E2E testing' },
      { name: 'Git' },
      { name: 'Vite' },
      { name: 'Webpack' },
      { name: 'Babel' },
    ],
  },
  {
    id: 'backend',
    label: 'Backend & APIs',
    blurb: 'Enough full stack to own a feature end to end.',
    items: [
      { name: 'Node.js', core: true },
      { name: 'Express.js' },
      { name: 'REST APIs' },
      { name: 'GraphQL' },
      { name: 'JWT auth' },
      { name: 'AWS — S3, Lambda' },
      { name: 'Docker' },
      { name: 'Swagger / Postman' },
    ],
  },
  {
    id: 'ai',
    label: 'AI-Assisted Development',
    blurb: 'Building the tools that build the product.',
    items: [
      { name: 'Agentic AI workflows', core: true },
      { name: 'Custom AI coding agents', core: true },
      { name: 'Claude Code' },
      { name: 'GitHub Copilot' },
      { name: 'Cursor' },
      { name: 'Prompt-driven development' },
    ],
  },
  {
    id: 'tooling',
    label: 'Data & Ways of Working',
    blurb: 'The rest of the toolbox.',
    items: [
      { name: 'MongoDB' },
      { name: 'MySQL' },
      { name: 'Agile / Scrum / Kanban' },
      { name: 'Jira' },
      { name: 'Confluence' },
      { name: 'Figma' },
      { name: 'Zeplin' },
      { name: 'Data structures & algorithms' },
    ],
  },
]
