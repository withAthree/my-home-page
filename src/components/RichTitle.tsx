import { Fragment } from "react";

/**
 * 标题渲染器
 * ------------------------------------------------------------
 * 配置里的标题是一段纯文本，用两个约定保持排版能力：
 *   *强调*  → 渲染为 <em>（站点里是渐变色块）
 *   \n      → 渲染为换行 <br />
 * 这样后台只需要一个多行文本框，不必拼接 HTML。
 */

function Emphasis({ text }: { text: string }) {
  // 按 * 切分：奇数下标是被强调的部分。
  // 只有成对出现（切分后为奇数段）才解析为强调，未闭合的 * 按普通字符原样显示。
  const parts = text.split("*");
  const canEmphasize = parts.length > 1 && parts.length % 2 === 1;

  if (!canEmphasize) return <>{text}</>;

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <em key={i}>{part}</em> : <Fragment key={i}>{part}</Fragment>
      )}
    </>
  );
}

export default function RichTitle({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const lines = String(text ?? "").split("\n");

  return (
    <h2 className={className}>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          <Emphasis text={line} />
        </Fragment>
      ))}
    </h2>
  );
}
