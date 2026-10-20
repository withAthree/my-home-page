const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ channel: "chrome" });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on("pageerror", (e) => errs.push("ERR " + e.message));
  await p.goto("http://127.0.0.1:4321/", { waitUntil: "load" });
  await p.waitForTimeout(2500);
  await p.evaluate(() => {
    const el = document.getElementById("gallery");
    window.scrollTo({ top: el.offsetTop - 40, behavior: "instant" });
  });
  await p.waitForTimeout(600);
  await p.locator(".seg__btn", { hasText: "3D 画廊" }).click();
  await p.waitForTimeout(1000);

  const info = await p.evaluate(() => {
    const el = document.querySelector(".stage__item.is-center");
    if (!el) return { center: false };
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return {
      center: true,
      rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      topEl: top ? top.tagName + "." + (top.className || "").toString().slice(0, 30) : null,
    };
  });
  console.log("INFO", JSON.stringify(info));

  try {
    await p.locator(".stage__item.is-center").first().click({ timeout: 4000 });
    console.log("click ok");
  } catch (e) {
    console.log("click failed:", e.message.split("\n")[0]);
  }
  await p.waitForTimeout(800);
  console.log("lightbox count:", await p.locator(".lightbox").count());
  console.log(errs.join("\n") || "no page errors");
  await b.close();
})();
