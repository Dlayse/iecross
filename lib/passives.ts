// Intérprete de pasivas: convierte las descripciones en español (traducción fan,
// con redacción muy irregular) en efectos estructurados que el motor puede sumar.
// Lo que no se entiende queda marcado como `partial` y se ve en /metodo.
import type { Effect, EffectKind, Element, ParsedPassive, Position, RawPassive, Requirement, StatKey, TechType, Technique, Trigger } from "./types";

export const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Etiquetas escritas de otra forma en pasivas / formaciones → etiqueta real de las fichas. */
export const TAG_ALIASES: Record<string, string> = {
  imperio: "Imperius",
  "inazuma japon": "Inazuma Japan",
  "kidogawa seishuu": "Kidokawa Seishuu",
  "medio defensivo": "Mediocentro defensivo",
};

export function canonicalTag(t: string): string {
  return TAG_ALIASES[norm(t)] ?? t.trim();
}

const ELEMENTS: [RegExp, Element][] = [
  [/fuego/, "Fuego"],
  [/viento/, "Viento"],
  [/bosque/, "Bosque"],
  [/montana/, "Montaña"],
];

const TRIGGERS: [RegExp, Trigger][] = [
  [/inicio de la segunda parte/, "secondHalf"],
  [/al perder por/, "losing"],
  [/mientras estes en el campo rival/, "rivalHalf"],
  [/mientras estes en tu propio campo/, "ownHalf"],
  [/area de penalti/, "penaltyArea"],
  [/recibes un pase/, "receivePass"],
  [/se activa la cadena/, "chainShot"],
  [/rival usa una tecnica de tiro/, "rivalElementShot"],
  [/falla un bloqueo de tiro de un df rival/, "rivalShootBlockFail"],
  [/(rival|enemigo) (detiene|bloquea) un tiro (aliado|nuestro)/, "rivalStopsShot"],
  [/(rival|enemigo) marca un gol/, "goalAgainst"],
  [/marcas un gol/, "goalFor"],
  [/un (aliado|df aliado) falla (una tecnica de )?bloqueo de tiro|df aliado falla un bloqueo/, "allyShootBlockFail"],
  [/falla (una )?(la )?tecnica (propia )?de bloqueo (de tiro|del propio tiro)|falla una tecnica propia de bloqueo de tiro/, "selfShootBlockFail"],
  [/tecnica (propia )?de bloqueo (de tiros?|del propio tiro) (propia )?tiene exito|tecnica propia de bloqueo de tiros? tiene exito/, "selfShootBlockWin"],
  [/(aliado detiene un tiro|detiene un tiro (rival|enemigo)|tecnica (propia )?de (parada|portero) tiene exito|tecnica de parada propia tiene exito)/, "allySave"],
  [/regate de un mf aliado/, "mfDribbleWin"],
  [/(tecnica de regate de un aliado|tecnica de regate aliada tiene exito)/, "allyDribbleWin"],
  [/(falla una tecnica de regate aliada|usa una tecnica de regate y pierde)/, "allyDribbleLose"],
  [/(tecnica propia de regate|propia tecnica de regate|tecnica de regate propia|driblas con exito|realizas con exito una tecnica de regate)/, "selfDribbleWin"],
  [/un defensa de tu equipo/, "dfBlockWin"],
  [/un jugador de tu equipo usa una tecnica de bloqueo y gana/, "allyBlockWin"],
  [/este jugador (usa una tecnica de bloqueo y )?gana un duelo/, "selfBlockWin"],
  [/(usas una tecnica de tiro|al usar una tecnica propia de tiro|al usar )/, "useShot"],
];

const POS_WORDS: [RegExp, Position][] = [
  [/\bfw\b|delanteros?\b/, "FW"],
  [/\bmf\b|centrocampistas?|mediocampistas?/, "MF"],
  [/\bdf\b|defensas?\b/, "DF"],
  [/\bgk\b|porteros?\b/, "GK"],
];

