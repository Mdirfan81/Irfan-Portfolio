import type { LucideIcon } from 'lucide-react'
import {
  Boxes,
  Gauge,
  Component,
  ChartNoAxesCombined,
  Landmark,
  ShieldCheck,
  FileSearch,
  Gamepad2,
  Bot,
} from 'lucide-react'

export type Project = {
  id: string
  title: string
  org: string
  domain: 'Industrial' | 'Banking' | 'Platform' | 'Product'
  summary: string
  tags: string[]
  icon: LucideIcon
  featured?: boolean
}

export const projects: Project[] = [
  {
    id: 'glass-rack-editor',
    title: 'Glass Rack Editor',
    org: 'Lisec Automation',
    domain: 'Industrial',
    summary:
      'A 2D/3D visualisation tool for glass shipping rack management, built from scratch. Custom table components, drag-and-drop rack-to-rack transfer and strategic pane placement.',
    tags: ['React', 'Canvas / 3D', 'Drag & drop', 'TypeScript'],
    icon: Boxes,
    featured: true,
  },
  {
    id: 'ai-coding-agent',
    title: 'Context-Aware AI Coding Agent',
    org: 'Lisec Automation',
    domain: 'Platform',
    summary:
      'An internal agent carrying structured context on feature locations, module boundaries and house conventions, so generated code matches the codebase instead of merely compiling. Cut duplicate code and review iterations sharply.',

    tags: ['Agentic AI', 'Node.js', 'DX tooling'],
    icon: Bot,
    featured: true,
  },
  {
    id: 'capacity-overview',
    title: 'Capacity Overview',
    org: 'Lisec Automation',
    domain: 'Industrial',
    summary:
      'Real-time monitoring of order utilisation across machines, so planners can prioritise, rearrange and squeeze more out of the floor.',
    tags: ['WebSockets', 'Real-time', 'React'],
    icon: Gauge,
  },
  {
    id: 'component-library',
    title: 'UI Component Library',
    org: 'Lisec Automation',
    domain: 'Platform',
    summary:
      'Tooltip, accordion table, dropdown, toggle and calendar primitives — documented in Storybook with states, props and accessibility notes so nobody rebuilds them twice.',
    tags: ['Storybook', 'Design system', 'a11y'],
    icon: Component,
  },
  {
    id: 'production-planning',
    title: 'Production Planning Dashboard',
    org: 'Lisec Automation',
    domain: 'Industrial',
    summary:
      'ERP-style dashboard with Gantt, heatmap and distribution charts, giving planners a single visual read on the production pipeline.',
    tags: ['Data viz', 'FusionCharts', 'React'],
    icon: ChartNoAxesCombined,
  },
  {
    id: 'hsbc',
    title: 'HSBC — Digital Banking',
    org: 'Capgemini',
    domain: 'Banking',
    summary:
      'Frontend on a large-scale digital account management platform: UI development, backend integration, accessibility and security compliance, working across global teams.',
    tags: ['React', 'Accessibility', 'Security compliance'],
    icon: Landmark,
  },
  {
    id: 'usaa',
    title: 'USAA — Insurance Platform',
    org: 'Capgemini',
    domain: 'Banking',
    summary:
      'Vehicle policy management flows rebuilt with the BA team to cut processing time and remove steps from the agent workflow.',
    tags: ['React', 'Forms UX', 'Micro-frontend'],
    icon: ShieldCheck,
  },
  {
    id: 'sanctions',
    title: 'Sanctions as a Service',
    org: 'Capgemini',
    domain: 'Banking',
    summary:
      'A secure document screening and compliance platform — end-to-end development and testing of regulatory workflows.',
    tags: ['React', 'Compliance', 'E2E testing'],
    icon: FileSearch,
  },
  {
    id: 'difu',
    title: 'DiFu — Digital Readiness',
    org: 'CodeKindle',
    domain: 'Product',
    summary:
      'Developed and maintained an application that assesses employee digital readiness inside an organisation, overseeing the entire development and testing process.',
    tags: ['React', 'Assessment flows', 'E2E testing'],
    icon: Gauge,
  },
  {
    id: 'howzdat',
    title: 'Howzdat — Gamified Testing',
    org: 'CodeKindle',
    domain: 'Product',
    summary:
      'A gamified web test system for high-school classrooms, designed around teacher–student engagement and interactive feedback.',
    tags: ['React', 'Interaction design', 'EdTech'],
    icon: Gamepad2,
  },
]

export const projectFilters = ['All', 'Industrial', 'Platform', 'Banking', 'Product'] as const
export type ProjectFilter = (typeof projectFilters)[number]
