"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./ui/Icon";
import { Modal } from "./ui/overlay";
import { getAt, useFieldError, useStudio } from "./store";
import { fillContentTokens } from "@/data/career";
import {
  formatTemplate,
  type FieldDef,
  type StringOption,
  type Validator,
} from "@/data/schema";

/* ------------------------------ 小工具 ------------------------------ */

export function joinPath(parent: string, key: string): string {
  return parent ? `${parent}.${key}` : key;
}

function asString(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value);
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((v) => asString(v)) : [];
}

/** 渲染标题里的 *强调* 与换行 */
export function Markup({ text }: { text: string }) {
  const lines = asString(text).split("\n");
  return (
    <>
      {lines.map((line, lineIndex) => (
        <Fragment key={lineIndex}>
          {lineIndex > 0 && <br />}
          {line.split(/(\*[^*]+\*)/g).map((part, i) =>
            part.startsWith("*") && part.endsWith("*") && part.length > 2 ? (
              <em key={i}>{part.slice(1, -1)}</em>
            ) : (
              <Fragment key={i}>{part}</Fragment>
            )
          )}
        </Fragment>
      ))}
    </>
  );
}

function resolveOptions(
  field: FieldDef,
  config: Record<string, unknown>
): StringOption[] {
  if (field.options) return field.options;
  if (!field.optionsFrom) return [];
  const source = getAt(config, field.optionsFrom);
  if (!Array.isArray(source)) return [];
  const sliced = source.slice(field.optionsSkip ?? 0);
  return sliced
    .map((entry) => {
      if (typeof entry === "string") return { value: entry, label: entry };
      if (entry && typeof entry === "object") {
        const obj = entry as Record<string, unknown>;
        const value = asString(obj[field.optionsValueKey ?? "id"]);
        const label = asString(obj[field.optionsLabelKey ?? "label"]) || value;
        return { value, label };
      }
      return null;
    })
    .filter((option): option is StringOption => Boolean(option && option.value));
}

