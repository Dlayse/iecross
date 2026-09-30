// A quién darle los manuales (秘伝書) que tienes sin usar: asignación voraz sobre un once ya elegido.
// En cada paso se prueba cada manual disponible en cada jugador que aún no tenga 3.ª técnica y se
// aplica el que más sube la puntuación; se repite mientras queden copias y alguna asignación mejore.
import { TECH_BY_CODE } from "./data";
import { evaluate, type EvalOptions, type Lineup } from "./engine";

export interface BookSuggestion {
  playerId: string;
  code: string;
  /** Mejora de la puntuación interna (÷5 para verla sobre 10) */
  gain: number;
}

export function suggestBooks(lineup: Lineup, opts: EvalOptions, inventory: Record<string, number>, max = 5): { picks: BookSuggestion[]; score: number } {
  const stock = { ...inventory };
  const assigned: Record<string, string> = {};
  const extra = (id: string) => assigned[id] ?? opts.extraTech?.(id);
  const score = () => evaluate(lineup, { ...opts, fast: true, extraTech: extra }).score;
  let current = score();
  const picks: BookSuggestion[] = [];
  const members = lineup.slots.filter((id): id is string => !!id);
  while (picks.length < max) {
    let best: BookSuggestion | null = null;
    for (const [code, n] of Object.entries(stock)) {
      if (n <= 0 || !TECH_BY_CODE.has(code)) continue;
      for (const id of members) {
        if (extra(id)) continue; // ya tiene 3.ª técnica
        assigned[id] = code;
        const gain = score() - current;
        delete assigned[id];
        if (gain > 0.1 && (!best || gain > best.gain)) best = { playerId: id, code, gain };
      }
    }
    if (!best) break;
    assigned[best.playerId] = best.code;
    stock[best.code]--;
    current += best.gain;
    picks.push(best);
  }
  return { picks, score: current };
}
