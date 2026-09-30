// Capturas de la demo: node scripts/screenshot.mjs  → research/demo-equipos.png y research/demo-plantilla.png
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] ?? "http://localhost:3320";
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
  defaultViewport: { width: 1280, height: 900, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
await page.goto(`${BASE}/demo`, { waitUntil: "networkidle0", timeout: 120000 });
await page.waitForSelector("article", { timeout: 300000 });
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: "research/demo-equipos.png", fullPage: true });

await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 120000 });
await page.evaluate(() => {
  const cb = [...document.querySelectorAll("label")].find((l) => l.textContent?.includes("Solo los míos"))?.querySelector("input");
  cb?.click();
});
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: "research/demo-plantilla.png", clip: { x: 0, y: 0, width: 1280, height: 1300 }, captureBeyondViewport: true });
await browser.close();
console.log("ok");
