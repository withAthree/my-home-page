/**
 * ============================================================
 *  工作年限（唯一计算入口）
 *  ------------------------------------------------------------
 *  全站的工作年限都不手写数字，一律由「当年 − 参加工作年份」实时算出：
 *    2026 年 → 2026 − 2021 = 5 年
 *    2027 年 → 2027 − 2021 = 6 年（不用改任何配置）
 *
 *  文案里想显示年限，写占位符即可，渲染时自动替换：
 *    {years} → 工作年限（2026 年即 5）
 *    {since} → 参加工作年份（2021）
 *    {year}  → 当前年份（2026）
 *  例：统计条写 "{years}Y+"、头像角标写 "{years}Y+ EXP"。
 *
 *  想改职业起点只改 CAREER_START_YEAR 一处，全站跟着变。
 *  纯函数 + 常量，浏览器与 Node（本地 Studio 服务）共用。
 * ============================================================
 */

/** 参加工作年份：只改这一处，全站的年限随之变化 */
export const CAREER_START_YEAR = 2021;

/** 内置占位符的名字（不含调用方自定义的，如页脚的 {name}） */
export const CONTENT_TOKEN_NAMES = ["year", "years", "since"] as const;

/** 工作年限 = 当年 − 参加工作年份（2026 年即 5 年） */
export function getWorkYears(now: Date = new Date()): number {
  return Math.max(0, now.getFullYear() - CAREER_START_YEAR);
}

/**
 * 替换文案里的占位符：{years} / {since} / {year}
 * · extras 可追加调用方自己的占位符（如页脚的 {name}）
 * · 认不出的占位符原样保留，避免误伤正文
 */
export function fillContentTokens(
  template: string | undefined | null,
  extras: Record<string, string> = {},
  now: Date = new Date()
): string {
  const tokens: Record<string, string> = {
    year: String(now.getFullYear()),
    years: String(getWorkYears(now)),
    since: String(CAREER_START_YEAR),
    ...extras,
  };
  return String(template ?? "").replace(/\{(\w+)\}/g, (match, key: string) =>
    key in tokens ? tokens[key] : match
  );
}

/**
 * 看起来是写死的年限（如 "5Y+" / "8Y+ EXP" / "12 年" / "5+"）；
 * 后台体检用它提醒改成 {years}。三位以上的数字（"500+"）不算年限。
 */
export function isHardcodedYears(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const text = value.trim();
  if (/^\d{1,2}\s*(?:Y\s*\+?|y\s*\+?|年)/.test(text)) return true;
  return /^\d{1,2}\s*\+$/.test(text);
}
