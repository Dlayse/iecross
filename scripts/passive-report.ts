// Muestra cómo se ha interpretado cada pasiva. Uso: node scripts/passive-report.ts [filtro]
import fs from "node:fs";
import { parsePassive } from "@/lib/passives";
import type { Effect, Player } from "@/lib/types";

const game = JSON.parse(fs.readFileSync(new URL("../data/game.json", import.meta.url), "utf8"));
const players: Player[] = game.players;
const knownTags = [...new Set(players.flatMap((p) => p.tags))];
const filter = process.argv[2]?.toLowerCase();

const fmt = (e: Effect) => {
  const what = e.kind === "stat" ? e.stats!.join("+") : e.kind + (e.techTypes ? `[${e.techTypes}]` : "") + (e.techElements ? `{${e.techElements}}` : "") + (e.techName ? `<${e.techName}>` : "");
  const who = e.scope === "self" ? "self" : `${e.side}(${[e.filter?.positions, e.filter?.elements, e.filter?.tags].filter(Boolean).map((x) => x!.join("/")).join(",")})`;
  return `${what} ${e.value > 0 ? "+" : ""}${e.value} → ${who} @${e.trigger}${e.stacks ? "*" : ""}`;
};

const seen = new Set<string>();
let partial = 0, total = 0;
for (const p of players) {
  for (const raw of p.passives) {
    const key = raw.code + raw.description;
    if (seen.has(key)) continue;
    seen.add(key);
    if (/^TP\+ máximo$/.test(raw.name) && !filter) continue;
    total++;
    const r = parsePassive(raw, { knownTags, ownTechniques: p.techniques, ownPosition: p.position });
    if (r.partial || r.effects.length === 0) partial++;
    if (filter && !(filter === "partial" ? r.partial || !r.effects.length : raw.description.toLowerCase().includes(filter))) continue;
    const req = r.requirement ? ` [req ${r.requirement.count}+ ${r.requirement.tags ?? r.requirement.elements}]` : "";
    console.log(`${raw.code} ${p.name}: ${raw.description}\n   ${r.partial ? "⚠ " : ""}${r.effects.map(fmt).join(" | ")}${req}`);
  }
}
console.log(`\n${total} pasivas únicas, ${partial} parciales/sin efectos`);