const TYPE_WORDS: [RegExp, TechType][] = [
  [/\btiros?\b|\bshot\b|\bdrive\b/, "Tiro"],
  [/\bregates?\b/, "Regate"],
  [/\bbloqueos?\b/, "Bloqueo"],
  [/\bparadas?\b|\bportero\b/, "Parada"],
];

const STAT_WORDS: [RegExp, StatKey][] = [
  [/\btiro\b/, "kick"],
  [/\btecnica\b/, "technique"],
  [/\bbloqueo\b/, "block"],
  [/\bparada\b/, "catch"],
];

export interface ParseContext {
  knownTags: string[];
  ownTechniques: Technique[];
  ownPosition?: Position;
}

function parseRequirement(t: string, ctx: ParseContext): { req?: Requirement; rest: string } {
  const m = t.match(/si hay (?:al menos )?(\d+) (?:o mas )?aliados ([^.,:]*?)(?=[.,:]|\. | aumenta| reduce| las tecnicas| tu tiro|$)/);
  if (!m) return { rest: t };
  const count = Number(m[1]);
  const body = m[2];
  const req: Requirement = { count };
  if (/etiquet/.test(body)) {
    const tags = findTags(body, ctx);
    if (tags.length) req.tags = tags;
  } else {
    const els = ELEMENTS.filter(([re]) => re.test(body)).map(([, e]) => e);
    if (els.length) req.elements = els;
  }
  return { req, rest: t.replace(m[0], " ") };
}

function findTags(s: string, ctx: ParseContext): string[] {
  const out = new Set<string>();
  for (const [alias, tag] of Object.entries(TAG_ALIASES)) if (s.includes(alias)) out.add(tag);
  for (const tag of ctx.knownTags) {
    const n = norm(tag);
    if (n.length > 3 && s.includes(n)) out.add(tag);
  }
  // "Delantero" y "Defensa central" son etiquetas pero también palabras corrientes: solo cuentan tras "etiqueta".
  if (!/etiquet/.test(s)) {
    out.delete("Delantero");
    out.delete("Defensa central");
    out.delete("Portero");
  }
  // "Inazuma Eleven 1" es prefijo de "Inazuma Eleven 1x"… no aparece en pasivas, pero evitamos falsos positivos cortos.
  return [...out];
}

function detectTrigger(t: string): Trigger {
  for (const [re, tr] of TRIGGERS) if (re.test(t)) return tr;
  return "start";
}

/** Separa en cláusulas "verbo … número". */
function splitClauses(t: string): { text: string; value: number; pct: boolean }[] {
  // quitamos texto de fin de efecto / condición final
  const cleaned = t
    .replace(/(el efecto|este efecto|esta reduccion)[^.]*\./g, ".")
    .replace(/termina cuando[^.]*\./g, ".")
    .replace(/condicion final:[^.]*\.?/g, ".")
    .replace(/hasta que[^.]*\./g, ".")
    .replace(/n\.o ?\d+/g, "");
  const sentences = cleaned.split(/(?<=\d%?)\s*[.;]\s*|\.\s+/);
  const out: { text: string; value: number; pct: boolean }[] = [];
  let lastVerb = "aumenta";
  for (const sRaw of sentences) {
    // dividir por " y " cuando la parte izquierda ya tiene número
    const parts: string[] = [];
    let buf = "";
    for (const piece of sRaw.split(/ y (?=(?:en |el |la |los |las |aumenta|reduce|su |sus |tu |tus ))/)) {
      if (buf && /\d/.test(buf)) {
        parts.push(buf);
        buf = piece;
      } else buf = buf ? `${buf} y ${piece}` : piece;
    }
    if (buf) parts.push(buf);
    for (const p of parts) {
      const nums = [...p.matchAll(/(-?\d+)\s*(%?)/g)];
      if (!nums.length) continue;
      const verb = p.match(/(aument\w*|eleva|incrementa|reduc\w*|baja|disminuye)/)?.[1];
      if (verb) lastVerb = verb;
      const last = nums[nums.length - 1];
      const txt = verb ? p : `${lastVerb} ${p}`;
      out.push({ text: txt, value: Number(last[1]), pct: last[2] === "%" });
    }
  }
  return out;
}

