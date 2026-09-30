// Calcula el "rival de referencia" (data/bench.json): el mejor once posible con toda la base.
// Se itera porque el propio rival influye en qué once sale como mejor. Uso: npx tsx scripts/calibrate.ts
import fs from "node:fs";
import path from "node:path";
import { COACHES, PLAYERS } from "@/lib/data";
import { setBench, type BenchRole, type Evaluation, type Role, type TechCalc } from "@/lib/engine";
import { recommend } from "@/lib/optimizer";

const avg = (xs: TechCalc[]): BenchRole => {
  const stat = xs.reduce((s, t) => s + t.stat, 0) / xs.length;
  const power = xs.reduce((s, t) => s + t.power, 0) / xs.length;
  const d = xs.reduce((s, t) => s + t.duel, 0) / xs.length;
  return { stat: Math.round(stat), power: Math.round(power), mult: +(d / ((stat * power) / 100)).toFixed(3) };
};

function benchFrom(e: Evaluation): Record<Role, BenchRole> {
  return {
    shot: avg(e.shooters.slice(0, 2).map((s) => s.tech)),
    catch: avg([e.keeper!.tech!]),
    dribble: avg(e.dribblers.slice(0, 3).map((s) => s.tech)),
    block: avg(e.tacklers.slice(0, 3).map((s) => s.tech)),
  };
}

let bench: Record<Role, BenchRole> = JSON.parse(fs.readFileSync(path.resolve("data/bench.json"), "utf8"));
const pool = PLAYERS.map((p) => p.id);
const coaches = COACHES.map((c) => ({ id: c.id, level: 10 }));
for (let it = 0; it < 5; it++) {
  setBench(bench);
  const res = recommend(pool, coaches, { techLevel: 10 });
  const best = res[0];
  // media de los 4 mejores equipos, amortiguada con la vuelta anterior para que converja
  const tops = res.slice(0, 4).map((r) => benchFrom(r.evaluation));
  const next = {} as Record<Role, BenchRole>;
  for (const k of Object.keys(bench) as Role[]) {
    const m = (f: (b: BenchRole) => number) => tops.reduce((s, b) => s + f(b[k]), 0) / tops.length;
    next[k] = {
      stat: Math.round(0.5 * bench[k].stat + 0.5 * m((b) => b.stat)),
      power: Math.round(0.5 * bench[k].power + 0.5 * m((b) => b.power)),
      mult: +(0.5 * bench[k].mult + 0.5 * m((b) => b.mult)).toFixed(3),
    };
  }
  bench = next;
  const c = COACHES.find((c) => c.id === best.lineup.coachId)!;
  console.log(`iteración ${it + 1}: ${c.formation.name} score ${best.evaluation.score.toFixed(1)}`, JSON.stringify(bench));
  console.log("   " + best.evaluation.members.map((m) => m.player.name).join(", "));
}
fs.writeFileSync(path.resolve("data/bench.json"), JSON.stringify(bench, null, 2));
console.log("Guardado data/bench.json");
