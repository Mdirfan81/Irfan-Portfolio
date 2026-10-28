import { useEffect, useRef, useState } from "react";
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
import { RollText } from "@/components/RollText";
import { SquigglyText } from "@/components/SquigglyText";
import { EASE_OUT } from "@/lib/motion";
import { usePageLoading } from "@/lib/pageLoad";
import styles from "./Hero.module.css";

/** The name is the hero. Split so each word can rise on its own. */
const NAME_LINES = ["Md Irfan", "Khan"];

/** Milliseconds per character typed, per character erased, and held whole. */
const TYPE_MS = 70;
const ERASE_MS = 35;
const HOLD_MS = 2200;

/**
 * Types each ending of the prompt out, holds it, erases it, and moves on to
 * the next, like a terminal finishing the sentence. Starts once `run` is set,
 * so it begins where it can be seen, after the loader.
 */
function useTyped(endings: readonly string[], run: boolean) {
  const [state, setState] = useState({ index: 0, length: 0, erasing: false });

  useEffect(() => {
    if (!run) return;
    const full = endings[state.index];
    let delay = TYPE_MS;
    let next = state;

    if (!state.erasing && state.length < full.length) {
      next = { ...state, length: state.length + 1 };
    } else if (!state.erasing) {
      delay = HOLD_MS;
      next = { ...state, erasing: true };
    } else if (state.length > 0) {
      delay = ERASE_MS;
      next = { ...state, length: state.length - 1 };
    } else {
      delay = TYPE_MS * 4;
      next = { index: (state.index + 1) % endings.length, length: 0, erasing: false };
    }

    const timer = window.setTimeout(() => setState(next), delay);
    return () => clearTimeout(timer);
  }, [endings, run, state]);

  return endings[state.index].slice(0, state.length);
}

export function Hero() {
  const reduced = useReducedMotion() ?? false;
  // The entrance waits for the loader to lift, so it plays where it can be
  // seen instead of finishing behind the cover.
  const waiting = usePageLoading();
  const show = waiting ? "hidden" : "visible";
  const typed = useTyped(profile.hero.endings, !waiting && !reduced);
  const ending = reduced ? profile.hero.endings[0] : typed;

  // As the hero scrolls away its copy drifts up and dims a little behind the
  // page, while the waves and the figure in the scene carry on underneath.
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -120]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.8], [1, reduced ? 1 : 0.1]);

  const lineVariants = {
    hidden: { y: reduced ? 0 : "110%", opacity: reduced ? 0 : 1 },
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      transition: {
        delay: reduced ? 0 : 0.12 + i * 0.1,
        duration: reduced ? 0 : 0.9,
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
        delay: reduced ? 0 : 0.45 + i * 0.08,
        duration: reduced ? 0 : 0.7,
        ease: EASE_OUT,
      },
    }),
  };

  return (
    <section
      ref={heroRef}
      className={styles.hero}
      id="top"
      aria-labelledby="hero-title"
    >
      <motion.div className={`shell ${styles.copy}`} style={{ y: copyY, opacity: copyOpacity }}>
        <motion.p
          className={styles.status}
          variants={fade}
          custom={-4}
          initial="hidden"
          animate={show}
        >
          <span className={styles.dot} aria-hidden="true" />
          Open to Senior Software Engineering roles
        </motion.p>

        <h1 className={styles.title} id="hero-title">
          <span className="visually-hidden">
            {profile.name} — {profile.role}. {profile.tagline}
          </span>
          {/* Wraps both lines from outside their clip, so the wobble isn't cut
              off at the edge of each line box. */}
          <SquigglyText>
            {NAME_LINES.map((line, i) => (
              <span key={line} className={styles.titleLine} aria-hidden="true">
                <motion.span
                  style={{ display: "block" }}
                  variants={lineVariants}
                  custom={i}
                  initial="hidden"
                  animate={show}
                  className={
                    i === NAME_LINES.length - 1 ? "gradient-text gradient-text--shimmer" : undefined
                  }
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </SquigglyText>
        </h1>

        <motion.p
          className={styles.role}
          variants={fade}
          custom={0}
          initial="hidden"
          animate={show}
        >
          <span className={styles.roleMain}>{profile.role}</span>
          <span>{profile.years} years</span>
          <span>
            <MapPin
              size={13}
              aria-hidden
              style={{ display: "inline", verticalAlign: "-2px" }}
            />{" "}
            {profile.location}
          </span>
        </motion.p>

        {/* The sentence is read once, whole; the typing is for the eye. */}
        <motion.p
          className={styles.prompt}
          variants={fade}
          custom={1}
          initial="hidden"
          animate={show}
        >
          <span className="visually-hidden">
            {profile.hero.prompt} “{profile.hero.endings[0]}”
          </span>
          <span aria-hidden="true">
            <span className={styles.promptSign}>›</span> {profile.hero.prompt}{" "}
            <span className={styles.typed}>{ending}</span>
            <span className={styles.caret} />
          </span>
        </motion.p>

        <motion.div
          className={styles.ctas}
          variants={fade}
          custom={2}
          initial="hidden"
          animate={show}
        >
          <a className="btn btn--primary roll-host" href="#projects">
            <RollText text="See selected work" />
            <ArrowUpRight size={16} aria-hidden />
          </a>
          <a
            className="btn roll-host"
            href={profile.resume.url}
            download={profile.resume.fileName}
          >
            <Download size={16} aria-hidden />
            <RollText text="Download Resume" />
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

      <a className={styles.cue} href="#what-i-do">
        <span className={styles.cueLine} aria-hidden="true" />
        {profile.hero.cue}
        <ArrowDown size={12} aria-hidden />
      </a>
    </section>
  );
}
