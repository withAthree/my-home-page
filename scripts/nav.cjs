const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ channel: "chrome" });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await p.goto("http://127.0.0.1:4321/", { waitUntil: "load" });
  await p.waitForTimeout(2500);
  const r = await p.evaluate(() => {
    const g = (s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { s, x: Math.round(b.x), w: Math.round(b.width), right: Math.round(b.right), disp: cs.display, pad: cs.padding };
    };
    return {
      sw: document.documentElement.scrollWidth,
      items: [g(".nav"), g(".nav__inner"), g(".nav__logo"), g(".nav__actions"), g(".nav__toggle"), g(".nav__status"), g(".nav__links")],
    };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
