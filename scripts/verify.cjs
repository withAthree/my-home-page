const { chromium } = require("playwright");
const path = require("path");
const OUT = path.join(process.cwd(), ".shots");
const URL = process.env.SHOT_URL || "http://127.0.0.1:4321/";

async function scrollTo(page, id, offset = 60) {
  await page.evaluate(
    ([sid, off]) => {
      const el = document.getElementById(sid);
      if (el) window.scrollTo({ top: el.offsetTop - off, behavior: "instant" });
    },
    [id, offset]
  );
  await page.waitForTimeout(1500);
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });

  // ---------- 桌面端 ----------
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const logs = [];
  page.on("pageerror", (e) => logs.push("PAGEERROR: " + e.message));
  page.on("console", (m) => m.type() === "error" && logs.push("CONSOLE: " + m.text()));

  await page.goto(URL, { waitUntil: "load" });
  await page.waitForTimeout(3200);

  for (const id of ["hero", "about", "projects", "timeline", "gallery", "contact"]) {
    await scrollTo(page, id, id === "hero" ? 0 : 60);
    await page.screenshot({ path: path.join(OUT, `d-${id}.png`) });
  }

  // 标题特写（验证渐变文字是否有底色块）
  await scrollTo(page, "projects");
  const t = await page.locator("#projects .section-title").boundingBox();
  if (t) {
    await page.screenshot({
      path: path.join(OUT, "zoom-title.png"),
      clip: { x: t.x - 4, y: t.y - 4, width: Math.min(t.width + 8, 700), height: t.height + 8 },
      scale: "css",
    });
  }

  const metrics = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));
  console.log("DESKTOP=" + JSON.stringify(metrics));

  // ---------- 移动端 ----------
  const m = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await m.goto(URL, { waitUntil: "load" });
  await m.waitForTimeout(3000);
  await m.screenshot({ path: path.join(OUT, "m-hero.png") });

  const mOverflow = await m.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));
  console.log("MOBILE=" + JSON.stringify(mOverflow));

  for (const id of ["about", "projects", "timeline", "gallery", "contact"]) {
    await scrollTo(m, id, 40);
    await m.screenshot({ path: path.join(OUT, `m-${id}.png`) });
  }

  // 汉堡菜单
  await m.evaluate(() => window.scrollTo(0, 0));
  await m.waitForTimeout(600);
  await m.locator(".nav__toggle").click();
  await m.waitForTimeout(500);
  await m.screenshot({ path: path.join(OUT, "m-menu.png") });

  console.log("LOGS=" + (logs.length ? "\n" + logs.slice(0, 12).join("\n") : "(none)"));
  await browser.close();
})();
