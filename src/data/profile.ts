import resumePdf from "./constant/IRFAN_KHAN_RESUME.pdf";

export const profile = {
  name: "Md Irfan Khan",
  firstName: "Irfan",
  role: "Senior Software Engineer",
  discipline: "Senior Software Engineer",
  location: "Dubai, UAE",
  years: "6+",

  tagline:
    "I build fast, accessible interfaces for FinTech, banking and industrial automation.",
  summary:
    "Senior Software Engineer with 6+ years shipping scalable, high-performance web applications across FinTech, banking and enterprise automation in the GCC and global markets. I work in React and TypeScript, lean on micro-frontend architecture at scale, and stay comfortable in Node.js microservices when a feature needs the whole slice.",
  summarySecondary:
    "Most of my impact comes from the boring things done well: a design system nobody fights, a CI pipeline that catches regressions, and a performance budget the team actually keeps. Lately I have been building internal AI coding agents that understand a codebase well enough to write code that fits it.",
  email: "mdirfankhan98455@gmail.com",
  resume: {
    // Vite fingerprints the file, so the download name is set explicitly.
    url: resumePdf,
    fileName: "Md-Irfan-Khan-Resume.pdf",
  },
  links: {
    linkedin: "https://www.linkedin.com/in/mdirfankhandev/",
    github: "https://github.com/Mdirfan81",
    medium: "https://medium.com/@mdirfankhan98455",
  },
} as const;

export const navItems = [
  { id: "about", label: "About" },
  { id: "impact", label: "Impact" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "writing", label: "Writing" },
  { id: "contact", label: "Contact" },
] as const;
