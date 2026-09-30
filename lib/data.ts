import gameJson from "@/data/game.json";
import coachesJson from "@/data/coaches.json";
import { canonicalTag, parsePassive } from "./passives";
import type { Coach, CoachEffectRaw, Effect, Element, ParsedPassive, Player, Position, TechType, Technique, Trigger } from "./types";

export const GAME_META = (gameJson as { meta: { gameVersion: string; updated: string; playerCount: number; level: number } }).meta;
export const PLAYERS: Player[] = (gameJson as { players: Player[] }).players;
export const COACHES: Coach[] = (coachesJson as unknown as { coaches: Coach[] }).coaches;
export const PLAYER_BY_ID = new Map(PLAYERS.map((p) => [p.id, p]));
export const COACH_BY_ID = new Map(COACHES.map((c) => [c.id, c]));
export const ALL_TAGS = [...new Set(PLAYERS.flatMap((p) => p.tags))].sort((a, b) => a.localeCompare(b, "es"));
export const TEAMS = [...new Set(PLAYERS.map((p) => p.team))].sort((a, b) => a.localeCompare(b, "es"));

// ---------- Técnicas: catálogo y manuales (秘伝書) ----------
// Un manual enseña a cualquier jugador una 3.ª técnica (sin restricción de posición ni elemento).
// Las técnicas de los manuales son técnicas que ya tienen otros jugadores, así que salen de aquí.
export const TECH_BY_CODE = new Map<string, Technique>();
for (const p of PLAYERS) for (const t of p.techniques) if (!TECH_BY_CODE.has(t.code)) TECH_BY_CODE.set(t.code, t);
export const TECHNIQUES = [...TECH_BY_CODE.values()].sort((a, b) => a.type.localeCompare(b.type) || b.levels[9].power - a.levels[9].power);

/** Manuales conocidos (Game8, AppMedia, inacross-guide, eventos) → código de técnica */
export const BOOKS: { code: string; jp: string }[] = [
  { code: "19011", jp: "ヘブンズタイム" },
  { code: "21003", jp: "ジャッジスルー" },
  { code: "11001", jp: "manual del evento Caos" },
  { code: "13003", jp: "ファイアトルネード" },
  { code: "12001", jp: "ドラゴンクラッシュ" },
  { code: "11003", jp: "スピニングシュート" },
  { code: "14005", jp: "ターザンキック" },
  { code: "23004", jp: "サイクロン" },
  { code: "28001", jp: "アステロイドベルト" },
  { code: "30002", jp: "ザ・ウォール" },
  { code: "27002", jp: "スピニングカット" },
  { code: "37004", jp: "爆裂パンチ" },
  { code: "32005", jp: "ゆがむ空間" },
].filter((b) => TECH_BY_CODE.has(b.code));
export const BOOK_CODES = new Set(BOOKS.map((b) => b.code));

const parsedCache = new Map<string, ParsedPassive[]>();
export function playerPassives(p: Player): ParsedPassive[] {
  let r = parsedCache.get(p.id);
  if (!r) {
    r = p.passives.map((x) => parsePassive(x, { knownTags: ALL_TAGS, ownTechniques: p.techniques, ownPosition: p.position }));
    parsedCache.set(p.id, r);
  }
  return r;
}

// ---------- Entrenadores: efectos estructurados del propio juego ----------

const ACTIVATION: Record<string, Trigger> = {
  "1": "start",
  "140": "secondHalf",
  "144": "mfDribbleWin",
  "145": "allyBlockWin",
  "146": "rivalStopsShot",
  "164": "allySave",
};

const STAT_BY_TYPE: Record<string, "kick" | "technique" | "block" | "catch"> = {
  "Modificador de Tiro": "kick",
  "Modificador de Técnica": "technique",
  "Modificador de Bloqueo": "block",
  "Modificador de Parada": "catch",
};

