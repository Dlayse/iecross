// Plantilla ↔ enlace. Todo va en el fragmento (#) de la URL: no pasa por ningún servidor.
import { withBase } from "@/lib/paths";
import { PLAYER_BY_ID, TECH_BY_CODE } from "./data";
import { defaultStage, type Profile } from "./store";

interface Packed {
  v: 1;
  n: string;
  o: string[];
  s?: Record<string, number>;
  l: number;
  c: Record<string, number>;
  t: number;
  k?: string[];
  gm?: Profile["gearMode"];
  g?: Profile["gear"];
  pf?: Profile["prefs"];
  x?: Profile["extraTech"];
  b?: Profile["books"];
}

const toB64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64 = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)));

export function encodeProfile(p: Profile): string {
  const s = Object.fromEntries(p.owned.filter((id) => p.stages[id] && p.stages[id] !== defaultStage(id)).map((id) => [id, p.stages[id]]));
  const packed: Packed = { v: 1, n: p.name, o: p.owned, l: p.level, c: p.coaches, t: p.techLevel };
  if (Object.keys(s).length) packed.s = s;
  if (p.locked.length) packed.k = p.locked;
  if (p.gearMode === "manual") {
    packed.gm = "manual";
    packed.g = p.gear;
  }
  if (p.prefs) packed.pf = p.prefs;
  const x = Object.fromEntries(Object.entries(p.extraTech ?? {}).filter(([id]) => p.owned.includes(id)));
  if (Object.keys(x).length) packed.x = x;
  const b = Object.fromEntries(Object.entries(p.books ?? {}).filter(([, n]) => n > 0));
  if (Object.keys(b).length) packed.b = b;
  return toB64(JSON.stringify(packed));
}

export function decodeProfile(code: string): Omit<Profile, "id"> | null {
  try {
    const x = JSON.parse(fromB64(code)) as Packed;
    if (x.v !== 1 || !Array.isArray(x.o)) return null;
    const owned = x.o.filter((id) => PLAYER_BY_ID.has(id));
    return {
      name: String(x.n || "Plantilla compartida").slice(0, 40),
      owned,
      stages: Object.fromEntries(Object.entries(x.s ?? {}).filter(([id, v]) => PLAYER_BY_ID.has(id) && v >= 1 && v <= 10)),
      level: Math.max(1, Math.min(440, Number(x.l) || 300)),
      coaches: x.c ?? {},
      techLevel: Math.max(1, Math.min(10, Number(x.t) || 10)),
      locked: (x.k ?? []).filter((id) => owned.includes(id)),
      gearMode: x.gm === "manual" ? "manual" : "auto",
      gear: x.g,
      prefs: x.pf,
      extraTech: Object.fromEntries(Object.entries(x.x ?? {}).filter(([id, code]) => owned.includes(id) && TECH_BY_CODE.has(code))),
      books: Object.fromEntries(Object.entries(x.b ?? {}).filter(([code, n]) => TECH_BY_CODE.has(code) && n > 0)),
    };
  } catch {
    return null;
  }
}

export function shareUrl(p: Profile) {
  return `${window.location.origin}${withBase("/importar/")}#${encodeProfile(p)}`;
}
