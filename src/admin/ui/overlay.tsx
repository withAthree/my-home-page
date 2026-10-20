"use client";

import { useEffect, type ReactNode } from "react";
import { Icon } from "./Icon";

/* ------------------------------ Modal ------------------------------ */

export function Modal({
  open,
  title,
  desc,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  desc?: string;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="ovl" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="ovl__mask" aria-label="关闭" onClick={onClose} />
      <div className={`ovl__panel${wide ? " ovl__panel--wide" : ""}`}>
        <header className="ovl__head">
          <div>
            <h3>{title}</h3>
            {desc && <p>{desc}</p>}
          </div>
          <button type="button" className="mini" onClick={onClose} aria-label="关闭">
            <Icon name="close" size={16} />
          </button>
        </header>
        <div className="ovl__body">{children}</div>
        {footer && <footer className="ovl__foot">{footer}</footer>}
      </div>
    </div>
  );
}

/* ------------------------------ Toast ------------------------------ */

export function Toast({
  toast,
}: {
  toast: { kind: "ok" | "error" | "info"; text: string } | null;
}) {
  if (!toast) return null;
  const icon = toast.kind === "ok" ? "check" : toast.kind === "error" ? "warning" : "info";
  return (
    <div className={`toast toast--${toast.kind}`} role="status" aria-live="polite">
      <Icon name={icon} size={16} />
      <span>{toast.text}</span>
    </div>
  );
}

/* ------------------------------ 小组件 ------------------------------ */

export function Card({
  title,
  desc,
  extra,
  children,
  id,
}: {
  title?: string;
  desc?: string;
  extra?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section className="card" id={id}>
      {(title || extra) && (
        <header className="card__head">
          <div>
            {title && <h3>{title}</h3>}
            {desc && <p>{desc}</p>}
          </div>
          {extra}
        </header>
      )}
      <div className="card__body">{children}</div>
    </section>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "bad" | "brand";
}) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function Empty({ icon = "info", text }: { icon?: string; text: string }) {
  return (
    <div className="empty">
      <Icon name={icon} size={20} />
      <p>{text}</p>
    </div>
  );
}