function coachEffect(raw: CoachEffectRaw, fixTech?: TechType): Effect {
  const t = raw.target;
  const side = t.includes("rival") ? "rival" : "ally";
  const recommended = t.match(/posición recomendada \[(FW|MF|DF|GK)\]/)?.[1] as Position | undefined;
  const natural = t.match(/(?<!recomendada )posición \[(FW|MF|DF|GK)\]/)?.[1] as Position | undefined;
  const tags = [...t.matchAll(/etiqueta \[([^\]]+)\]/g)].map((m) => canonicalTag(m[1]));
  const elements = [...t.matchAll(/elemento \[([^\]]+)\]/g)].map((m) => m[1] as Element);
  const eff: Effect = {
    kind: "stat",
    value: raw.value,
    side,
    scope: "team",
    filter: {},
    trigger: ACTIVATION[raw.activationConditionId] ?? "start",
    stacks: raw.activationConditionId !== "1" && raw.activationConditionId !== "140",
  };
  if (recommended) eff.filter = { ...eff.filter, positions: [recommended], recommended: true };
  if (natural) eff.filter = { ...eff.filter, positions: [natural] };
  if (tags.length) eff.filter!.tags = tags;
  if (elements.length) eff.filter!.elements = elements;
  if (STAT_BY_TYPE[raw.effectType]) {
    eff.stats = [STAT_BY_TYPE[raw.effectType]];
  } else {
    eff.kind = "power";
    const tt = fixTech ?? raw.targetTechnique;
    if (tt && ["Tiro", "Regate", "Bloqueo", "Parada"].includes(tt)) eff.techTypes = [tt as TechType];
    const el = raw.targetTechnique?.match(/^Elemento (\w+)/)?.[1];
    if (el) eff.techElements = [el as Element];
  }
  return eff;
}

// La formación F-Inazuma KFC trae "Técnica" como destino en los datos, pero su texto dice Tiro (Bosque) y Bloqueo (Montaña).
const FORMATION_TECH_FIX: Record<string, TechType[]> = { "80004": ["Tiro", "Bloqueo"] };

const coachEffCache = new Map<string, { coach: Effect[]; formation: Effect[] }>();
export function coachEffects(coach: Coach, level: number): { coach: Effect[]; formation: Effect[] } {
  const key = `${coach.id}:${level}`;
  let r = coachEffCache.get(key);
  if (r) return r;
  const g = coach.growth.find((x) => x.level === level) ?? coach.growth[coach.growth.length - 1];
  const fix = FORMATION_TECH_FIX[coach.formation.id];
  r = {
    coach: g.coachPassive.effects.map((e) => coachEffect(e)),
    formation: coach.formation.activePassive.effects.map((e, i) => coachEffect(e, fix?.[i])),
  };
  coachEffCache.set(key, r);
  return r;
}

export function coachPassiveText(coach: Coach, level: number) {
  const g = coach.growth.find((x) => x.level === level) ?? coach.growth[coach.growth.length - 1];
  return g.coachPassive;
}

export function slotConditionMet(cond: { type: string; value: string } | null, p: Player | undefined): boolean {
  if (!cond) return true;
  if (!p) return false;
  const values = cond.value.split(",").map((v) => v.trim()).filter(Boolean);
  if (cond.type === "Elemento") return values.includes(p.element);
  if (cond.type === "Posición" || cond.type === "Posición natural") return values.includes(p.position);
  if (cond.type === "Etiqueta") return values.some((v) => p.tags.includes(canonicalTag(v)));
  return false;
}

// ---------- Zonas del campo ----------
// Cuadrícula de la ficha (11 áreas, ataque arriba):
//   1  2  3        fila delantera
//   4  5  6        4 y 6 son las bandas del medio (2 filas)
//   4  7  6
//   8  9 10        defensa
//      11          portería
export function slotArea(x: number, y: number): number {
  if (y <= 1) return 11;
  if (y >= 16) return x < -2 ? 1 : x > 2 ? 3 : 2;
  if (y >= 9) {
    if (x <= -6) return 4;
    if (x >= 6) return 6;
    return y >= 12 ? 5 : 7;
  }
  return x < -4 ? 8 : x > 4 ? 10 : 9;
}

export function zoneBonus(p: Player, area: number): { rank: string | null; bonus: number } {
  const z = p.zones.find((z) => z.area === area);
  return z ? { rank: z.rank, bonus: z.bonus } : { rank: null, bonus: 0 };
}
