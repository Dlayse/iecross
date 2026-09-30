// Plantilla ↔ enlace. Todo va en el fragmento (#) de la URL: no pasa por ningún servidor.
import { withBase } from "@/lib/paths";
import { PLAYER_BY_ID } from "./data";
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
  tr?: Profile["training"];
  gm?: Profile["gearMode"];
  g?: Profile["gear"];
  pf?: Profile["prefs"];
}

const toB64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64 = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)));

export function encodeProfile(p: Profile): string {
  const s = Object.fromEntries(p.owned.filter((id) => p.stages[id] && p.stages[id] !== defaultStage(id)).map((id) => [id, p.stages[id]]));
  const packed: Packed = { v: 1, n: p.name, o: p.owned, l: p.level, c: p.coaches, t: p.techLevel };
  if (Object.keys(s).length) packed.s = s;
  if (p.locked.length) packed.k = p.locked;
  const tr = Object.fromEntries(Object.entries(p.training ?? {}).filter(([id, t]) => p.owned.includes(id) && (t.stat || t.power)));
  if (Object.keys(tr).length) packed.tr = tr;
  if (p.gearMode === "manual") {
    packed.gm = "manual";
    packed.g = p.gear;
  }
  if (p.prefs) packed.pf = p.prefs;
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
      training: Object.fromEntries(Object.entries(x.tr ?? {}).filter(([id]) => owned.includes(id))),
      gearMode: x.gm === "manual" ? "manual" : "auto",
      gear: x.g,
      prefs: x.pf,
    };
  } catch {
    return null;
  }
}

export function shareUrl(p: Profile) {
  return `${window.location.origin}${withBase("/importar/")}#${encodeProfile(p)}`;
}
