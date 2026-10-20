const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ channel: "chrome" });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await p.goto("http://127.0.0.1:4321/", { waitUntil: "load" });
  await p.waitForTimeout(3000);
  const res = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > window.innerWidth + 1) {
        out.push({ t: el.tagName, c: (el.className || "").toString().slice(0, 34), l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width) });
      }
    });
    return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, out: out.slice(0, 12) };
  });
  console.log(JSON.stringify(res, null, 1));
  await b.close();
})();
