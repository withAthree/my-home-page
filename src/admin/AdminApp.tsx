"use client";

import { useEffect, useRef, useState } from "react";
import { NAV_GROUPS, PAGE_MAP } from "@/data/schema";
import { StudioProvider, useStudio, type PreviewDevice } from "./store";
import { DataPage, ListPage, OverviewPage, PanelsPage } from "./pages";
import { Toast } from "./ui/overlay";
import { Icon } from "./ui/Icon";
import "./admin.css";

const DEVICES: { id: PreviewDevice; icon: string; label: string }[] = [
  { id: "desktop", icon: "monitor", label: "桌面" },
  { id: "tablet", icon: "tablet", label: "平板" },
  { id: "phone", icon: "phone", label: "手机" },
];

export default function AdminApp() {
  return (
    <StudioProvider>
      <Shell />
    </StudioProvider>
  );
}

function Shell() {
  const {
    loading,
    mode,
    activePage,
    setActivePage,
    dirty,
    saving,
    save,
    errors,
    warnings,
    undo,
    redo,
    canUndo,
    canRedo,
    toast,
    previewOpen,
    setPreviewOpen,
    previewDevice,
    setPreviewDevice,
    config,
    info,
    issuesByPage,
    notify,
  } = useStudio();

  const [navOpen, setNavOpen] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const page = PAGE_MAP[activePage] ?? PAGE_MAP.overview;

  useEffect(() => {
    document.title = `${page.label} · 内容后台`;
  }, [page.label]);

  useEffect(() => {
    if (!previewOpen) return;
    const frame = frameRef.current;
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage({ type: "studio:preview", config }, "*");
  }, [config, previewOpen]);

  const go = (id: string) => {
    setActivePage(id);
    setNavOpen(false);
  };

  const totalIssues = errors.length + warnings.length;

  return (
    <div className={`adm${previewOpen ? " adm--split" : ""}`}>
      <aside className={`side${navOpen ? " is-open" : ""}`}>
        <div className="side__brand">
          <span className="side__logo">
            <Icon name="settings" size={16} />
          </span>
          <div>
            <strong>内容后台</strong>
            <small className="mono">site.config.ts</small>
          </div>
          <button type="button" className="side__close mini" onClick={() => setNavOpen(false)} aria-label="收起菜单">
            <Icon name="close" size={16} />
          </button>
        </div>

        <nav className="side__nav">
          {NAV_GROUPS.map((group) => (
            <div className="side__group" key={group.title}>
              <p className="side__title">{group.title}</p>
              {group.pages.map((item) => {
                const count = (issuesByPage[item.id] ?? []).length;
                const active = item.id === page.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`side__link${active ? " is-active" : ""}`}
                    onClick={() => go(item.id)}
                  >
                    <Icon name={item.icon} size={16} />
                    <span>{item.label}</span>
                    {count > 0 && <em className={`side__dot${active ? " is-active" : ""}`}>{count}</em>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="side__foot">
          <div className="side__status">
            <span className={mode === "studio" ? "dot dot--ok" : "dot dot--warn"} />
            {mode === "studio" ? "本地服务已连接" : "离线草稿模式"}
          </div>
          {mode === "studio" && info?.file && <p className="mono dim">{info.file}</p>}
          <a className="side__back" href="/" target="_blank" rel="noreferrer">
            <Icon name="external" size={14} />
            查看站点
          </a>
        </div>
      </aside>

      <div className="main">
        <header className="top">
          <button type="button" className="top__menu mini" onClick={() => setNavOpen(true)} aria-label="打开菜单">
            <Icon name="list" size={18} />
          </button>
          <div className="top__title">
            <h2>{page.label}</h2>
            <p>{page.desc}</p>
          </div>

          <div className="top__actions">
            <div className="top__group">
              <button type="button" className="mini" title="撤销 Ctrl+Z" disabled={!canUndo} onClick={undo}>
                <Icon name="undo" size={17} />
              </button>
              <button type="button" className="mini" title="重做 Ctrl+Shift+Z" disabled={!canRedo} onClick={redo}>
                <Icon name="redo" size={17} />
              </button>
            </div>

            <button
              type="button"
              className={`chipbtn${info?.site === "static" ? " is-warn" : ""}`}
              title={
                info?.site === "static"
                  ? "当前站点页面来自 out/ 构建产物，保存后需要重新构建才能看到变化"
                  : "站点由开发服务器实时渲染，保存后刷新即可看到变化"
              }
              onClick={() => setActivePage("data")}
            >
              <Icon name={info?.site === "static" ? "warning" : "check"} size={16} />
              <span>{info?.site === "static" ? "静态产物" : "实时"}</span>
            </button>

            <button
              type="button"
              className={`chipbtn${previewOpen ? " is-on" : ""}`}
              onClick={() => setPreviewOpen(!previewOpen)}
            >
              <Icon name="eye" size={16} />
              <span>实时预览</span>
            </button>

            <button
              type="button"
              className="chipbtn"
              onClick={() => {
                if (totalIssues === 0) notify("ok", "没有发现问题");
                else go("overview");
              }}
            >
              <Icon name={errors.length ? "warning" : "info"} size={16} />
              <span>{totalIssues}</span>
            </button>

            <button
              type="button"
              className={`btn btn--primary${dirty ? " is-dirty" : ""}`}
              onClick={() => void save()}
              disabled={saving || !dirty}
              title="保存 Ctrl+S"
            >
              <Icon name="save" size={15} />
              {saving ? "保存中…" : dirty ? "保存" : "已保存"}
            </button>
          </div>
        </header>

        <div className="body">
          {loading ? (
            <div className="loading">
              <span className="loading__ring" />
              <p>正在读取 src/data/site.config.ts …</p>
            </div>
          ) : page.kind === "overview" ? (
            <OverviewPage />
          ) : page.kind === "list" ? (
            <ListPage page={page} />
          ) : page.kind === "data" ? (
            <DataPage />
          ) : (
            <PanelsPage page={page} />
          )}
        </div>
      </div>

      {previewOpen && (
        <aside className="pv">
          <header className="pv__head">
            <div className="pv__title">
              <Icon name="device" size={15} />
              实时预览
            </div>
            <div className="pv__tools">
              {DEVICES.map((device) => (
                <button
                  type="button"
                  key={device.id}
                  className={`mini${previewDevice === device.id ? " is-active" : ""}`}
                  title={device.label}
                  onClick={() => setPreviewDevice(device.id)}
                >
                  <Icon name={device.icon} size={16} />
                </button>
              ))}
              <a className="mini" href="/?studio=1" target="_blank" rel="noreferrer" title="新窗口打开">
                <Icon name="external" size={16} />
              </a>
              <button type="button" className="mini" onClick={() => setPreviewOpen(false)} title="关闭预览">
                <Icon name="close" size={16} />
              </button>
            </div>
          </header>
          <div className={`pv__stage pv__stage--${previewDevice}`}>
            <iframe
              ref={frameRef}
              data-studio-preview="1"
              src="/?studio=1"
              title="站点实时预览"
              onLoad={() => {
                frameRef.current?.contentWindow?.postMessage({ type: "studio:preview", config }, "*");
              }}
            />
          </div>
          <p className="pv__hint">预览使用当前草稿实时渲染，保存后站点文件才会真正更新。</p>
        </aside>
      )}

      <Toast toast={toast} />
    </div>
  );
}
