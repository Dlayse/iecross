// Ejecuta el optimizador fuera del hilo principal. La página lanza varios a la vez y reparte los
// entrenadores entre ellos; cada formación se devuelve en cuanto termina. `tag` distingue tu equipo
// ("mine") del once ideal con toda la base ("ideal").
import type { Gear, Prefs } from "./engine";
import { recommend, variants } from "./optimizer";
import type { Lineup } from "./engine";

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
  /** Si viene, en vez de optimizar se buscan variantes de este once */
  variantsOf?: Lineup;
}

self.onmessage = (ev: MessageEvent<WorkerRequest>) => {
  const { tag, pool, coaches, techLevel, playerLevel, stages, locked, prefs, gear } = ev.data;
  const opts = { techLevel, playerLevel, prefs, gear, awakening: (id: string) => stages[id] ?? 10 };
  if (ev.data.variantsOf) {
    const vs = variants(ev.data.variantsOf, pool, opts, locked);
    self.postMessage({ type: "variants", coachId: ev.data.variantsOf.coachId, lineups: vs.map((v) => v.lineup) });
    return;
  }
  for (const c of coaches) {
    const [res] = recommend(pool, [c], opts, locked);
    self.postMessage({ type: "result", tag, lineup: res.lineup });
  }
  self.postMessage({ type: "done", tag });
};
