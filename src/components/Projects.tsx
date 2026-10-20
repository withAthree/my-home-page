"use client";

import type { MouseEvent } from "react";
import { useSiteContent } from "./ContentProvider";
import RichTitle from "./RichTitle";
import Reveal from "./Reveal";
import { ArrowUpRight, Github } from "./Icons";

export default function Projects() {
  const { projects, copy } = useSiteContent();

  const handleMove = (e: MouseEvent<HTMLElement>) => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    el.style.setProperty("--rx", `${(0.5 - py) * 7}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * 9}deg`);
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
  };

  const handleLeave = (e: MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <section id="projects" className="section" aria-label="项目作品">
      <div className="container">
        <div className="section-head">
          <Reveal>
            <div className="section-index">{copy.projects.index}</div>
            <RichTitle className="section-title" text={copy.projects.title} />
          </Reveal>
          <Reveal delay={120}>
            <p className="section-sub">{copy.projects.sub}</p>
          </Reveal>
        </div>

        <div className="project-grid">
          {projects.map((p, i) => (
            <Reveal key={p.id} delay={i * 110}>
              <article
                className="card"
                onMouseMove={handleMove}
                onMouseLeave={handleLeave}
                style={{ height: "100%" }}
              >
                <div className="card__media">
                  <span className="card__year">{p.year}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.cover} alt={`${p.title} 封面`} loading="lazy" width={800} height={500} />
                </div>

                <div className="card__body">
                  <span className="card__codename" style={{ color: p.accent }}>
                    {p.codename}
                  </span>
                  <h3 className="card__title">{p.title}</h3>
                  <p className="card__desc">{p.summary}</p>

                  <ul className="tags">
                    {p.tags.map((t) => (
                      <li className="tag" key={t}>
                        {t}
                      </li>
                    ))}
                  </ul>

                  {/* 无公开链接的项目只展示卡片，不渲染按钮 */}
                  {(p.demoUrl || p.repoUrl) && (
                    <div className="card__links">
                      {p.demoUrl && (
                        <a
                          className="link-btn link-btn--primary"
                          href={p.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {copy.projects.demoLabel}
                          <ArrowUpRight />
                        </a>
                      )}
                      {p.repoUrl && (
                        <a
                          className="link-btn"
                          href={p.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Github />
                          {copy.projects.repoLabel}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
