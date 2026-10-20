"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSiteContent } from "./ContentProvider";
import RichTitle from "./RichTitle";
import Reveal from "./Reveal";
import { ArrowLeft, ArrowRight, Close, Grid, Layers } from "./Icons";

export default function Gallery() {
  const { gallery, copy } = useSiteContent();
  const [filter, setFilter] = useState<string>("__all__");
  const [mode, setMode] = useState<"grid" | "stage">("grid");
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ startX: 0, startOffset: 0, moved: false });

  // 分类来自配置：第一项固定是「全部」，其余为 copy.gallery.categories
  const categories = useMemo(
    () => [{ key: "__all__", label: copy.gallery.allLabel }, ...copy.gallery.categories.map((c) => ({ key: c, label: c }))],
    [copy.gallery.allLabel, copy.gallery.categories]
  );

  const photos = useMemo(
    () => (filter === "__all__" ? gallery : gallery.filter((p) => p.category === filter)),
    [filter, gallery]
  );

  // 分类被改名/删除后，当前筛选回落到「全部」
  useEffect(() => {
    if (filter !== "__all__" && !copy.gallery.categories.includes(filter)) setFilter("__all__");
  }, [filter, copy.gallery.categories]);

  const clampOffset = (v: number) =>
    Math.max(-0.35, Math.min(photos.length - 1 + 0.35, v));

  // 切换筛选 / 视图时复位
  useEffect(() => {
    setOffset(0);
    setLightbox(null);
  }, [filter, mode]);

  // 灯箱：滚动锁定 + 键盘
  useEffect(() => {
    if (lightbox === null) return;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox((i) => (i === null ? i : (i + 1) % photos.length));
      if (e.key === "ArrowLeft")
        setLightbox((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, photos.length]);

  // 3D 画廊：拖拽（用 window 监听，避免 setPointerCapture 抢走子元素的 click）
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = { startX: e.clientX, startOffset: offset, moved: false };
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - dragState.current.startX;
      if (Math.abs(dx) > 4) dragState.current.moved = true;
      const stepPx = stageRef.current ? stageRef.current.clientWidth * 0.24 : 240;
      setOffset(clampOffset(dragState.current.startOffset - dx / stepPx));
    };

    const onUp = () => {
      setDragging(false);
      setOffset((v) => Math.round(clampOffset(v)));
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, photos.length]);

  const step = (dir: number) => {
    setOffset((v) => Math.round(Math.max(0, Math.min(photos.length - 1, Math.round(v) + dir))));
  };

  const activePhoto = lightbox !== null ? photos[lightbox] : null;

  return (
    <section id="gallery" className="section" aria-label="摄影集">
      <div className="container">
        <div className="section-head">
          <Reveal>
            <div className="section-index">{copy.gallery.index}</div>
            <RichTitle className="section-title" text={copy.gallery.title} />
          </Reveal>
          <Reveal delay={120}>
            <p className="section-sub">{copy.gallery.sub}</p>
          </Reveal>
        </div>

        <div className="gallery__bar">
          <div className="filter-chips" role="tablist" aria-label="照片分类">
            {categories.map((c) => (
              <button
                key={c.key}
                type="button"
                role="tab"
                aria-selected={filter === c.key}
                className={`filter-chip ${filter === c.key ? "is-active" : ""}`.trim()}
                onClick={() => setFilter(c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="seg" role="group" aria-label="浏览方式">
            <button
              type="button"
              className={`seg__btn ${mode === "grid" ? "is-active" : ""}`.trim()}
              onClick={() => setMode("grid")}
            >
              <Grid />
              {copy.gallery.viewGrid}
            </button>
            <button
              type="button"
              className={`seg__btn ${mode === "stage" ? "is-active" : ""}`.trim()}
              onClick={() => setMode("stage")}
            >
              <Layers />
              {copy.gallery.viewStage}
            </button>
          </div>
        </div>

        {mode === "grid" ? (
          <div className="masonry">
            {photos.map((photo, i) => (
              <Reveal key={photo.id} delay={(i % 3) * 70}>
                <button
                  type="button"
                  className="photo"
                  onClick={() => setLightbox(i)}
                  aria-label={`查看大图：${photo.title}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />
                  <span className="photo__overlay">
                    <span className="photo__title">{photo.title}</span>
                    <span className="photo__meta">
                      {photo.category} · {photo.location} · {photo.date}
                    </span>
                  </span>
                </button>
              </Reveal>
            ))}
          </div>
        ) : (
          <>
            <div
              className={`stage ${dragging ? "is-dragging" : ""}`.trim()}
              ref={stageRef}
              onPointerDown={onPointerDown}
              role="listbox"
              aria-label="3D 照片墙，可左右拖动"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") step(1);
                if (e.key === "ArrowLeft") step(-1);
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setLightbox(Math.round(offset));
                }
              }}
            >
              {photos.map((photo, i) => {
                const d = i - offset;
                const abs = Math.abs(d);
                const clamped = Math.max(-4, Math.min(4, d));
                const isCenter = abs < 0.5;

                return (
                  <div
                    key={photo.id}
                    role="option"
                    aria-selected={isCenter}
                    className={`stage__item ${isCenter ? "is-center" : ""}`.trim()}
                    style={{
                      transform: `translateX(${d * 58}%) translateZ(${-abs * 170}px) rotateY(${
                        -clamped * 24
                      }deg) scale(${1 - Math.min(abs, 4) * 0.05})`,
                      opacity: abs > 4.2 ? 0 : Math.max(0.16, 1 - abs * 0.2),
                      zIndex: 100 - Math.round(abs * 10),
                      pointerEvents: abs > 4.2 ? "none" : "auto",
                    }}
                    onClick={() => {
                      if (dragState.current.moved) return;
                      if (isCenter) setLightbox(i);
                      else setOffset(i);
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />
                    <span className="stage__caption">
                      <b>{photo.title}</b>
                      <span>
                        {photo.category} · {photo.location} · {photo.date}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="stage__ctrl">
              <button
                type="button"
                className="stage__btn"
                onClick={() => step(-1)}
                aria-label="上一张"
              >
                <ArrowLeft />
              </button>
              <span className="stage__count">
                {String(Math.round(offset) + 1).padStart(2, "0")} /{" "}
                {String(photos.length).padStart(2, "0")}
              </span>
              <button
                type="button"
                className="stage__btn"
                onClick={() => step(1)}
                aria-label="下一张"
              >
                <ArrowRight />
              </button>
            </div>
          </>
        )}
      </div>

      {activePhoto && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={activePhoto.title}
          onClick={() => setLightbox(null)}
        >
          <figure className="lightbox__figure" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="lb-btn lb-btn--close"
              onClick={() => setLightbox(null)}
              aria-label="关闭"
            >
              <Close />
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="lightbox__img" src={activePhoto.src} alt={activePhoto.alt} />

            <figcaption className="lightbox__bar">
              <div>
                <div className="lightbox__title">{activePhoto.title}</div>
                <div className="lightbox__meta">
                  {activePhoto.category} · {activePhoto.location} · {activePhoto.date}
                </div>
              </div>

              <div className="lightbox__actions">
                <button
                  type="button"
                  className="lb-btn"
                  aria-label="上一张"
                  onClick={() =>
                    setLightbox((i) =>
                      i === null ? i : (i - 1 + photos.length) % photos.length
                    )
                  }
                >
                  <ArrowLeft />
                </button>
                <button
                  type="button"
                  className="lb-btn"
                  aria-label="下一张"
                  onClick={() => setLightbox((i) => (i === null ? i : (i + 1) % photos.length))}
                >
                  <ArrowRight />
                </button>
              </div>
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}