function detectKind(c: string): EffectKind {
  if (/tp maximo|maximo de tp|tp \+ maximo/.test(c)) return "tpMax";
  if (/consumo de tp|coste de tp|consumo/.test(c)) return "tpCost";
  if (/critic/.test(c)) return "crit";
  if (/probabilidad de falta/.test(c)) return "foul";
  if (/probabilidad de cadena/.test(c)) return "chainRate";
  if (/alcance/.test(c)) return "range";
  if (/velocidad/.test(c) && !/tecnica|tiro|bloqueo|parada/.test(c.replace(/velocidad.*/, ""))) return "speed";
  if (/poder|potencia/.test(c)) return "power";
  if (/tecnicas? (propias? )?(de |del )?(tiro|regate|bloqueo|parada|portero|elemento|los aliados|mf|df|fw)/.test(c)) return "power";
  if (/las tecnicas (de|del)/.test(c)) return "power";
  return "stat";
}

function playerElements(c: string): Element[] {
  // elemento que describe a los JUGADORES afectados (no a la técnica)
  const out: Element[] = [];
  for (const [re, el] of ELEMENTS) {
    const src = re.source;
    const player = new RegExp(`(aliad\\w*|rival\\w*|fw|mf|df|gk|enemig\\w*) (de |del |con )?(elemento |atributo )?${src}|${src}( aliad\\w*| rival\\w*)|aliados? (de |con )(elemento |atributo )?(\\w+ )?${src}|(fw|mf|df|gk) (de |del )?(atributo |elemento )?${src}`);
    if (player.test(c)) out.push(el);
  }
  // "aliados de viento y fuego"
  for (const [re, el] of ELEMENTS) {
    if (out.includes(el)) continue;
    if (out.some((o) => new RegExp(`${norm(o)} y ${re.source}`).test(c))) out.push(el);
  }
  return out;
}

function techElements(c: string, playerEls: Element[]): Element[] {
  const out: Element[] = [];
  for (const [re, el] of ELEMENTS) if (re.test(c) && !playerEls.includes(el)) out.push(el);
  return out;
}

function parseClause(
  clause: { text: string; value: number; pct: boolean },
  trigger: Trigger,
  stacks: boolean,
  ctx: ParseContext,
  prev?: Effect,
): Effect | null {
  let c = clause.text
    .replace(/tecnica (del propio |de )?portero/g, "tecnica de parada")
    .replace(/tecnicas? (propia )?de portero/g, "tecnica de parada");
  const neg = /(reduc\w*|baja|disminuye)/.test(c);
  let kind = detectKind(c);
  // Las subidas de estadística van de cientos a miles; las de poder de técnica, de 5 a ~150.
  // Si la traducción dice "técnicas" pero el número es de estadística, es la estadística Técnica.
  if (kind === "power" && !/poder|potencia/.test(c) && clause.value >= 200) {
    kind = "stat";
    c = c.replace(/tecnicas/g, "tecnica");
  }
  // "…y reduce su coste de TP", "…y su Técnica": mismo destinatario que la cláusula anterior
  if (prev && /\bsu (coste|consumo)|\bsu tecnica|\bsu tiro|reduce el consumo de tp|reduce la tasa|aumenta la tasa|aumenta el alcance/.test(c) && !/propi|aliad|rival/.test(c.replace(/^.*?(su|el|la) /, ""))) {
    const inherited = parseClauseBase(c, kind, neg, clause, trigger, stacks, ctx);
    if (!inherited) return null;
    inherited.scope = prev.scope;
    inherited.side = prev.side;
    if (prev.filter) inherited.filter = prev.filter;
    if (prev.techName && inherited.kind !== "stat") inherited.techName = prev.techName;
    return inherited;
  }
  return parseClauseBase(c, kind, neg, clause, trigger, stacks, ctx);
}