/* ------------------------------ 输入控件 ------------------------------ */

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  invalid?: boolean;
}) {
  return (
    <input
      className={`inp${invalid ? " inp--bad" : ""}`}
      type={type}
      value={value}
      placeholder={placeholder}
      spellCheck={false}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function ChipsInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    if (value.includes(text)) {
      setDraft("");
      return;
    }
    onChange([...value, text]);
    setDraft("");
  };

  return (
    <div className="chips">
      {value.map((chip, index) => (
        <span className="chip" key={`${chip}-${index}`}>
          {chip}
          <button
            type="button"
            className="chip__x"
            aria-label={`删除 ${chip}`}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            <Icon name="close" size={12} />
          </button>
        </span>
      ))}
      <input
        className="chips__inp"
        value={draft}
        placeholder={placeholder ?? "输入后回车"}
        onChange={(event) => {
          const text = event.target.value;
          if (/[,，]/.test(text)) commit(text.replace(/[,，]/g, ""));
          else setDraft(text);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(draft);
          } else if (event.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => commit(draft)}
      />
    </div>
  );
}

function ParagraphsEditor({
  value,
  onChange,
  addLabel,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  addLabel?: string;
}) {
  return (
    <div className="rows">
      {value.map((text, index) => (
        <div className="rows__item" key={index}>
          <textarea
            className="inp inp--area"
            rows={3}
            value={text}
            onChange={(event) => {
              const next = [...value];
              next[index] = event.target.value;
              onChange(next);
            }}
          />
          <div className="rows__tools">
            <button
              type="button"
              className="mini"
              title="上移"
              disabled={index === 0}
              onClick={() => {
                const next = [...value];
                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                onChange(next);
              }}
            >
              <Icon name="up" size={14} />
            </button>
            <button
              type="button"
              className="mini"
              title="下移"
              disabled={index === value.length - 1}
              onClick={() => {
                const next = [...value];
                [next[index + 1], next[index]] = [next[index], next[index + 1]];
                onChange(next);
              }}
            >
              <Icon name="down" size={14} />
            </button>
            <button
              type="button"
              className="mini mini--danger"
              title="删除这一段"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              <Icon name="trash" size={14} />
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange([...value, ""])}>
        <Icon name="plus" size={14} />
        {addLabel ?? "添加一条"}
      </button>
    </div>
  );
}

function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const safe = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value) ? value : "#000000";
  return (
    <div className="color">
      <input
        type="color"
        className="color__pick"
        value={safe}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
        aria-label="选择颜色"
      />
      <input
        className="inp color__text"
        value={value}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="color__swatch" style={{ background: safe }} />
    </div>
  );
}

function Switch({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      className={`switch${value ? " is-on" : ""}`}
      onClick={() => onChange(!value)}
    >
      <span className="switch__dot" />
      <span className="switch__text">{value ? "开启" : "关闭"}</span>
    </button>
  );
}

function RangeInput({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="range">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : min}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <input
        className="inp range__num"
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : min}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function ImageInput({
  value,
  onChange,
  hint,
}: {
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  const { assets, mode, uploadImage, notify } = useStudio();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState("");

  const visible = assets.filter((asset) => asset.toLowerCase().includes(filter.toLowerCase()));

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (mode !== "studio") {
      notify("error", "本地服务未运行，无法上传图片；可以先把图片放进 public/images 再填路径");
      return;
    }
    setBusy(true);
    const uploaded = await uploadImage(file);
    setBusy(false);
    if (uploaded) onChange(uploaded);
  };

  return (
    <div className="imgf">
      <button
        type="button"
        className="imgf__thumb"
        onClick={() => setPickerOpen(true)}
        title="点击选择图片"
      >
        {value ? <img src={value} alt="" /> : <Icon name="image" size={22} />}
      </button>

      <div className="imgf__body">
        <TextInput value={value} onChange={onChange} placeholder="/images/xxx.jpg" />
        <div className="imgf__row">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPickerOpen(true)}>
            <Icon name="grid" size={14} />
            图片库
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            <Icon name="upload" size={14} />
            {busy ? "上传中…" : "上传"}
          </button>
          {value && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange("")}>
              <Icon name="close" size={14} />
              清空
            </button>
          )}
        </div>
        {hint && <p className="fld__hint">{hint}</p>}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <Modal open={pickerOpen} title="选择图片" onClose={() => setPickerOpen(false)} wide>
        <div className="picker">
          <div className="picker__top">
            <TextInput value={filter} onChange={setFilter} placeholder="搜索文件名…" />
            <span className="picker__count">{assets.length ? `${assets.length} 张` : "未连接本地服务"}</span>
          </div>
          {visible.length ? (
            <div className="picker__grid">
              {visible.map((asset) => (
                <button
                  type="button"
                  key={asset}
                  className={`picker__item${asset === value ? " is-active" : ""}`}
                  onClick={() => {
                    onChange(asset);
                    setPickerOpen(false);
                  }}
                  title={asset}
                >
                  <img src={asset} alt="" loading="lazy" />
                  <span>{asset.replace("/images/", "")}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="picker__empty">
              还没有可选图片。把图片放进 public/images/ 目录，或直接用上面的「上传」按钮。
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------ 字段外壳 ------------------------------ */

function FieldShell({
  field,
  error,
  children,
  tools,
}: {
  field: FieldDef;
  error?: string;
  children: ReactNode;
  tools?: ReactNode;
}) {
  const wide = ["title", "list", "object", "paragraphs", "image"].includes(field.kind);
  return (
    <div className={`fld${field.half && !wide ? " fld--half" : ""}${error ? " has-error" : ""}`}>
      <div className="fld__head">
        <label className="fld__label">
          {field.label}
          {field.required && <span className="fld__req">必填</span>}
        </label>
        {tools}
      </div>
      {children}
      {field.hint && !["image"].includes(field.kind) && <p className="fld__hint">{field.hint}</p>}
      {error && (
        <p className="fld__err">
          <Icon name="warning" size={13} />
          {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------ 字段总入口 ------------------------------ */

export function FieldEditor({ field, parentPath }: { field: FieldDef; parentPath: string }) {
  const { config, update, assets } = useStudio();
  const fullPath = joinPath(parentPath, field.key);
  const value = getAt(config, fullPath);
  const issue = useFieldError(fullPath);

  const set = (next: unknown) => update(fullPath, next);

  if (field.kind === "list") {
    return (
      <ItemList
        path={fullPath}
        fields={field.itemFields ?? []}
        titleTpl={field.itemTitle}
        subtitleTpl={field.itemSubtitle}
        thumbKey={field.itemThumb}
        addLabel={field.addLabel}
        minItems={field.minItems}
        maxItems={field.maxItems}
        newItem={field.newItem}
        label={field.label}
        hint={field.hint}
        required={field.required}
        error={issue?.message}
        nested
      />
    );
  }

  if (field.kind === "object") {
    return (
      <div className="objcard">
        <div className="objcard__head">
          <Icon name="layers" size={15} />
          {field.label}
        </div>
        <div className="grid">
          {(field.fields ?? []).map((child) => (
            <FieldEditor key={child.key} field={child} parentPath={fullPath} />
          ))}
        </div>
      </div>
    );
  }

  const control = (() => {
    switch (field.kind) {
      case "text":
      case "email":
      case "url":
      case "id":
        return (
          <TextInput
            value={asString(value)}
            onChange={set}
            placeholder={field.placeholder}
            type={field.kind === "email" ? "email" : "text"}
            invalid={Boolean(issue)}
          />
        );
      case "textarea":
        return (
          <textarea
            className="inp inp--area"
            rows={field.rows ?? 3}
            value={asString(value)}
            placeholder={field.placeholder}
            onChange={(event) => set(event.target.value)}
          />
        );
      case "title":
        return (
          <div className="titlef">
            <textarea
              className="inp inp--area inp--mono"
              rows={field.rows ?? 2}
              value={asString(value)}
              placeholder={field.placeholder ?? "把复杂*拆开*，再换行"}
              onChange={(event) => set(event.target.value)}
            />
            <div className="titlef__preview">
              <span className="titlef__tag">效果</span>
              <div className="titlef__text">
                {asString(value) ? <Markup text={asString(value)} /> : <span className="dim">（空）</span>}
              </div>
            </div>
          </div>
        );
      case "chips":
        return (
          <ChipsInput
            value={asStringArray(value)}
            onChange={set}
            placeholder={field.placeholder}
          />
        );
      case "paragraphs":
        return (
          <ParagraphsEditor
            value={asStringArray(value)}
            onChange={set}
            addLabel={field.addLabel}
          />
        );
      case "number":
        return (
          <TextInput
            value={asString(value)}
            onChange={(next) => set(next === "" ? "" : Number(next))}
            type="number"
            invalid={Boolean(issue)}
          />
        );
      case "range":
        return (
          <RangeInput
            value={Number(value ?? field.min ?? 0)}
            onChange={set}
            min={field.min}
            max={field.max}
            step={field.step}
          />
        );
      case "color":
        return <ColorInput value={asString(value)} onChange={set} />;
      case "switch":
        return <Switch value={Boolean(value)} onChange={set} />;
      case "select": {
        const options = resolveOptions(field, config);
        const current = asString(value);
        const missing = current && !options.some((option) => option.value === current);
        return (
          <select
            className="inp inp--select"
            value={current}
            onChange={(event) => set(event.target.value)}
          >
            {!current && <option value="">未选择</option>}
            {missing && <option value={current}>{current}（已失效）</option>}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      }
      case "image":
        return (
          <ImageInput
            value={asString(value)}
            onChange={set}
            hint={
              assets.length
                ? "点击左侧缩略图从图片库挑选，或直接上传新图（自动写入 public/images/）"
                : undefined
            }
          />
        );
      default:
        return null;
    }
  })();

  // image 字段自带提示，避免重复
  const shellField =
    field.kind === "image" && assets.length ? { ...field, hint: undefined } : field;

  return (
    <FieldShell field={shellField} error={issue?.message}>
      {control}
    </FieldShell>
  );
}

/* ------------------------------ 列表编辑器 ------------------------------ */

export function ItemList({
  path,
  fields,
  titleTpl,
  subtitleTpl,
  thumbKey,
  addLabel,
  minItems,
  maxItems,
  newItem,
  label,
  hint,
  error,
  nested = false,
}: {
  path: string;
  fields: FieldDef[];
  titleTpl?: string;
  subtitleTpl?: string;
  thumbKey?: string;
  addLabel?: string;
  minItems?: number;
  maxItems?: number;
  newItem?: () => Record<string, unknown>;
  label?: string;
  hint?: string;
  required?: boolean;
  error?: string;
  nested?: boolean;
}) {
  const { config, addItem, removeItem, moveItem, duplicateItem } = useStudio();
  const items = (getAt(config, path) as Record<string, unknown>[] | undefined) ?? [];
  const [open, setOpen] = useState<Set<number>>(() => new Set(items.length ? [0] : []));
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  useEffect(() => {
    if (pendingDelete === null) return;
    const timer = setTimeout(() => setPendingDelete(null), 3200);
    return () => clearTimeout(timer);
  }, [pendingDelete]);

  const toggle = (index: number) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const canAdd = !maxItems || items.length < maxItems;

  return (
    <div className={`listcard${nested ? " listcard--nested" : ""}`}>
      {label && (
        <div className="listcard__head">
          <div>
            <h4>
              {label}
              <span className="listcard__count">{items.length}</span>
            </h4>
            {hint && <p className="fld__hint">{hint}</p>}
            {error && (
              <p className="fld__err">
                <Icon name="warning" size={13} />
                {error}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="items">
        {items.map((item, index) => {
          // 标题里的 {years} / {year} 这类占位符直接换成真实值，后台看到的和站点一致
          const title = fillContentTokens(formatTemplate(titleTpl, item)) || `第 ${index + 1} 项`;
          const subtitle = fillContentTokens(formatTemplate(subtitleTpl, item));
          const thumb = thumbKey ? asString(item?.[thumbKey]) : "";
          const isOpen = open.has(index);
          const deleting = pendingDelete === index;

          return (
            <div className={`item${isOpen ? " is-open" : ""}`} key={index}>
              <div className="item__head">
                <button type="button" className="item__main" onClick={() => toggle(index)}>
                  {thumbKey && (
                    <span className="item__thumb">
                      {thumb ? <img src={thumb} alt="" loading="lazy" /> : <Icon name="image" size={16} />}
                    </span>
                  )}
                  <span className="item__text">
                    <strong>{title}</strong>
                    {subtitle && <small>{subtitle}</small>}
                  </span>
                  <Icon name={isOpen ? "up" : "down"} size={16} />
                </button>
                <div className="item__tools">
                  <button
                    type="button"
                    className="mini"
                    title="上移"
                    disabled={index === 0}
                    onClick={() => moveItem(path, index, -1)}
                  >
                    <Icon name="up" size={14} />
                  </button>
                  <button
                    type="button"
                    className="mini"
                    title="下移"
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(path, index, 1)}
                  >
                    <Icon name="down" size={14} />
                  </button>
                  <button
                    type="button"
                    className="mini"
                    title="复制一份"
                    onClick={() => duplicateItem(path, index)}
                  >
                    <Icon name="copy" size={14} />
                  </button>
                  <button
                    type="button"
                    className={`mini${deleting ? " mini--armed" : " mini--danger"}`}
                    title="删除"
                    disabled={minItems !== undefined && items.length <= minItems}
                    onClick={() => {
                      if (deleting) {
                        removeItem(path, index);
                        setPendingDelete(null);
                        setOpen(new Set());
                      } else {
                        setPendingDelete(index);
                      }
                    }}
                  >
                    {deleting ? "确认删除" : <Icon name="trash" size={14} />}
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="item__body">
                  <div className="grid">
                    {fields.map((field) => (
                      <FieldEditor key={field.key} field={field} parentPath={`${path}.${index}`} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {!items.length && <p className="items__empty">还没有内容，点下面的按钮添加第一条。</p>}
      </div>

      <button
        type="button"
        className="btn btn--add"
        disabled={!canAdd}
        onClick={() => {
          addItem(path, newItem ?? (() => ({})));
          setOpen(new Set(items.length ? [] : [0]));
        }}
      >
        <Icon name="plus" size={15} />
        {canAdd ? (addLabel ?? "添加一条") : `最多 ${maxItems} 条`}
      </button>
    </div>
  );
}

/** 校验器类型再导出，方便页面里复用 */
export type { Validator };
