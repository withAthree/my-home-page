const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ channel: "chrome" });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await p.goto("http://127.0.0.1:4321/", { waitUntil: "load" });
  await p.waitForTimeout(2500);
  await p.locator(".nav__toggle").click();
  await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    const panel = document.querySelector(".nav__mobile");
    const cs = getComputedStyle(panel);
    return {
      h: Math.round(panel.getBoundingClientRect().height),
      alignContent: cs.alignContent,
      rows: cs.gridTemplateRows,
      items: Array.from(panel.querySelectorAll("a")).map((a) => Math.round(a.getBoundingClientRect().height)),
      stats: Array.from(document.querySelectorAll(".hero__stats > div")).map((d) => {
        const r = d.getBoundingClientRect();
        return [Math.round(r.x), Math.round(r.width)];
      }),
    };
  });
  console.log(JSON.stringify(r));
  await b.close();
})();
