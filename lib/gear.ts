// Equipamiento: 6 piezas por posición; cada una suma a todos los jugadores con esa posición
// recomendada. Su nivel va ligado al nivel mínimo de la plantilla (装備限界, sube cada 5 niveles).
//
// Valores reales leídos del juego (ficha de la pieza). Lo que falte se estima a partir de lo conocido
// y se marca como estimado en la web. Añadir aquí cada captura nueva.
import type { Position, StatKey } from "./types";
import type { Gear } from "./engine";

export const GEAR_REF_LEVEL = 350;
export const PIECES = ["Botas", "Espinilleras", "Medias", "Muñequera", "Protector", "Colgante"] as const;
type Stats = Record<StatKey, number>;

/** [posición][pieza] → estadísticas a Lv 350 (null = aún sin dato) */
export const GEAR_REF: Record<Position, (Stats | null)[]> = {
  // FW Lv350 (capturas): las botas aún sin dato
  FW: [
    null,
    { kick: 3233, technique: 3233, block: 571, catch: 3 }, // espinilleras
    { kick: 3233, technique: 742, block: 2745, catch: 3 }, // medias
    { kick: 1115, technique: 3233, block: 571, catch: 1115 }, // muñequera
    { kick: 1115, technique: 742, block: 1588, catch: 1824 }, // protector
    { kick: 2123, technique: 3233, block: 742, catch: 1115 }, // colgante
  ],
  // MF Lv350 (capturas): las botas aún sin dato
  MF: [
    null,
    { kick: 2363, technique: 4231, block: 571, catch: 3 }, // espinilleras
    { kick: 2363, technique: 1115, block: 2745, catch: 3 }, // medias
    { kick: 742, technique: 4231, block: 571, catch: 1115 }, // muñequera
    { kick: 742, technique: 1115, block: 1588, catch: 1824 }, // protector
    { kick: 1588, technique: 4231, block: 742, catch: 1115 }, // colgante
  ],
  // Medias de DF Lv350: キック 1115 · テクニック 571 · ブロック 5409 · キャッチ 742
  DF: [null, null, { kick: 1115, technique: 571, block: 5409, catch: 742 }, null, null, null],
  GK: [null, null, null, null, null, null],
};

/** Estadística principal del equipamiento de cada posición */
export const MAIN_STAT: Record<Position, StatKey> = { FW: "kick", MF: "technique", DF: "block", GK: "catch" };

const avg = (xs: Stats[]): Stats => ({
  kick: xs.reduce((s, x) => s + x.kick, 0) / xs.length,
  technique: xs.reduce((s, x) => s + x.technique, 0) / xs.length,
  block: xs.reduce((s, x) => s + x.block, 0) / xs.length,
  catch: xs.reduce((s, x) => s + x.catch, 0) / xs.length,
});

/** Estimación de una pieza sin dato. Cada pieza tiene el mismo reparto en todas las posiciones pero
 *  con la estadística principal de la posición reforzada (espinilleras: FW Tiro 3233 / MF Técnica 4231,
 *  con Bloqueo y Parada iguales). Así que se toma la misma pieza de otras posiciones intercambiando
 *  su estadística principal por la de esta; si nadie la tiene, la media de las piezas de esta posición. */
function estimatePiece(pos: Position, i: number): Stats {
  const swapped = (Object.keys(GEAR_REF) as Position[])
    .filter((q) => q !== pos && GEAR_REF[q][i])
    .map((q) => {
      const s = { ...GEAR_REF[q][i]! };
      const a = MAIN_STAT[q];
      const b = MAIN_STAT[pos];
      [s[a], s[b]] = [GEAR_REF[q][i]![b], GEAR_REF[q][i]![a]];
      return s;
    });
  if (swapped.length) return avg(swapped);
  const own = GEAR_REF[pos].filter((x): x is Stats => !!x);
  if (own.length) return avg(own);
  return avg((Object.values(GEAR_REF) as (Stats | null)[][]).flat().filter((x): x is Stats => !!x));
}

/** Equipamiento completo (6 piezas al máximo) para un nivel mínimo dado. Escala lineal con el nivel
 *  del equipo (supuesto, hasta tener datos de otro nivel). */
const cache = new Map<number, ReturnType<typeof computeGear>>();
export function autoGear(playerLevel: number) {
  const level = Math.floor(playerLevel / 5) * 5;
  let r = cache.get(level);
  if (!r) cache.set(level, (r = computeGear(level)));
  return r;
}

function computeGear(level: number): { gear: Gear; estimated: Record<Position, boolean>; level: number } {
  const f = level / GEAR_REF_LEVEL;
  const gear: Gear = {};
  const estimated = {} as Record<Position, boolean>;
  for (const pos of ["FW", "MF", "DF", "GK"] as Position[]) {
    const total: Stats = { kick: 0, technique: 0, block: 0, catch: 0 };
    GEAR_REF[pos].forEach((piece, i) => {
      const p = piece ?? estimatePiece(pos, i);
      for (const k of Object.keys(total) as StatKey[]) total[k] += p[k];
    });
    gear[pos] = Object.fromEntries((Object.keys(total) as StatKey[]).map((k) => [k, Math.round(total[k] * f)]));
    estimated[pos] = GEAR_REF[pos].some((x) => !x);
  }
  return { gear, estimated, level };
}
