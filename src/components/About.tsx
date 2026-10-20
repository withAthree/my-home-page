"use client";

import { useEffect, useRef, useState } from "react";
import { useSiteContent } from "./ContentProvider";
import RichTitle from "./RichTitle";
import Reveal from "./Reveal";

export default function About() {
  const { profile, skills, copy } = useSiteContent();
  const [filled, setFilled] = useState(false);
  const skillsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFilled(true);
      return;
    }
    const el = skillsRef.current;
    if (!el || !("IntersectionObserver" in window)) {
      setFilled(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setFilled(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="about" className="section" aria-label="关于我">
      <div className="container">
        <div className="section-head">
          <Reveal>
            <div className="section-index">{copy.about.index}</div>
            <RichTitle className="section-title" text={copy.about.title} />
          </Reveal>
          <Reveal delay={120}>
            <p className="section-sub">{copy.about.sub}</p>
          </Reveal>
        </div>

        <div className="about__grid">
          {/* 左栏：头像 + 标签 + 元信息 */}
          <div className="about__left">
            <Reveal>
              <div className="avatar-wrap">
                <div className="avatar">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={profile.avatar} alt={`${profile.name}的头像`} width={300} height={300} />
                </div>
                <span className="avatar__badge">
                  <i className="dot-live" aria-hidden="true" />
                  {copy.about.avatarBadge}
                </span>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <ul className="chips">
                {profile.keywords.map((k) => (
                  <li key={k} className="chip">
                    {k}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={160}>
              <div className="about__meta">
                <span>
                  {copy.about.locationLabel} · <b>{profile.location}</b>
                </span>
                <span>
                  {profile.latinName} / <b>{profile.roles[0]}</b>
                </span>
              </div>
            </Reveal>
          </div>

          {/* 右栏：简介 + 技能 */}
          <div className="about__right">
            <Reveal>
              <div className="bio">
                {profile.bio.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </Reveal>

            <div className="skills" ref={skillsRef}>
              {skills.map((group, gi) => (
                <Reveal key={group.category} delay={gi * 90}>
                  <div className="skill-group">
                    <div className="skill-group__head">
                      <span className="skill-group__name">{group.category}</span>
                      <span className="skill-group__caption">{group.caption}</span>
                      <span className="skill-group__rule" aria-hidden="true" />
                    </div>

                    {group.items.map((item, ii) => (
                      <div className="skill" key={item.name}>
                        <span className="skill__name">{item.name}</span>
                        <span
                          className="skill__track"
                          role="meter"
                          aria-valuenow={item.level}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${item.name} 熟练度`}
                        >
                          <span
                            className="skill__fill"
                            style={{
                              width: filled ? `${item.level}%` : 0,
                              ["--d" as string]: `${gi * 90 + ii * 70}ms`,
                            }}
                          />
                        </span>
                        <span className="skill__val">{item.level}</span>
                      </div>
                    ))}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
