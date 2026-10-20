"use client";

import { useEffect, useState } from "react";

/** 首屏加载过渡：进度条 → 淡出（≤3s 兜底，reduced-motion 直接跳过） */
export default function Loader({ name }: { name: string }) {
  const [pct, setPct] = useState(0);
  const [done, setDone] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDone(true);
      return;
    }

    document.body.style.overflow = "hidden";

    let value = 0;
    const timer = window.setInterval(() => {
      value = Math.min(100, value + 6 + Math.random() * 16);
      setPct(Math.round(value));
      if (value >= 100) {
        window.clearInterval(timer);
        window.setTimeout(() => setDone(true), 300);
      }
    }, 105);

    const safety = window.setTimeout(() => setDone(true), 2800);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(safety);
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (done) document.body.style.overflow = "";
  }, [done]);

  if (!mounted) return null;

  return (
    <div className={`loader ${done ? "is-done" : ""}`.trim()} aria-hidden={done}>
      <div className="loader__inner">
        <div className="loader__mark">Portfolio · 2026</div>
        <div className="loader__name">{name}</div>
        <div className="loader__bar">
          <span className="loader__fill" style={{ ["--w" as string]: `${pct}%` }} />
        </div>
        <div className="loader__pct">{String(pct).padStart(3, "0")} / 100</div>
      </div>
    </div>
  );
}
