export type Position = "GK" | "DF" | "MF" | "FW";
export type Element = "Fuego" | "Viento" | "Bosque" | "Montaña";
export type TechType = "Tiro" | "Regate" | "Bloqueo" | "Parada";
export type StatKey = "kick" | "technique" | "block" | "catch";

export interface TechLevel {
  level: number;
  power: number;
  tp: number;
  range: number;
  cooldown: number;
  foul: number;
  critical: number;
  criticalBonus: number;
}

export interface Technique {
  code: string;
  name: string;
  type: TechType;
  element: Element;
  unlock: number;
  shootBlock: boolean;
  chain: boolean;
  levels: TechLevel[];
}

export interface RawPassive {
  code: string;
  name: string;
  description: string;
  rank: string;
  level: number;
  source: "Nivel" | "Despertar";
  unlock: number;
}

export interface Player {
  id: string;
  slug: string;
  name: string;
  aliases: string[];
  team: string;
  tags: string[];
  position: Position;
  element: Element;
  stars: number;
  image: string;
  new: boolean;
  stats: { kick: number; technique: number; block: number; catch: number; speed: number; tp: number; power: number };
  zones: { area: number; rank: "S" | "A" | "B"; bonus: number }[];
  techniques: Technique[];
  passives: RawPassive[];
}

export interface CoachEffectRaw {
  effectId: string;
  effectType: string;
  targetTechnique: string | null;
  value: number;
  target: string;
  activationConditionId: string;
  endConditionId: string;
  stackable: boolean;
}

export interface SlotDef {
  slot: number;
  position: Position;
  fieldX: number;
  fieldY: number;
  screenX: number;
  screenY: number;
  condition: { type: string; value: string } | null;
}

export interface Coach {
  id: string;
  name: string;
  assets: { small: string };
  formation: {
    id: string;
    name: string;
    activePassive: { name: string; description: string; effects: CoachEffectRaw[] };
    slots: SlotDef[];
  };
  growth: { level: number; coachPassive: { name: string; description: string; effects: CoachEffectRaw[] } }[];
}

// ---------- Efectos normalizados (pasivas de jugador, entrenador y formación) ----------

/** Qué modifica un efecto. */
export type EffectKind =
  | "stat" // suma plana a Tiro/Técnica/Bloqueo/Parada
  | "power" // suma al poder de técnicas
  | "tpMax"
  | "tpCost" // reduce coste de TP (valor positivo = ahorro)
  | "crit" // % de crítico
  | "chainRate" // % prob. de cadena
  | "foul" // % prob. de falta (negativo = menos faltas propias)
  | "range"
  | "speed";

/** Cuándo se activa. "start" = siempre durante el partido. */
export type Trigger =
  | "start"
  | "secondHalf"
  | "selfDribbleWin" // regate propio con éxito
  | "allyDribbleWin" // regate de cualquier aliado con éxito
  | "mfDribbleWin" // regate de un MF aliado con éxito
  | "allyDribbleLose"
  | "selfBlockWin" // este jugador gana un duelo defendiendo un regate
  | "dfBlockWin" // un defensa aliado gana un duelo defendiendo un regate
  | "allyBlockWin" // cualquier aliado
  | "selfShootBlockWin"
  | "selfShootBlockFail"
  | "allyShootBlockFail"
  | "allySave" // un aliado detiene un tiro rival
  | "selfSave"
  | "rivalStopsShot" // el rival detiene/bloquea un tiro nuestro
  | "rivalShootBlockFail"
  | "goalFor"
  | "goalAgainst"
  | "losing"
  | "rivalHalf"
  | "ownHalf"
  | "penaltyArea"
  | "receivePass"
  | "chainShot"
  | "useShot"
  | "rivalElementShot";

export interface TargetFilter {
  positions?: Position[];
  /** true = además debe ocupar una casilla de esa posición en la formación ("posición recomendada"). */
  recommended?: boolean;
  elements?: Element[];
  tags?: string[];
}

export interface Effect {
  kind: EffectKind;
  value: number;
  /** Para kind=stat */
  stats?: StatKey[];
  /** Para kind=power/crit/tpCost: tipo de técnica afectado (vacío = todas) */
  techTypes?: TechType[];
  techElements?: Element[];
  /** nombre (o fragmento) de una técnica concreta */
  techName?: string;
  side: "ally" | "rival";
  /** self = el dueño de la pasiva; team = aliados/rivales que cumplan filter */
  scope: "self" | "team";
  filter?: TargetFilter;
  trigger: Trigger;
  stacks: boolean;
}

export interface Requirement {
  count: number;
  tags?: string[];
  elements?: Element[];
}

export interface ParsedPassive {
  code: string;
  name: string;
  description: string;
  source: "Nivel" | "Despertar";
  unlock: number;
  requirement?: Requirement;
  effects: Effect[];
  /** true si el intérprete no entendió la descripción completa */
  partial: boolean;
}