function parseClauseBase(
  cIn: string,
  kind: EffectKind,
  neg: boolean,
  clause: { text: string; value: number; pct: boolean },
  trigger: Trigger,
  stacks: boolean,
  ctx: ParseContext,
): Effect | null {
  let c = cIn;
  const tags = findTags(c, ctx);
  // quitamos las etiquetas del texto para que "Delantero"/"Raimon" no confundan posiciones ni tipos
  for (const tg of tags) c = c.replace(norm(tg), " ");
  const side: "ally" | "rival" = /rival|enemig|contrari/.test(c) ? "rival" : "ally";
  const positions = POS_WORDS.filter(([re]) => re.test(c)).map(([, p]) => p);
  const pEls = playerElements(c);
  const teamWords = /aliad|companer|equipo|todos|rival|enemig/.test(c);
  const selfWords = /propi|\btu tecnica|\btus tecnicas|\btu tiro|\btu puno|\btu formacion|\bsus propias|\bsu propio|tu propio|de este jugador/.test(c);
  const scope: "self" | "team" = positions.length || pEls.length || tags.length || (teamWords && !selfWords) ? "team" : "self";

  const eff: Effect = {
    kind,
    value: (neg ? -1 : 1) * clause.value,
    side,
    scope,
    trigger,
    stacks,
  };
  if (scope === "team") {
    eff.filter = {};
    if (positions.length) eff.filter.positions = positions;
    if (pEls.length) eff.filter.elements = pEls;
    if (tags.length) eff.filter.tags = tags;
  }
  if (kind === "stat") {
    if (/todos los parametros/.test(c)) eff.stats = ["kick", "technique", "block", "catch"];
    else {
      const stats = STAT_WORDS.filter(([re]) => re.test(c)).map(([, s]) => s);
      if (!stats.length) return null;
      eff.stats = stats;
    }
  } else if (kind === "power" || kind === "crit" || kind === "tpCost" || kind === "range" || kind === "chainRate") {
    // "técnica de bloqueo del propio tiro" / "bloqueo de tiro" = técnica de Bloqueo
    const cc = c.replace(/bloqueo (de|del propio) tiros?/g, "bloqueo");
    let types = TYPE_WORDS.filter(([re]) => re.test(cc)).map(([, t]) => t);
    if (types.length === 0 && /portero/.test(cc)) types = ["Parada"];
    // "tiro" dentro de "Tiro de los FW" en una cláusula de poder ya queda como tipo Tiro
    if (types.length) eff.techTypes = types;
    const tEls = techElements(c, pEls);
    if (tEls.length) eff.techElements = tEls;
    // técnica con nombre propio ("poder de tu propio Phantom Shot")
    let named = matchTechniqueName(c, ctx.ownTechniques);
    const nextWord = c.match(/poder (?:de |del )((?:la |el |tu |su |sus |tus |los |las |propi[oa]s? )*)([a-z']+)/)?.[2];
    const namedPhrase = !!nextWord && !/^(tecnicas?|tiro|regate|bloqueo|parada|elemento|atributo|sus|tus)$/.test(nextWord);
    if (!named && namedPhrase && kind === "power" && ctx.ownTechniques.length) {
      // Nombre traducido distinto al de la ficha: la técnica del tipo más probable
      const want: TechType | undefined = /shot|drive|tiro|remate|disparo/.test(c)
        ? "Tiro"
        : ({ FW: "Tiro", GK: "Parada", DF: "Bloqueo", MF: "Regate" } as const)[ctx.ownPosition ?? "MF"];
      const pool = ctx.ownTechniques.filter((t) => t.type === want);
      named = [...(pool.length ? pool : ctx.ownTechniques)].sort((a, b) => b.levels[9].power - a.levels[9].power)[0].name;
    }
    if (named && (scope === "self" || namedPhrase)) {
      eff.techName = named;
      delete eff.techTypes;
      delete eff.techElements;
      if (scope === "team" && !eff.filter?.positions && !eff.filter?.elements) {
        eff.scope = "self";
        delete eff.filter;
      }
    }
    if (kind === "tpCost") eff.value = Math.abs(clause.value);
  }
  if (kind === "foul") eff.value = (neg ? -1 : 1) * clause.value;
  return eff;
}

const GENERIC = new Set(["de", "del", "la", "el", "los", "las", "tu", "su", "propio", "propia", "poder", "tecnica", "tecnicas", "tiro", "regate", "bloqueo", "parada", "en", "aumenta", "fuegos", "artificiales", "fuego", "viento", "bosque", "montana", "elemento", "atributo"]);

function matchTechniqueName(c: string, techs: Technique[]): string | undefined {
  let best: { name: string; score: number } | undefined;
  for (const t of techs) {
    const words = norm(t.name).replace(/[()]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !GENERIC.has(w));
    if (!words.length) continue;
    const hits = words.filter((w) => c.includes(w.length >= 6 ? w.slice(0, 5) : w)).length;
    const score = hits / words.length;
    if (hits && (!best || score > best.score)) best = { name: t.name, score };
  }
  return best && best.score >= 0.5 ? best.name : undefined;
}

export function parsePassive(p: RawPassive, ctx: ParseContext): ParsedPassive {
  const override = OVERRIDES[p.code];
  const t = norm(p.description).replace(/n\.[oº] ?\d+/g, "");
  const { req, rest } = parseRequirement(t, ctx);
  if (override) {
    return { code: p.code, name: p.name, description: p.description, source: p.source, unlock: p.unlock, requirement: override.requirement ?? req, effects: override.effects, partial: false };
  }
  // El disparador solo se busca en la primera cláusula; el resto es el efecto.
  let body = rest.replace(/^\s*al inicio del partido\s*[:.,]*\s*/, "").replace(/^[\s.,:]+/, "");
  let trigger: Trigger = "start";
  if (!/^al inicio del partido/.test(rest.trim())) {
    const cut = body.search(/[,.:](\s|$)/);
    const lead = cut >= 0 ? body.slice(0, cut) : body;
    const tr = detectTrigger(lead);
    if (tr !== "start") {
      trigger = tr;
      body = cut >= 0 ? body.slice(cut + 1) : "";
    }
  }
  const stacks = trigger !== "start" && trigger !== "secondHalf" && !/no se acumula/.test(t);
  const clauses = splitClauses(body);
  const effects: Effect[] = [];
  let partial = clauses.length === 0;
  for (const cl of clauses) {
    const e = parseClause(cl, trigger, stacks, ctx, effects[effects.length - 1]);
    if (e) effects.push(e);
    else partial = true;
  }
  return { code: p.code, name: p.name, description: p.description, source: p.source, unlock: p.unlock, requirement: req, effects, partial };
}

// ---------- Correcciones manuales para descripciones que la heurística no resuelve ----------
const ally = (e: Partial<Effect> & Pick<Effect, "kind" | "value">): Effect => ({ side: "ally", scope: "team", trigger: "start", stacks: false, ...e });
const self = (e: Partial<Effect> & Pick<Effect, "kind" | "value">): Effect => ({ side: "ally", scope: "self", trigger: "start", stacks: false, ...e });

// Código de pasiva → efectos. Revisar con `node scripts/passive-report.ts`.
export const OVERRIDES: Record<string, { requirement?: Requirement; effects: Effect[] }> = {
  // "Aumenta el poder del elemento Fuego y bosque del FW aliado. Técnicas de tiro 26."
  "101010004": { effects: [ally({ kind: "power", value: 26, techTypes: ["Tiro"], techElements: ["Fuego", "Bosque"], filter: { positions: ["FW"] } })] },
  // "aumenta el atributo de Tiro de viento de los aliados": Tiro de los aliados de Viento
  "101009001": { effects: [ally({ kind: "stat", value: 358, stats: ["kick"], filter: { elements: ["Viento"] } })] },
};
