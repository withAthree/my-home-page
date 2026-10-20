"use client";

import { useEffect, useRef, useState } from "react";
import { useSiteContent } from "./ContentProvider";
import RichTitle from "./RichTitle";
import Reveal from "./Reveal";
import { Check, Copy, iconMap } from "./Icons";

export default function Contact() {
  const { profile, copy } = useSiteContent();
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = profile.email;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="contact" className="section contact" aria-label="联系方式">
      <div className="container">
        <div className="contact__grid">
          <div>
            <Reveal>
              <div className="section-index">{copy.contact.index}</div>
              <RichTitle className="contact__title" text={copy.contact.title} />
            </Reveal>

            <Reveal delay={100}>
              <p className="contact__desc">{copy.contact.sub}</p>
            </Reveal>

            <Reveal delay={160}>
              <div className="email-row">
                <a className="email-link" href={`mailto:${profile.email}`}>
                  {profile.email}
                </a>
                <button
                  type="button"
                  className={`copy-btn ${copied ? "is-done" : ""}`.trim()}
                  onClick={copyEmail}
                  aria-live="polite"
                >
                  {copied ? <Check /> : <Copy />}
                  {copied ? copy.contact.copiedLabel : copy.contact.copyLabel}
                </button>
              </div>
            </Reveal>

            <Reveal delay={220}>
              <ul className="socials">
                {profile.socials.map((s) => {
                  const Icon = iconMap[s.icon] ?? iconMap.mail;
                  return (
                    <li key={s.label}>
                      <a
                        className="social"
                        href={s.href}
                        target={s.href.startsWith("http") ? "_blank" : undefined}
                        rel={s.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      >
                        <Icon />
                        {s.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          </div>

          <Reveal delay={140} className="orb-wrap">
            <div className="orb" aria-hidden="true">
              <span className="orb__ring" />
              <span className="orb__ring orb__ring--2" />
              <span className="orb__ring orb__ring--3" />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
