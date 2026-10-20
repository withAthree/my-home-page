"use client";

import { useMemo, useState } from "react";
import defaultConfig from "@/data/site.config";
import { buildConfigFile, isEqual } from "@/data/codegen";
import { PAGE_MAP, type AdminPage } from "@/data/schema";
import { FieldEditor, ItemList } from "@/admin/fields";
import { useStudio } from "@/admin/store";
import { Badge, Card, Empty, Modal } from "@/admin/ui/overlay";
import { Icon } from "@/admin/ui/Icon";

/* ------------------------------ 概览 ------------------------------ */

const QUICK_LINKS = ["profile", "projects", "gallery", "copy", "seo", "theme"];

export function OverviewPage() {
  const {
    config,
    mode,
    info,
    git,
    errors,
    warnings,
    setActivePage,
    dirty,
    backups,
    issuesByPage,
  } = useStudio();

  const profile = (config.profile ?? {}) as Record<string, unknown>;
  const counts = [
    { label: "项目作品", value: ((config.projects as unknown[]) ?? []).length, page: "projects", icon: "layers" },
    { label: "摄影作品", value: ((config.gallery as unknown[]) ?? []).length, page: "gallery", icon: "camera" },
    { label: "经历节点", value: ((config.timeline as unknown[]) ?? []).length, page: "timeline", icon: "timeline" },
    { label: "技能分类", value: ((config.skills as unknown[]) ?? []).length, page: "skills", icon: "grid" },
  ];

  const issueList = [...errors, ...warnings];

  return (
    <div className="stack">
      <section className="hero">
        <div className="hero__text">
          <p className="hero__eyebrow">内容后台 · Studio</p>
          <h1>
            {String(profile.name || "站点")}
            <span className="hero__latin">{String(profile.latinName || "")}</span>
          </h1>
          <p className="hero__tagline">{String(profile.tagline || "")}</p>
        </div>
        <div className="hero__meta">
          <div className="hero__row">
            <span className={mode === "studio" ? "dot dot--ok" : "dot dot--warn"} />
            {mode === "studio" ? "已连接本地服务，可直接写入文件" : "离线模式：草稿存在浏览器里"}
          </div>
          {mode === "studio" && info?.file && (
            <div className="hero__row mono dim">{info.file}</div>
          )}
          {git?.repo && (
            <div className="hero__row mono dim">
              <Icon name="git" size={14} />
              git {git.branch || "—"} · {git.dirty ? "有未提交改动" : "干净"}
            </div>
          )}
          <div className="hero__row">
            {dirty ? <Badge tone="warn">有未保存的修改</Badge> : <Badge tone="ok">已同步</Badge>}
            {mode === "studio" && <Badge>{backups.length} 个备份</Badge>}
          </div>
        </div>
      </section>

      <div className="stats">
        {counts.map((item) => (
          <button type="button" key={item.page} className="stat" onClick={() => setActivePage(item.page)}>
            <Icon name={item.icon} size={18} />
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <Card
        title="内容体检"
        desc="错误会阻止保存，提醒只是建议"
        extra={
          <div className="card__badges">
            <Badge tone={errors.length ? "bad" : "ok"}>{errors.length} 个错误</Badge>
            <Badge tone={warnings.length ? "warn" : "neutral"}>{warnings.length} 条提醒</Badge>
          </div>
        }
      >
        {issueList.length === 0 ? (
          <Empty icon="check" text="一切正常，可以放心发布了。" />
        ) : (
          <ul className="issues">
            {issueList.map((issue, index) => {
              const page = issue.pageId ? PAGE_MAP[issue.pageId] : undefined;
              const count = issue.pageId ? (issuesByPage[issue.pageId]?.length ?? 0) : 0;
              return (
                <li key={`${issue.path}-${index}`} className={`issues__item issues__item--${issue.level}`}>
                  <Icon name={issue.level === "error" ? "warning" : "info"} size={15} />
                  <div className="issues__text">
                    <p>{issue.message}</p>
                    <small className="mono">{issue.path || "全局"}</small>
                  </div>
                  {page && (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setActivePage(page.id)}>
                      去处理{count > 1 ? `（${count}）` : ""}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="快速开始" desc="最常改的几个地方">
        <div className="quick">
          {QUICK_LINKS.map((id) => {
            const page: AdminPage | undefined = PAGE_MAP[id];
            if (!page) return null;
            return (
              <button type="button" key={id} className="quick__item" onClick={() => setActivePage(id)}>
                <Icon name={page.icon} size={16} />
                <span>
                  <strong>{page.label}</strong>
                  <small>{page.desc}</small>
                </span>
                <Icon name="right" size={14} />
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------ 面板型页面（单对象） ------------------------------ */

export function PanelsPage({ page }: { page: AdminPage }) {
  return (
    <div className="stack">
      {(page.panels ?? []).map((panel) => {
        const normal = panel.fields.filter((field) => !field.advanced);
        const advanced = panel.fields.filter((field) => field.advanced);
        return (
          <Card key={panel.id} title={panel.title} desc={panel.desc}>
            <div className="grid">
              {normal.map((field) => (
                <FieldEditor key={field.key} field={field} parentPath={panel.path} />
              ))}
            </div>
            {advanced.length > 0 && (
              <details className="adv">
                <summary>更多设置（{advanced.length}）</summary>
                <div className="grid">
                  {advanced.map((field) => (
                    <FieldEditor key={field.key} field={field} parentPath={panel.path} />
                  ))}
                </div>
              </details>
            )}
          </Card>
        );
      })}
    </div>
  );
}

/* ------------------------------ 列表型页面 ------------------------------ */

export function ListPage({ page }: { page: AdminPage }) {
  const { issuesByPage, setActivePage, config } = useStudio();
  const issues = issuesByPage[page.id] ?? [];
  const items = page.listPath ? ((config[page.listPath.split(".")[0]] as unknown[]) ?? []) : [];

  return (
    <div className="stack">
      {issues.length > 0 && (
        <div className="notice">
          <Icon name="info" size={16} />
          <div>
            <strong>这个页面有 {issues.length} 条需要留意</strong>
            <ul>
              {issues.slice(0, 4).map((issue, index) => (
                <li key={index}>{issue.message}</li>
              ))}
              {issues.length > 4 && <li>……还有 {issues.length - 4} 条</li>}
            </ul>
          </div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setActivePage("overview")}>
            看全部
          </button>
        </div>
      )}

      <ItemList
        path={page.listPath ?? ""}
        fields={page.itemFields ?? []}
        titleTpl={page.itemTitle}
        subtitleTpl={page.itemSubtitle}
        thumbKey={page.itemThumb}
        addLabel={page.addLabel}
        minItems={page.minItems}
        newItem={page.newItem}
        label={page.label}
        hint={page.desc}
      />
      <p className="dim mono">{items.length} 条数据 · 后台会保持你在表单里排的顺序</p>
    </div>
  );
}

/* ------------------------------ 数据与发布 ------------------------------ */

interface DiffLine {
  type: "same" | "add" | "del";
  text: string;
}

/** 极简行级 diff（LCS），用来肉眼确认将要写入的改动 */
function lineDiff(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const m = a.length;
  const n = b.length;
  const table: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      lines.push({ type: "same", text: a[i] });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      lines.push({ type: "del", text: a[i] });
      i += 1;
    } else {
      lines.push({ type: "add", text: b[j] });
      j += 1;
    }
  }
  while (i < m) {
    lines.push({ type: "del", text: a[i] });
    i += 1;
  }
  while (j < n) {
    lines.push({ type: "add", text: b[j] });
    j += 1;
  }
  return lines;
}

export function DataPage() {
  const {
    mode,
    config,
    base,
    source,
    generatedText,
    dirty,
    save,
    saving,
    reload,
    resetAll,
    exportFile,
    exportJson,
    discardLocalDraft,
    backups,
    restoreBackup,
    refreshBackups,
    git,
    commitGit,
    notify,
    info,
    building,
    buildSite,
  } = useStudio();

  const [commitMessage, setCommitMessage] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(true);

  const before = useMemo(() => {
    if (source) return source;
    return buildConfigFile(defaultConfig);
  }, [source]);

  const diff = useMemo(() => lineDiff(before, generatedText || before), [before, generatedText]);
  const added = diff.filter((line) => line.type === "add").length;
  const removed = diff.filter((line) => line.type === "del").length;
  const changed = added + removed;

  const changedSnippet = useMemo(() => {
    if (!changed) return [] as DiffLine[];
    const firstChange = diff.findIndex((line) => line.type !== "same");
    const from = Math.max(0, firstChange - 2);
    return diff.slice(from, from + 60).filter((line, index) => line.type !== "same" || index < 3);
  }, [diff, changed]);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify("ok", `已复制${label}`);
    } catch {
      notify("error", "浏览器不允许剪贴板写入，请手动选择复制");
    }
  };

  return (
    <div className="stack">
      <Card
        title="保存与发布"
        desc={
          mode === "studio"
            ? "保存会写到 src/data/site.config.ts，并自动备份上一版"
            : "未连接本地服务：保存只写入浏览器草稿，不会改文件"
        }
        extra={<Badge tone={dirty ? "warn" : "ok"}>{dirty ? "有未保存修改" : "已同步"}</Badge>}
      >
        <div className="rows rows--tight">
          <div className="rowline">
            <button type="button" className="btn btn--primary" onClick={() => void save()} disabled={saving}>
              <Icon name="save" size={15} />
              {saving ? "保存中…" : dirty ? "保存修改" : "没有改动"}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => void reload()}>
              <Icon name="refresh" size={15} />
              从磁盘重载
            </button>
            <button type="button" className="btn btn--ghost" onClick={exportFile}>
              <Icon name="download" size={15} />
              下载 site.config.ts
            </button>
            <button type="button" className="btn btn--ghost" onClick={exportJson}>
              <Icon name="download" size={15} />
              导出 JSON
            </button>
          </div>
          {mode === "local" && (
            <p className="fld__hint">
              想把改动写回文件：在项目目录运行 <code>npm run admin</code>，然后从它打开的地址进入后台。
              也可以直接下载上面的 <code>site.config.ts</code> 覆盖 <code>src/data/site.config.ts</code>。
            </p>
          )}
        </div>
      </Card>

      <Card
        title="站点构建"
        desc={
          info?.site === "static"
            ? "当前预览读的是 out/ 构建产物：内容保存后必须重新构建，正式站点才会变"
            : "开发服务器会实时反映改动，一般不需要手动构建；部署前记得构建一次"
        }
        extra={<Badge tone={info?.site === "static" ? "warn" : "ok"}>{info?.site === "static" ? "静态产物" : "实时开发服务"}</Badge>}
      >
        <div className="rows rows--tight">
          <div className="rowline">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void buildSite()}
              disabled={building || mode !== "studio" || info?.site === "dev"}
            >
              <Icon name="refresh" size={15} />
              {building ? "构建中…（约 30 秒）" : "重新构建站点"}
            </button>
            <span className="fld__hint">
              {mode !== "studio"
                ? "需要本地服务才能构建（npm run admin）"
                : info?.site === "dev"
                  ? "开发模式下实时渲染，不需要构建"
                  : "执行 next build，完成后刷新站点即可看到最新内容"}
            </span>
          </div>
        </div>
      </Card>

      <Card
        title="改动预览"
        desc={`对比当前文件与将要写入的内容：${added ? `+${added} ` : ""}${removed ? `−${removed}` : ""}${
          changed ? "" : "（没有差异）"
        }`}
        extra={
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowDiff((v) => !v)}>
            {showDiff ? "收起" : "展开"}
          </button>
        }
      >
        {!changed ? (
          <Empty icon="check" text="草稿与文件一致。" />
        ) : showDiff ? (
          <pre className="diff">
            {changedSnippet.map((line, index) => (
              <div key={index} className={`diff__line diff__line--${line.type}`}>
                <span className="diff__mark">{line.type === "add" ? "+" : line.type === "del" ? "−" : " "}</span>
                <span className="diff__text">{line.text || " "}</span>
              </div>
            ))}
          </pre>
        ) : null}
        {changed > changedSnippet.length && (
          <p className="fld__hint">只展示前 60 行改动；完整内容见下方「生成的源码」。</p>
        )}
      </Card>

      <Card
        title="生成的源码"
        desc="这就是保存时写入文件的内容（可直接复制替换）"
        extra={
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => void copy(generatedText, "源码")}
          >
            <Icon name="copy" size={14} />
            复制
          </button>
        }
      >
        <textarea className="inp inp--code" rows={12} readOnly value={generatedText} spellCheck={false} />
      </Card>

      {mode === "studio" && (
        <>
          <Card
            title="备份与回滚"
            desc={`每次保存前都会把上一版存进 .studio/backups/（最多保留 40 份）`}
            extra={
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => void refreshBackups()}>
                <Icon name="refresh" size={14} />
                刷新
              </button>
            }
          >
            {backups.length === 0 ? (
              <Empty icon="database" text="还没有备份，第一次保存后就会出现。" />
            ) : (
              <ul className="backups">
                {backups.slice(0, 12).map((backup) => (
                  <li key={backup.name}>
                    <span className="mono">{backup.name}</span>
                    <span className="dim">{new Date(backup.mtime).toLocaleString("zh-CN")}</span>
                    <span className="dim mono">{(backup.size / 1024).toFixed(1)} KB</span>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRestoreTarget(backup.name)}>
                      回滚到此版本
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Git"
            desc="保存后可以一键提交，保持提交历史干净"
            extra={
              git?.repo ? (
                <Badge tone={git.dirty ? "warn" : "ok"}>{git.dirty ? "有未提交改动" : "工作区干净"}</Badge>
              ) : (
                <Badge>不是 git 仓库</Badge>
              )
            }
          >
            {git?.repo ? (
              <div className="rows rows--tight">
                <p className="fld__hint">
                  分支 <code>{git.branch || "—"}</code>
                  {info?.autoGit ? " · 已开启保存后自动提交" : " · 自动提交关闭（可用 npm run admin -- --git 打开）"}
                </p>
                <div className="rowline">
                  <input
                    className="inp"
                    value={commitMessage}
                    placeholder="chore(content): 更新站点内容"
                    onChange={(event) => setCommitMessage(event.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => void commitGit(commitMessage)}
                  >
                    <Icon name="git" size={15} />
                    提交到 Git
                  </button>
                </div>
              </div>
            ) : (
              <p className="fld__hint">当前目录没有 .git，跳过版本管理也不影响保存。</p>
            )}
          </Card>
        </>
      )}

      <Card title="危险操作" desc="做完就回不去了，操作前会自动留一份备份">
        <div className="rowline">
          <DangerButton
            label="恢复为仓库默认内容"
            confirmLabel="确认恢复默认"
            onConfirm={() => {
              resetAll();
              notify("info", "已恢复默认内容，记得点保存才会写文件");
            }}
          />
          {mode === "local" && (
            <DangerButton
              label="清空浏览器草稿"
              confirmLabel="确认清空草稿"
              onConfirm={discardLocalDraft}
            />
          )}
        </div>
        {!isEqual(base, config) && <p className="fld__hint">当前草稿与「已保存内容」不同，恢复默认会覆盖草稿。</p>}
      </Card>

      <Card title="命令行速查" desc="不用后台也能做同样的事">
        <pre className="code">
{`npm run dev          # 本地预览站点（http://localhost:4000）
npm run admin        # 打开内容后台（自动代理上面的 dev 服务）
npm run admin:static # 已构建过 out/ 时，直接用静态产物开后台
npm run content:check # 校验 site.config.ts，可放进 CI`}
        </pre>
      </Card>

      <Modal
        open={Boolean(restoreTarget)}
        title="确认回滚？"
        desc={`即将用备份 ${restoreTarget ?? ""} 覆盖 src/data/site.config.ts，当前版本会自动备份。`}
        onClose={() => setRestoreTarget(null)}
        footer={
          <div className="rowline">
            <button type="button" className="btn btn--ghost" onClick={() => setRestoreTarget(null)}>
              取消
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                if (restoreTarget) void restoreBackup(restoreTarget);
                setRestoreTarget(null);
              }}
            >
              确认回滚
            </button>
          </div>
        }
      />
    </div>
  );
}

function DangerButton({
  label,
  confirmLabel,
  onConfirm,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      type="button"
      className={`btn ${armed ? "btn--danger" : "btn--ghost"}`}
      onClick={() => {
        if (armed) {
          onConfirm();
          setArmed(false);
        } else {
          setArmed(true);
          setTimeout(() => setArmed(false), 4000);
        }
      }}
    >
      <Icon name="warning" size={15} />
      {armed ? confirmLabel : label}
    </button>
  );
}
