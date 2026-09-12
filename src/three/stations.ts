/**
 * The journey is one continuous 3D corridor. Each DOM section owns a station
 * along it, so scroll position and camera depth stay in lockstep — the nav, the
 * page and the scene all agree on where you are.
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

/** World units between stations. */
export const STATION_GAP = 13;
export const JOURNEY_DEPTH = (STATIONS.length - 1) * STATION_GAP;
/**
 * How far the camera actually travels. It stops well short of the final gate so
 * the last screen frames the ring rather than sitting inside it.
 */
export const JOURNEY_TRAVEL = JOURNEY_DEPTH - 14;
export const CAMERA_START_Z = 7;
