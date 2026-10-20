"use client";

import { useEffect, useState } from "react";
import { fillContentTokens } from "@/data/career";
import { useSiteContent } from "./ContentProvider";
import { ArrowRight, Mail } from "./Icons";

export default function Hero() {
  const { profile, copy } = useSiteContent();
  const [typed, setTyped] = useState("");
  const [ready, setReady] = useState(false);

  const roles = profile.roles.length ? profile.roles : [""];
  const nameChars = Array.from(profile.name);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setTyped(roles[0]);
      setReady(true);
      return;
    }

    let timer = 0;
    let roleIdx = 0;
    let charIdx = 0;
    let deleting = false;
    let stopped = false;

    const step = () => {
      if (stopped) return;
      const word = roles[roleIdx];

      if (!deleting) {
        charIdx += 1;
        setTyped(word.slice(0, charIdx));
        if (charIdx >= word.length) {
          // 只配置了一个职业时打完就保留，不做删除重打
          if (roles.length <= 1) return;
          deleting = true;
          timer = window.setTimeout(step, 2000);
          return;
        }
        timer = window.setTimeout(step, 62 + Math.random() * 46);
      } else {
        charIdx -= 1;
        setTyped(word.slice(0, charIdx));
        if (charIdx <= 0) {
          deleting = false;
          roleIdx = (roleIdx + 1) % roles.length;
          timer = window.setTimeout(step, 320);
          return;
        }
        timer = window.setTimeout(step, 34);
      }
    };

    timer = window.setTimeout(step, 900);
    setReady(true);

    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
    // roles 变化时重新起打字动画（内容固定，实际只在预览时触发）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles.join("\u0000")]);

  return (
    <section id="hero" className="hero" aria-label="首屏">
      <div className="hero__glow" aria-hidden="true" />

      <div className="hero__inner">
        <div className="hero__eyebrow" style={{ opacity: ready ? 1 : 0, transition: "opacity .8s" }}>
          <i className="dot-live" aria-hidden="true" />
          {fillContentTokens(copy.hero.badge)}
        </div>

        <h1 className="hero__title">
          <span className="hero__latin" aria-hidden="true">
            {profile.latinName}
          </span>
          <span className="hero__name">
            {nameChars.map((char, i) => (
              <span key={i} style={{ animationDelay: `${120 + i * 90}ms` }}>
                {char}
              </span>
            ))}
          </span>
        </h1>

        <div className="hero__role">
          <span>{typed}</span>
          <i className="caret" aria-hidden="true" />
        </div>

        <p className="hero__tagline">{profile.tagline}</p>

        <div className="hero__cta">
          <a className="btn btn--primary" href="#projects">
            {copy.hero.ctaPrimary}
            <ArrowRight />
          </a>
          <a className="btn btn--ghost" href="#contact">
            <Mail />
            {copy.hero.ctaSecondary}
          </a>
        </div>

        <div className="hero__foot">
          <dl className="hero__stats">
            {profile.stats.map((s) => (
              <div key={s.label}>
                <dt className="stat__label">{s.label}</dt>
                <dd className="stat__value">{fillContentTokens(s.value)}</dd>
              </div>
            ))}
          </dl>

          <div className="scroll-hint" aria-hidden="true">
            <span>{copy.hero.scrollHint}</span>
            <span className="scroll-line" />
          </div>
        </div>
      </div>
    </section>
  );
}
