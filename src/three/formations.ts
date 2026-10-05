import { STATIONS } from "./stations";

/**
 * Every station has a constellation: the same stars regroup into a new figure
 * as each section takes over the screen. A figure is just a list of points, so
 * morphing from one to the next is a straight blend the GPU can do per vertex.
 */

type Random = () => number;
type Painter = (ctx: CanvasRenderingContext2D) => void;
type Shape = (count: number, random: Random) => Float32Array;

/** Side of the square canvas the flat figures are drawn on. */
const CANVAS = 256;
/** World units that canvas spans once the figure is in the scene. */
const SPAN = 6.6;
/** Share of stars left loose around a figure, so it sits in a haze of its own. */
const DUST = 0.1;

/**
 * Seeded PRNG (mulberry32). The star field is generated during render, so it
 * has to be deterministic — the same seed gives the same sky on every render,
 * on every reload, for every visitor.
 */
export function rng(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dust(out: Float32Array, i: number, random: Random) {
  const theta = random() * Math.PI * 2;
  const phi = Math.acos(random() * 2 - 1);
  const radius = 2.4 + random() * 3.4;
  out[i * 3] = Math.sin(phi) * Math.cos(theta) * radius * 1.25;
  out[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * radius * 0.8;
  out[i * 3 + 2] = Math.cos(phi) * radius * 0.5;
}

/** Coordinates of every pixel the painter filled, as a flat x,y list. */
function rasterise(paint: Painter): number[] {
  if (typeof document === "undefined") return [];
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS;
  canvas.height = CANVAS;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  paint(ctx);

  const { data } = ctx.getImageData(0, 0, CANVAS, CANVAS);
  const filled: number[] = [];
  for (let y = 0; y < CANVAS; y++) {
    for (let x = 0; x < CANVAS; x++) {
      if (data[(y * CANVAS + x) * 4 + 3] > 128) filled.push(x, y);
    }
  }
  return filled;
}

/** A flat figure: stars scattered over whatever the painter filled in. */
const drawn =
  (paint: Painter, depth = 0.55): Shape =>
  (count, random) => {
    const out = new Float32Array(count * 3);
    const filled = rasterise(paint);
    for (let i = 0; i < count; i++) {
      if (filled.length === 0 || random() < DUST) {
        dust(out, i, random);
        continue;
      }
      const k = Math.floor(random() * (filled.length / 2)) * 2;
      out[i * 3] = ((filled[k] + random()) / CANVAS - 0.5) * SPAN;
      out[i * 3 + 1] = (0.5 - (filled[k + 1] + random()) / CANVAS) * SPAN;
      out[i * 3 + 2] = (random() - 0.5) * depth;
    }
    return out;
  };

/** Text, scaled to fill the canvas and centred on its inked bounds. */
const glyph =
  (text: string, family: string): Painter =>
  (ctx) => {
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = `700 200px ${family}`;
    const rough = ctx.measureText(text);
    const width = rough.actualBoundingBoxLeft + rough.actualBoundingBoxRight;
    const height =
      rough.actualBoundingBoxAscent + rough.actualBoundingBoxDescent;
    const size = 200 * Math.min(214 / width, 190 / height);

    ctx.font = `700 ${size}px ${family}`;
    const m = ctx.measureText(text);
    ctx.fillText(
      text,
      CANVAS / 2 + (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2,
      CANVAS / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2,
    );
  };

const DISPLAY = "'Space Grotesk', 'Inter', system-ui, sans-serif";

/* ── The figures ──────────────────────────────────────────────────────────── */

/** Origin: the tag every front-end career starts with. */
const codeTag: Painter = (ctx) => {
  ctx.lineWidth = 19;
  ctx.beginPath();
  ctx.moveTo(86, 70);
  ctx.lineTo(28, 128);
  ctx.lineTo(86, 186);
  ctx.moveTo(152, 48);
  ctx.lineTo(104, 208);
  ctx.moveTo(170, 70);
  ctx.lineTo(228, 128);
  ctx.lineTo(170, 186);
  ctx.stroke();
};

/** Impact: bars climbing under a trend line. */
const growth: Painter = (ctx) => {
  const heights = [44, 82, 120, 160];
  heights.forEach((h, i) => ctx.fillRect(34 + i * 50, 222 - h, 32, h));

  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(30, 150);
  ctx.lineTo(96, 112);
  ctx.lineTo(150, 78);
  ctx.lineTo(222, 26);
  ctx.moveTo(192, 28);
  ctx.lineTo(222, 26);
  ctx.lineTo(216, 56);
  ctx.stroke();
};

/** Experience: a commit history — one main line, branches that merge back. */
const gitGraph: Painter = (ctx) => {
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(22, 142);
  ctx.lineTo(234, 142);
  ctx.moveTo(92, 142);
  ctx.bezierCurveTo(114, 142, 112, 76, 136, 76);
  ctx.lineTo(170, 76);
  ctx.bezierCurveTo(194, 76, 192, 142, 214, 142);
  ctx.moveTo(150, 142);
  ctx.bezierCurveTo(172, 142, 168, 204, 192, 204);
  ctx.lineTo(232, 204);
  ctx.stroke();

  const commits: [number, number][] = [
    [38, 142],
    [92, 142],
    [150, 142],
    [214, 142],
    [136, 76],
    [170, 76],
    [198, 204],
  ];
  commits.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill();
  });
};

/** Writing: indented lines of text with the cursor still on the last one. */
const prose: Painter = (ctx) => {
  ctx.lineWidth = 13;
  const lines: [number, number][] = [
    [30, 128],
    [56, 214],
    [56, 176],
    [82, 226],
    [56, 150],
    [30, 96],
  ];
  ctx.beginPath();
  lines.forEach(([from, to], i) => {
    ctx.moveTo(from, 54 + i * 30);
    ctx.lineTo(to, 54 + i * 30);
  });
  ctx.stroke();
  ctx.fillRect(114, 190, 12, 28);
};

/** Skills: an atom — three orbits round a nucleus. */
const atom: Shape = (count, random) => {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const pick = random();
    if (pick < DUST) {
      dust(out, i, random);
    } else if (pick < DUST + 0.13) {
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(random() * 2 - 1);
      const radius = Math.cbrt(random()) * 0.42;
      out[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      out[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * radius;
      out[i * 3 + 2] = Math.cos(phi) * radius;
    } else {
      const orbit = Math.floor(random() * 3);
      const a = random() * Math.PI * 2;
      const tilt = (orbit * Math.PI) / 3;
      const x = Math.cos(a) * 3.1;
      const y = Math.sin(a) * 1.15;
      const jitter = () => (random() - 0.5) * 0.09;
      out[i * 3] = x * Math.cos(tilt) - y * Math.sin(tilt) + jitter();
      out[i * 3 + 1] = x * Math.sin(tilt) + y * Math.cos(tilt) + jitter();
      // Each orbit leans out of the plane, so the atom has depth as it sways.
      out[i * 3 + 2] = Math.sin(a + orbit * 2.1) * 0.9 + jitter();
    }
  }
  return out;
};

const CUBE_EDGES: [number[], number[]][] = (() => {
  const corner = (n: number) => [n & 1 ? 1 : -1, n & 2 ? 1 : -1, n & 4 ? 1 : -1];
  const edges: [number[], number[]][] = [];
  for (let a = 0; a < 8; a++) {
    for (const bit of [1, 2, 4]) {
      if (!(a & bit)) edges.push([corner(a), corner(a | bit)]);
    }
  }
  return edges;
})();

/** Projects: a cube with another nested inside it — things built from parts. */
const cube: Shape = (count, random) => {
  const out = new Float32Array(count * 3);
  const [sx, cx] = [Math.sin(0.52), Math.cos(0.52)];
  const [sy, cy] = [Math.sin(0.72), Math.cos(0.72)];

  for (let i = 0; i < count; i++) {
    if (random() < DUST) {
      dust(out, i, random);
      continue;
    }
    const half = random() < 0.28 ? 0.8 : 1.75;
    const [from, to] = CUBE_EDGES[Math.floor(random() * CUBE_EDGES.length)];
    const t = random();
    const jitter = () => (random() - 0.5) * 0.08;
    const x = (from[0] + (to[0] - from[0]) * t) * half + jitter();
    const y = (from[1] + (to[1] - from[1]) * t) * half + jitter();
    const z = (from[2] + (to[2] - from[2]) * t) * half + jitter();

    // Turned to a three-quarter view so all three axes read at once.
    const xr = x * cy + z * sy;
    const zr = -x * sy + z * cy;
    out[i * 3] = xr;
    out[i * 3 + 1] = y * cx - zr * sx;
    out[i * 3 + 2] = y * sx + zr * cx;
  }
  return out;
};

const FIGURES: Record<string, Shape> = {
  top: drawn(codeTag),
  about: drawn(glyph("6+", DISPLAY)),
  impact: drawn(growth),
  skills: atom,
  experience: drawn(gitGraph),
  projects: cube,
  writing: drawn(prose),
  contact: drawn(glyph("@", DISPLAY)),
};

/** A station with no figure of its own still gets a cloud to gather into. */
const cloud: Shape = (count, random) => {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) dust(out, i, random);
  return out;
};

/** One point set per station, in station order, all the same length. */
export function buildFormations(count: number): Float32Array[] {
  return STATIONS.map((station, i) =>
    (FIGURES[station.id] ?? cloud)(count, rng(0xa57a0000 + i)),
  );
}
