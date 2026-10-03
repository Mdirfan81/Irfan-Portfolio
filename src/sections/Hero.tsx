import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import {
  ArrowDown,
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  Download,
  GitBranch,
  MapPin,
} from "lucide-react";
import { profile } from "@/data/profile";
import { TiltCard } from "@/components/TiltCard";
import { EASE_OUT } from "@/lib/motion";
import styles from "./Hero.module.css";

/** The name is the hero. Split so each word can rise on its own. */
const NAME_LINES = ["Md Irfan", "Khan"];

const TERMINAL = [
  { key: "role", val: `"${profile.role}"` },
  { key: "focus", val: '["React", "TypeScript", "Node.js"]' },
  { key: "domains", val: '["FinTech", "Banking", "Industrial"]' },
  { key: "scale", val: '"2M+ users served"' },
  { key: "based", val: `"${profile.location}"` },
];

export function Hero() {
  const reduced = useReducedMotion() ?? false;

  // As the hero scrolls away, its copy drifts up and fades a little behind the page.
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -90]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.8], [1, reduced ? 1 : 0.15]);

  const lineVariants = {
    hidden: { y: reduced ? 0 : "110%", opacity: reduced ? 0 : 1 },
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      transition: {
        delay: reduced ? 0 : 0.12 + i * 0.09,
        duration: reduced ? 0 : 0.8,
        ease: EASE_OUT,
      },
    }),
  };

  const fade = {
    hidden: { opacity: 0, y: reduced ? 0 : 16 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: reduced ? 0 : 0.4 + i * 0.08,
        duration: reduced ? 0 : 0.6,
        ease: EASE_OUT,
      },
    }),
  };

  /** Terminal rows "type" in left to right, one after another. */
  const typeLine = {
    hidden: reduced
      ? { opacity: 0 }
      : { clipPath: "inset(0 100% 0 0)", opacity: 1 },
    visible: {
      clipPath: "inset(0 0% 0 0)",
      opacity: 1,
      transition: reduced
        ? { duration: 0.2 }
        : { duration: 0.45, ease: "linear" as const },
    },
  };

  return (
    <section
      ref={heroRef}
      className={styles.hero}
      id="top"
      aria-labelledby="hero-title"
    >
      <div className={`shell ${styles.grid}`}>
        <motion.div style={{ y: copyY, opacity: copyOpacity }}>
          <motion.p
            className={styles.status}
            variants={fade}
            custom={-4}
            initial="hidden"
            animate="visible"
          >
            <span className={styles.dot} aria-hidden="true" />
            Open to software engineering roles
          </motion.p>

          <h1 className={styles.title} id="hero-title">
            <span className="visually-hidden">
              {profile.name} — {profile.role}. {profile.tagline}
            </span>
            {NAME_LINES.map((line, i) => (
              <span key={line} className={styles.titleLine} aria-hidden="true">
                <motion.span
                  style={{ display: "block" }}
                  variants={lineVariants}
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  className={
                    i === NAME_LINES.length - 1 ? "gradient-text gradient-text--shimmer" : undefined
                  }
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            className={styles.role}
            variants={fade}
            custom={0}
            initial="hidden"
            animate="visible"
          >
            <span className={styles.roleMain}>{profile.role}</span>
            <span className={styles.roleSep} aria-hidden="true">
              /
            </span>
            <span>{profile.years} years</span>
            <span className={styles.roleSep} aria-hidden="true">
              /
            </span>
            <span>
              <MapPin
                size={13}
                aria-hidden
                style={{ display: "inline", verticalAlign: "-2px" }}
              />{" "}
              {profile.location}
            </span>
          </motion.p>

          <motion.p
            className={styles.lede}
            variants={fade}
            custom={1}
            initial="hidden"
            animate="visible"
          >
            {profile.tagline} 6+ years of it — design systems that hold,
            pipelines that catch things, and performance budgets teams actually
            keep.
          </motion.p>

          <motion.div
            className={styles.ctas}
            variants={fade}
            custom={2}
            initial="hidden"
            animate="visible"
          >
            <a className="btn btn--primary" href="#projects">
              See selected work
              <ArrowUpRight size={16} aria-hidden />
            </a>
            <a
              className="btn"
              href={profile.resume.url}
              download={profile.resume.fileName}
            >
              <Download size={16} aria-hidden />
              Download Resume
            </a>
            <a
              className="btn"
              href={profile.links.github}
              target="_blank"
              rel="noreferrer"
            >
              <GitBranch size={16} aria-hidden />
              GitHub
            </a>
            <a
              className="btn"
              href={profile.links.linkedin}
              target="_blank"
              rel="noreferrer"
            >
              <BriefcaseBusiness size={16} aria-hidden />
              LinkedIn
            </a>
            <a
              className="btn"
              href={profile.links.medium}
              target="_blank"
              rel="noreferrer"
            >
              <BookOpen size={16} aria-hidden />
              Medium
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          variants={fade}
          custom={3}
          initial="hidden"
          animate="visible"
        >
          <TiltCard className={styles.terminal} intensity={6}>
            <div className={styles.termBar}>
              <span className={styles.termDots} aria-hidden="true">
                <span className={styles.termDot} />
                <span className={styles.termDot} />
                <span className={styles.termDot} />
              </span>
              <span className={styles.termTitle}>~/irfan/profile.json</span>
            </div>
            <motion.div
              className={styles.termBody}
              aria-hidden="true"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    delayChildren: reduced ? 0 : 0.9,
                    staggerChildren: reduced ? 0 : 0.22,
                  },
                },
              }}
            >
              <motion.p className={styles.termLine} variants={typeLine}>
                <span className={styles.termComment}>
                  // 6+ years, four teams, one obsession
                </span>
              </motion.p>
              {TERMINAL.map((row) => (
                <motion.p
                  className={styles.termLine}
                  key={row.key}
                  variants={typeLine}
                >
                  <span className={styles.termPrompt}>›</span>
                  <span className={styles.termKey}>{row.key}:</span>
                  <span className={styles.termVal}>{row.val}</span>
                </motion.p>
              ))}
              <motion.p className={styles.termLine} variants={typeLine}>
                <span className={styles.termPrompt}>›</span>
                <span className={styles.termComment}>ship it</span>
                <span className={styles.caret} />
              </motion.p>
            </motion.div>
          </TiltCard>
        </motion.div>
      </div>

      <a className={styles.cue} href="#about">
        <span className={styles.cueLine} aria-hidden="true" />
        Scroll
        <ArrowDown size={12} aria-hidden />
      </a>
    </section>
  );
}
