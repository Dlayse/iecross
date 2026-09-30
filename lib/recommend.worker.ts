// Ejecuta el optimizador fuera del hilo principal. La página lanza varios a la vez y reparte los
// entrenadores entre ellos; cada formación se devuelve en cuanto termina. `tag` distingue tu equipo
// ("mine") del once ideal con toda la base ("ideal").
import type { Gear, Prefs, Training } from "./engine";
import { recommend } from "./optimizer";

export interface WorkerRequest {
  tag: string;
  pool: string[];
  coaches: { id: string; level: number }[];
  techLevel: number;
  playerLevel: number;
  stages: Record<string, number>;
  locked: string[];
  prefs?: Prefs;
  gear?: Gear;
  training?: Record<string, Training>;
}

self.onmessage = (ev: MessageEvent<WorkerRequest>) => {
  const { tag, pool, coaches, techLevel, playerLevel, stages, locked, prefs, gear, training } = ev.data;
  const opts = { techLevel, playerLevel, prefs, gear, training: (id: string) => training?.[id], awakening: (id: string) => stages[id] ?? 10 };
  for (const c of coaches) {
    const [res] = recommend(pool, [c], opts, locked);
    self.postMessage({ type: "result", tag, lineup: res.lineup });
  }
  self.postMessage({ type: "done", tag });
};
