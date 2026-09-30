// Mide la velocidad del motor y del optimizador: npx tsx scripts/bench-eval.ts
import { COACHES, PLAYERS } from "@/lib/data";
import { evaluate } from "@/lib/engine";
import { recommend } from "@/lib/optimizer";

const slots = PLAYERS.slice(0, 11).map((p) => p.id);
const N = 3000;
for (const fast of [false, true]) {
  const t = performance.now();
  for (let i = 0; i < N; i++) evaluate({ coachId: COACHES[i % 13].id, coachLevel: 10, slots }, { techLevel: 10, playerLevel: 300, fast });
  console.log(`evaluate fast=${fast}: ${(((performance.now() - t) / N) * 1000).toFixed(0)} µs`);
}
for (const n of [45, 122]) {
  const pool = PLAYERS.slice(0, n).map((p) => p.id);
  const t = performance.now();
  const res = recommend(pool, COACHES.map((c) => ({ id: c.id, level: 8 })), { techLevel: 8, playerLevel: 300 });
  console.log(`recommend ${n} jugadores: ${((performance.now() - t) / 1000).toFixed(1)} s · evals ${res.reduce((s, r) => s + r.evals, 0)} · mejor ${res[0].evaluation.score.toFixed(2)}`);
}
