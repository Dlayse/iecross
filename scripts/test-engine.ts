// Prueba rápida del motor: npx tsx scripts/test-engine.ts [nºjugadores aleatorios]
import { COACHES, PLAYERS } from "@/lib/data";
import { BENCH, evaluate } from "@/lib/engine";
import { recommend } from "@/lib/optimizer";

console.log("Rival de referencia:", BENCH);

const n = Number(process.argv[2] ?? 0);
let pool = PLAYERS.map((p) => p.id);
if (n) {
  let s = 42;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  pool = [...pool].sort(() => r() - 0.5).slice(0, n);
}

const t0 = performance.now();
const e0 = evaluate({ coachId: COACHES[0].id, coachLevel: 10, slots: pool.slice(0, 11) }, { techLevel: 10 });
const t1 = performance.now();
console.log(`1 evaluación: ${(t1 - t0).toFixed(2)} ms · score ${e0.score.toFixed(1)}`);

const res = recommend(pool, COACHES.map((c) => ({ id: c.id, level: 10 })), { techLevel: 10 }, [], (d, t) => process.stdout.write(`\r${d}/${t}`));
const t2 = performance.now();
console.log(`\nOptimización: ${((t2 - t1) / 1000).toFixed(1)} s, evals ${res.reduce((s, r) => s + r.evals, 0)}`);

for (const r of res.slice(0, 5)) {
  const c = COACHES.find((c) => c.id === r.lineup.coachId)!;
  const e = r.evaluation;
  console.log(`\n== ${c.formation.name} (${c.name}) score ${e.score.toFixed(1)} · atq ${(e.parts.attack * 100).toFixed(0)} def ${(e.parts.defense * 100).toFixed(0)} reg ${(e.parts.dribble * 100).toFixed(0)} rob ${(e.parts.block * 100).toFixed(0)} · formación ${e.formationActive ? "activa" : "NO"}`);
  for (const m of e.members) {
    const best = Object.values(m.best).sort((a, b) => b!.duel - a!.duel)[0];
    console.log(`  ${m.slot.slot}${m.slot.position} a${m.area} ${m.player.name.padEnd(22)} ${m.player.position} ${m.player.element.padEnd(7)} zona ${m.zone.rank ?? "-"} | ${best?.tech.name} ${Math.round(best!.duel)}`);
  }
  const act = e.passives.filter((p) => p.status === "activa" && p.conditional).map((p) => `${p.owner}: ${p.name}`);
  console.log("  sinergias:", act.join("; "));
  if (e.shooters[0]) console.log(`  mejor tiro ${e.shooters[0].member.player.name} ${Math.round(e.shooters[0].tech.duel)} vs portero rival ${Math.round(e.rival.catch.duel)}`);
  if (e.keeper) console.log(`  portero ${e.keeper.member.player.name} ${Math.round(e.keeper.tech?.duel ?? 0)} vs tiro rival ${Math.round(e.rival.shot.duel)}`);
}
