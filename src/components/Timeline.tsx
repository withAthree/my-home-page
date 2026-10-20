"use client";

import { useEffect, useRef } from "react";
import { useSiteContent } from "./ContentProvider";
import RichTitle from "./RichTitle";
import Reveal from "./Reveal";

export default function Timeline() {
  const { timeline, copy } = useSiteContent();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;

    const items = Array.from(root.querySelectorAll<HTMLElement>(".tl__item"));
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -5% 0px" }
    );

    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [timeline.length]);

  return (
    <section id="timeline" className="section" aria-label="经历时间线">
      <div className="container">
        <div className="section-head">
          <Reveal>
            <div className="section-index">{copy.timeline.index}</div>
            <RichTitle className="section-title" text={copy.timeline.title} />
          </Reveal>
          <Reveal delay={120}>
            <p className="section-sub">{copy.timeline.sub}</p>
          </Reveal>
        </div>

        <div className="timeline" ref={wrapRef}>
          {timeline.map((item, i) => (
            <div
              className="tl__item reveal"
              key={`${item.org}-${item.period}`}
              style={{ ["--d" as string]: `${i * 80}ms` }}
            >
              <span className="tl__node" aria-hidden="true" />
              <div className="tl__card">
                <span className="tl__period">{item.period}</span>
                <h3 className="tl__org">{item.org}</h3>
                <p className="tl__role">{item.role}</p>
                <ul className="tl__points">
                  {item.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
