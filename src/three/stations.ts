/**
 * The journey is one continuous flight through a star field. Each DOM section
 * owns a station along it, so scroll position and the scene stay in lockstep —
 * the nav, the page and the constellation all agree on where you are.
 */
export type Station = {
  id: string;
  label: string;
  /** Which theme accent this leg of the journey takes its colour from. */
  tone: "accent" | "violet" | "cyan" | "mint";
};

export const STATIONS: Station[] = [
  { id: "top", label: "Origin", tone: "accent" },
  { id: "about", label: "About", tone: "accent" },
  { id: "impact", label: "Impact", tone: "cyan" },
  { id: "skills", label: "Skills", tone: "violet" },
  { id: "experience", label: "Experience", tone: "accent" },
  { id: "projects", label: "Projects", tone: "cyan" },
  { id: "writing", label: "Writing", tone: "violet" },
  { id: "contact", label: "Contact", tone: "mint" },
];
