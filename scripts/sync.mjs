// Descarga los datos de iecrossdatabase.pages.dev (extraídos del juego por RR_o)
// y los deja en data/*.json + imágenes en public/. Uso: npm run sync
import fs from "node:fs/promises";
import path from "node:path";

const BASE = "https://iecrossdatabase.pages.dev";
const ROOT = path.resolve(import.meta.dirname, "..");
const BS = String.fromCharCode(92);

async function text(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}

// Extrae el literal JS (objeto o array) que sigue a `marker=` en `src`.
function grabLiteral(src, marker) {
  const i = src.indexOf(marker);
  if (i < 0) return null;
  const start = src.indexOf("=", i) + 1;
  let depth = 0, quote = null, j = start;
  for (; j < src.length; j++) {
    const c = src[j];
    if (quote) {
      if (c === BS) { j++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "`" || c === '"' || c === "'") { quote = c; continue; }
    if (c === "{" || c === "[") depth++;
    if (c === "}" || c === "]") { depth--; if (depth === 0) break; }
  }
  // Los literales solo contienen datos (strings, números, !0/!1), así que es seguro evaluarlos.
  return new Function(`return (${src.slice(start, j + 1)})`)();
}

async function main() {
  const html = await text(`${BASE}/formacion`);
  const chunks = [...new Set(html.match(/\/_next\/static\/chunks\/[^"']+\.js/g))];
  let game = null, coaches = null;
  for (const c of chunks) {
    const src = await text(BASE + c);
    if (!game && src.includes("players:[{id:")) {
      const marker = src.slice(0, src.indexOf("{meta:{gameVersion")).match(/(\w+)=$/)?.[1];
      game = grabLiteral(src, `${marker}={meta:{gameVersion`);
    }
    if (!coaches && src.includes("coaches:[{id:")) {
      const k = src.indexOf("={metadata:{gameVersion");
      const name = src.slice(k - 3, k).match(/(\w+)$/)[1];
      coaches = grabLiteral(src, `${name}={metadata:{gameVersion`);
    }
  }
  if (!game || !coaches) throw new Error("No se encontraron los datos en los chunks; la web ha cambiado.");

  await fs.mkdir(path.join(ROOT, "data"), { recursive: true });
  await fs.writeFile(path.join(ROOT, "data/game.json"), JSON.stringify(game));
  await fs.writeFile(path.join(ROOT, "data/coaches.json"), JSON.stringify(coaches));
  console.log(`Jugadores: ${game.players.length} (v${game.meta.gameVersion}) · Entrenadores: ${coaches.coaches.length}`);

  const jobs = [
    ...game.players.map((p) => [p.image, `public${p.image}`]),
    ...coaches.coaches.map((c) => ["/" + c.assets.small.replace(/^assets\//, ""), "public/" + c.assets.small.replace(/^assets\//, "")]),
  ];
  let n = 0;
  for (const [url, dest] of jobs) {
    const out = path.join(ROOT, dest);
    try { await fs.access(out); continue; } catch {}
    const r = await fetch(BASE + url);
    if (!r.ok) { console.warn("sin imagen", url); continue; }
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, Buffer.from(await r.arrayBuffer()));
    n++;
  }
  console.log(`Imágenes nuevas: ${n}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
