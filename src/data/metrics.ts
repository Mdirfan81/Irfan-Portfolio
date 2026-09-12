export type Metric = {
  value: number
  suffix: string
  label: string
  detail: string
}

export const metrics: Metric[] = [
  {
    value: 35,
    suffix: '%',
    label: 'Faster page loads',
    detail: 'Code splitting, lazy loading and caching in React.js',
  },
  { value: 60, suffix: '%', label: 'UI consistency gain', detail: 'Company-wide design system in React + Storybook' },
  { value: 40, suffix: '%', label: 'Dev velocity increase', detail: 'Documented, reusable component library' },
  { value: 10, suffix: '+ hrs', label: 'Saved per week', detail: 'Automated Cypress / Jest suites at 85% coverage' },
  { value: 2, suffix: 'M+', label: 'Users served', detail: 'Banking and insurance web applications' },
  { value: 30, suffix: '%', label: 'Fewer runtime errors', detail: 'Cross-team migration to TypeScript' },
]
