const { chromium } = require("playwright");
const path = require("path");
const OUT = path.join(process.cwd(), ".shots");

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await page.goto("http://127.0.0.1:4321/", { waitUntil: "load" });
  await page.waitForTimeout(2500);

  await page.evaluate(() => {
    const el = document.getElementById("timeline");
    if (el) window.scrollTo({ top: el.offsetTop - 40, behavior: "instant" });
  });
  await page.waitForTimeout(1200);

  const box = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { sel, x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const em = document.querySelector(".section-title em");
    const cs = em ? getComputedStyle(em) : null;
    return {
      boxes: [
        pick(".container"),
        pick("#timeline .container"),
        pick(".timeline"),
        pick(".tl__item"),
        pick(".tl__card"),
      ],
      em: cs
        ? {
            display: cs.display,
            color: cs.color,
            clip: cs.backgroundClip || cs.webkitBackgroundClip,
            bg: cs.backgroundImage.slice(0, 60),
            padding: cs.padding,
            boxShadow: cs.boxShadow,
          }
        : null,
      overflowers: Array.from(document.querySelectorAll("body *"))
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && (r.right > window.innerWidth + 2 || r.left < -2);
        })
        .slice(0, 8)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return `${el.tagName}.${(el.className || "").toString().slice(0, 30)} [${Math.round(r.left)},${Math.round(r.right)}]`;
        }),
    };
  });

  console.log(JSON.stringify(box, null, 2));

  const titleBox = await page.locator(".section-title").first().boundingBox();
  if (titleBox) {
    await page.screenshot({
      path: path.join(OUT, "zoom-title.png"),
      clip: { x: titleBox.x - 6, y: titleBox.y - 6, width: titleBox.width + 12, height: titleBox.height + 12 },
    });
  }

  await browser.close();
})();
