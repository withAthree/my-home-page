const { chromium } = require("playwright");
const path = require("path");
const OUT = path.join(process.cwd(), ".shots");
(async () => {
  const b = await chromium.launch({ channel: "chrome" });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("http://127.0.0.1:4321/", { waitUntil: "load" });
  await p.waitForTimeout(2800);

  const go = async (id, off = 50) => {
    await p.evaluate(([i, o]) => {
      const el = document.getElementById(i);
      window.scrollTo({ top: el.offsetTop - o, behavior: "instant" });
    }, [id, off]);
    await p.waitForTimeout(1500);
  };

  await go("timeline");
  await p.screenshot({ path: path.join(OUT, "f-timeline.png") });
  await go("timeline", -200);
  await p.screenshot({ path: path.join(OUT, "f-timeline2.png") });

  await go("gallery");
  await p.locator(".seg__btn", { hasText: "3D 画廊" }).click();
  await p.waitForTimeout(1200);
  await p.screenshot({ path: path.join(OUT, "f-stage.png") });
  await p.locator(".stage__item.is-center").first().click();
  await p.waitForTimeout(900);
  await p.screenshot({ path: path.join(OUT, "f-lightbox.png") });
  await p.keyboard.press("ArrowRight");
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(OUT, "f-lightbox2.png") });
  await p.keyboard.press("Escape");
  await p.waitForTimeout(500);
  console.log("lightbox closed:", (await p.locator(".lightbox").count()) === 0);

  // 回到瀑布流
  await p.locator(".seg__btn", { hasText: "瀑布流" }).click();
  await p.waitForTimeout(900);
  await p.screenshot({ path: path.join(OUT, "f-grid.png") });
  await b.close();
})();
