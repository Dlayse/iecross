// Búsqueda del mejor once para una formación: construcción voraz + búsqueda local
// (cambiar un jugador por otro del banquillo o intercambiar dos casillas) hasta que nada mejore.
import { COACHES, PLAYER_BY_ID } from "./data";
import { evaluate, type EvalOptions, type Evaluation, type Lineup } from "./engine";

export interface OptimizeInput {
  pool: string[]; // ids de jugadores disponibles
  coachId: string;
  coachLevel: number;
  opts: EvalOptions;
  /** jugadores que deben estar sí o sí */
  locked?: string[];
  seed?: number;
}

export interface OptimizeResult {
  lineup: Lineup;
  evaluation: Evaluation;
  evals: number;
}

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function optimizeFormation(input: OptimizeInput): OptimizeResult {
  const coach = COACHES.find((c) => c.id === input.coachId)!;
  const slots = coach.formation.slots;
  const pool = [...new Set(input.pool)];
  const locked = (input.locked ?? []).filter((id) => pool.includes(id));
  const rand = rng(input.seed ?? 1);
  let evals = 0;
  const fastOpts = { ...input.opts, fast: true };
  const score = (s: (string | null)[]) => {
    evals++;
    return evaluate({ coachId: coach.id, coachLevel: input.coachLevel, slots: s }, fastOpts).score;
  };

  // Orden de llenado: portero, delanteros, centrales, medios, resto.
  const order = slots
    .map((s, i) => ({ i, pri: s.position === "GK" ? 0 : s.position === "FW" ? 1 : s.position === "DF" && Math.abs(s.fieldX) <= 4 ? 2 : s.position === "MF" ? 3 : 4 }))
    .sort((a, b) => a.pri - b.pri || (input.seed ? rand() - 0.5 : 0))
    .map((x) => x.i);

  const cur: (string | null)[] = Array(11).fill(null);
  const used = new Set<string>();

  // Regla fija: en la portería solo un portero de verdad. Si no tienes ninguno, alguien con
  // técnica de parada; y solo si tampoco hay, cualquiera. En el resto de casillas vale todo
  // (un GK de lateral repartiendo bufos es una táctica legítima).
  const gkSlot = slots.findIndex((s) => s.position === "GK");
  const naturalGK = pool.filter((id) => PLAYER_BY_ID.get(id)?.position === "GK");
  const catchers = pool.filter((id) => PLAYER_BY_ID.get(id)?.techniques.some((t) => t.type === "Parada"));
  const gkPool = new Set(naturalGK.length ? naturalGK : catchers.length ? catchers : pool);
  const allowed = (i: number, id: string | null) => i !== gkSlot || id === null || gkPool.has(id);

  // Los fijados van a una casilla de su posición (o a la primera libre que admitan)
  for (const id of locked) {
    const pos = PLAYER_BY_ID.get(id)?.position;
    const idx =
      order.find((i) => cur[i] === null && slots[i].position === pos && allowed(i, id)) ?? order.find((i) => cur[i] === null && allowed(i, id));
    if (idx !== undefined) {
      cur[idx] = id;
      used.add(id);
    }
  }

  for (const i of order) {
    if (cur[i]) continue;
    let best: string | null = null;
    let bestS = -Infinity;
    for (const id of pool) {
      if (used.has(id) || !allowed(i, id)) continue;
      cur[i] = id;
      const s = score(cur) + (input.seed ? rand() * 0.8 : 0);
      if (s > bestS) {
        bestS = s;
        best = id;
      }
    }
    cur[i] = best;
    if (best) used.add(best);
  }

  // Búsqueda local
  let curScore = score(cur);
  for (let pass = 0; pass < 8; pass++) {
    let improved = false;
    // intercambios entre casillas (sirve para colocar bien zonas y requisitos)
    for (let i = 0; i < 11; i++) {
      for (let j = i + 1; j < 11; j++) {
        if (!cur[i] && !cur[j]) continue;
        if (!allowed(i, cur[j]) || !allowed(j, cur[i])) continue;
        [cur[i], cur[j]] = [cur[j], cur[i]];
        const s = score(cur);
        if (s > curScore + 1e-6) {
          curScore = s;
          improved = true;
        } else [cur[i], cur[j]] = [cur[j], cur[i]];
      }
    }
    // sustituciones desde el banquillo
    for (let i = 0; i < 11; i++) {
      if (cur[i] && locked.includes(cur[i]!)) continue;
      const prev = cur[i];
      let bestId = prev;
      let bestS = curScore;
      for (const id of pool) {
        if (used.has(id) || !allowed(i, id)) continue;
        cur[i] = id;
        const s = score(cur);
        if (s > bestS + 1e-6) {
          bestS = s;
          bestId = id;
        }
      }
      cur[i] = bestId;
      if (bestId !== prev) {
        if (prev) used.delete(prev);
        if (bestId) used.add(bestId);
        curScore = bestS;
        improved = true;
      }
    }
    if (!improved) break;
  }

  const lineup: Lineup = { coachId: coach.id, coachLevel: input.coachLevel, slots: cur };
  return { lineup, evaluation: evaluate(lineup, input.opts), evals };
}

/** Mejor once para cada entrenador disponible, de mejor a peor. */
export function recommend(
  pool: string[],
  coaches: { id: string; level: number }[],
  opts: EvalOptions,
  locked: string[] = [],
  onProgress?: (done: number, total: number) => void,
): OptimizeResult[] {
  const out: OptimizeResult[] = [];
  coaches.forEach((c, k) => {
    // dos arranques (uno determinista, otro con ruido) y nos quedamos con el mejor
    const a = optimizeFormation({ pool, coachId: c.id, coachLevel: c.level, opts, locked });
    const b = optimizeFormation({ pool, coachId: c.id, coachLevel: c.level, opts, locked, seed: 7 + k });
    out.push(a.evaluation.score >= b.evaluation.score ? a : b);
    onProgress?.(k + 1, coaches.length);
  });
  return out.sort((x, y) => y.evaluation.score - x.evaluation.score);
}
