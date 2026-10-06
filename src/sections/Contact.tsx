import {
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  Download,
  GitBranch,
  Mail,
} from "lucide-react";
import { profile } from "@/data/profile";
import { Flow } from "@/components/Flow";
import { flowPart } from "@/lib/flow";
import { Eyebrow, SplitText } from "@/components/TextReveal";
import styles from "./Contact.module.css";

const YEAR = new Date().getFullYear();

/**
 * An address with a place to break after its @. On a narrow card the email
 * then wraps there, whole, instead of being cut wherever the line runs out.
 */
const breakable = (value: string) =>
  value
    .split("@")
    .flatMap((part, i) => (i === 0 ? [part] : ["@", <wbr key={i} />, part]));

export function Contact() {
  const channels = [
    {
      label: "Email",
      value: profile.email,
      href: `mailto:${profile.email}`,
      icon: Mail,
      external: false,
    },
    {
      label: "LinkedIn",
      value: "in/mdirfankhandev",
      href: profile.links.linkedin,
      icon: BriefcaseBusiness,
      external: true,
    },
    {
      label: "GitHub",
      value: "Mdirfan81",
      href: profile.links.github,
      icon: GitBranch,
      external: true,
    },
    {
      label: "Medium",
      value: "@mdirfankhan98455",
      href: profile.links.medium,
      icon: BookOpen,
      external: true,
    },
  ];

  return (
    <section
      className={`section ${styles.contact}`}
      id="contact"
      aria-labelledby="contact-title"
    >
      <div className="shell">
        <Eyebrow>Contact</Eyebrow>
        <SplitText
          className="section-title"
          id="contact-title"
          text="Let us build something"
        />

        <Flow kind="zoom">
          <div className={`glass ${styles.panel}`}>
            <div className={styles.inner}>
              <div>
                <p className={`${styles.headline} gradient-text gradient-text--shimmer`}>
                  Have a frontend problem worth solving?
                </p>
                <p className={styles.copy}>
                  I am based in {profile.location}, open to Senior Software Engineering
                  roles, and happy to talk through a specific problem before
                  anything formal.
                </p>
                <div className={styles.ctas}>
                  <a
                    className="btn btn--primary"
                    href={`mailto:${profile.email}`}
                  >
                    <Mail size={16} aria-hidden />
                    Email me
                  </a>
                  <a
                    className="btn"
                    href={profile.links.linkedin}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <BriefcaseBusiness size={16} aria-hidden />
                    Connect on LinkedIn
                  </a>
                  <a
                    className="btn"
                    href={profile.resume.url}
                    download={profile.resume.fileName}
                  >
                    <Download size={16} aria-hidden />
                    Download Resume
                  </a>
                </div>
              </div>

              <ul className={styles.channels}>
                {channels.map((c, i) => {
                  const Icon = c.icon;
                  return (
                    <li key={c.label} className="flow-part" style={flowPart(i * 2)}>
                      <a
                        className={styles.channel}
                        href={c.href}
                        {...(c.external
                          ? { target: "_blank", rel: "noreferrer" }
                          : {})}
                      >
                        <span className={styles.channelIcon} aria-hidden="true">
                          <Icon size={17} />
                        </span>
                        <span>
                          <span className={styles.channelLabel}>{c.label}</span>
                          <span className={styles.channelValue}>{breakable(c.value)}</span>
                        </span>
                        <ArrowUpRight
                          size={16}
                          className={styles.arrow}
                          aria-hidden
                        />
                        {c.external && (
                          <span className="visually-hidden">
                            (opens in a new tab)
                          </span>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </Flow>

        <footer className={styles.footer}>
          <div className={styles.footerRow}>
            <p>
              © {YEAR} {profile.name}. Built with React, TypeScript, Vite,
              Motion and Three.js.
            </p>
            <nav className={styles.footerLinks} aria-label="Footer">
              <a href="#top">Back to top</a>
              <a href={profile.links.github} target="_blank" rel="noreferrer">
                GitHub
              </a>
              <a href={profile.links.linkedin} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
              <a href={profile.links.medium} target="_blank" rel="noreferrer">
                Medium
              </a>
            </nav>
          </div>
        </footer>
      </div>
    </section>
  );
}
