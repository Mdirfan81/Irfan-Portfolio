import { profile } from "@/data/profile";
import { Reveal } from "@/components/Reveal";
import styles from "./About.module.css";

const FACTS = [
  { key: "Experience", value: "6+ years, 4 teams" },
  { key: "Based in", value: profile.location },
  { key: "Domains", value: "FinTech · Banking · Industrial" },
  { key: "Languages", value: "English · Hindi · Urdu" },
];

export function About() {
  return (
    <section className="section" id="about" aria-labelledby="about-title">
      <div className="shell">
        <Reveal>
          <p className="eyebrow">About</p>
          <h2 className="section-title" id="about-title">
            The engineer behind the metrics
          </h2>
        </Reveal>

        <div className={styles.grid}>
          <Reveal className={styles.prose} delay={0.05}>
            <p>{profile.summary}</p>
            <p>{profile.summarySecondary}</p>
          </Reveal>

          <div className={styles.side}>
            <Reveal delay={0.1}>
              <div className={`glass ${styles.panel}`}>
                <p className={styles.panelLabel}>At a glance</p>
                <dl className={styles.facts}>
                  {FACTS.map((f) => (
                    <div className={styles.fact} key={f.key}>
                      <dt className={styles.factKey}>{f.key}</dt>
                      <dd className={styles.factVal}>{f.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
