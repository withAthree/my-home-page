const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ channel: "chrome" });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("http://127.0.0.1:4321/", { waitUntil: "load" });
  await p.waitForTimeout(2500);
  await p.evaluate(() => { const el = document.getElementById("gallery"); window.scrollTo({ top: el.offsetTop - 40, behavior: "instant" }); });
  await p.waitForTimeout(500);
  await p.locator(".seg__btn", { hasText: "3D 画廊" }).click();
  await p.waitForTimeout(900);
  await p.locator(".stage__item.is-center").first().click();
  await p.waitForTimeout(900);
  const r = await p.evaluate(() => {
    const fig = document.querySelector(".lightbox__figure");
    const img = document.querySelector(".lightbox__img");
    const cs = getComputedStyle(img);
    const fb = fig.getBoundingClientRect();
    const ib = img.getBoundingClientRect();
    return {
      fig: [Math.round(fb.x), Math.round(fb.y), Math.round(fb.width), Math.round(fb.height)],
      img: [Math.round(ib.x), Math.round(ib.y), Math.round(ib.width), Math.round(ib.height)],
      maxH: cs.maxHeight, maxW: cs.maxWidth, natural: [img.naturalWidth, img.naturalHeight],
      vh: window.innerHeight,
    };
  });
  console.log(JSON.stringify(r));
  await b.close();
})();
