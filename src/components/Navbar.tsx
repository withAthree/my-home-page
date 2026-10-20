"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSiteContent } from "./ContentProvider";

export default function Navbar() {
  const { nav, profile, copy } = useSiteContent();
  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("hero");
  const [progress, setProgress] = useState(0);
  const ticking = useRef(false);

  const update = useCallback(() => {
    ticking.current = false;
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    setStuck(window.scrollY > 24);

    const line = window.innerHeight * 0.32;
    let current = nav[0]?.id ?? "hero";
    for (const item of nav) {
      const el = document.getElementById(item.id);
      if (el && el.getBoundingClientRect().top <= line) current = item.id;
    }
    setActive(current);
  }, [nav]);

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [update]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div className="progress-bar" style={{ ["--p" as string]: progress }} aria-hidden="true" />

      <header className={`nav ${stuck ? "is-stuck" : ""}`.trim()}>
        <nav className="nav__inner" aria-label="主导航">
          <a
            className="nav__logo"
            href="#hero"
            onClick={() => setOpen(false)}
            aria-label={`${profile.name} · 回到顶部`}
          >
            <span className="nav__mark" aria-hidden="true">
              {profile.name.charAt(0)}
            </span>
            <span>
              {profile.name}
              <span style={{ color: "var(--ink-mute)", fontWeight: 400 }}>
                {copy.nav.logoSuffix}
              </span>
            </span>
          </a>

          <ul className="nav__links">
            {nav.map((item) => (
              <li key={item.id}>
                <a
                  className={`nav__link ${active === item.id ? "is-active" : ""}`.trim()}
                  href={item.href}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="nav__actions">
            <span className="nav__status">
              <i className="dot-live" aria-hidden="true" />
              {copy.nav.status}
            </span>
            <button
              type="button"
              className={`nav__toggle ${open ? "is-open" : ""}`.trim()}
              aria-label={open ? "关闭菜单" : "打开菜单"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <span />
              <span />
            </button>
          </div>
        </nav>
      </header>

      {open && (
        <div className="nav__mobile" role="dialog" aria-label="移动端菜单">
          {nav.map((item) => (
            <a key={item.id} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </a>
          ))}
        </div>
      )}
    </>
  );
}
