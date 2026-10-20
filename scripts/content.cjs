const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ channel: "chrome" });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on("pageerror", (e) => errs.push("ERR " + e.message));
  p.on("console", (m) => m.type() === "error" && errs.push("CONSOLE " + m.text()));
  await p.goto("http://127.0.0.1:4321/", { waitUntil: "load" });
  await p.waitForTimeout(3000);

  const txt = async (sel) => (await p.locator(sel).first().innerText().catch(() => "(缺失)")).replace(/\n+/g, " / ");
  const all = async (sel) => (await p.locator(sel).allInnerTexts()).map((s) => s.replace(/\n+/g, " / "));

  console.log("TITLE  =", await p.title());
  console.log("ROLE   =", await txt(".hero__role"));
  console.log("TAGLINE=", await txt(".hero__tagline"));
  console.log("STATS  =", (await all(".hero__stats > div")).join(" | "));
  console.log("CHIPS  =", (await all(".chip")).join(" · "));
  console.log("SKILLS =", (await all(".skill")).join(" | "));
  console.log("PROJECTS=");
  (await all(".card__title")).forEach((t, i) => console.log("   " + t));
  console.log("PLINKS =", (await p.locator(".card__links").count()) + " 组链接按钮");
  console.log("TIMELINE=");
  (await all(".tl__card")).forEach((t) => console.log("   " + t.slice(0, 90)));
  console.log("SOCIALS=", (await all(".social")).join(" · "));
  console.log("EMAIL  =", await txt(".email-link"));
  console.log("FOOTER =", await txt(".footer__inner"));
  console.log("SW     =", await p.evaluate(() => document.documentElement.scrollWidth + "/" + document.documentElement.clientWidth));
  console.log("ERRORS =", errs.length ? errs.join("\n") : "无");
  await b.close();
})();
