const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ channel: "chrome" });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await p.goto("http://127.0.0.1:4321/", { waitUntil: "load" });
  await p.waitForTimeout(2500);
  const res = await p.evaluate(() => {
    const base = document.documentElement.scrollWidth;
    const report = [];
    // 逐层排查：从 body 直接子节点开始
    const probe = (el, depth) => {
      if (depth > 4 || !el) return null;
      const kids = Array.from(el.children);
      for (const k of kids) {
        const prev = k.style.display;
        k.style.display = "none";
        const sw = document.documentElement.scrollWidth;
        k.style.display = prev;
        if (sw < base - 2) {
          const r = k.getBoundingClientRect();
          report.push({ depth, t: k.tagName, c: (k.className || "").toString().slice(0, 40), id: k.id, w: Math.round(r.width), without: sw });
          probe(k, depth + 1);
        }
      }
    };
    probe(document.body, 0);
    return { base, report: report.slice(0, 14) };
  });
  console.log(JSON.stringify(res, null, 1));
  await b.close();
})();
