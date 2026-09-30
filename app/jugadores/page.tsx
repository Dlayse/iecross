"use client";
import { useMemo, useState } from "react";
import { PLAYERS } from "@/lib/data";
import { AWAKEN_RANKS, BENCH, benchStat, soloTechniques, type Role } from "@/lib/engine";
import { stageOf, useProfiles , effectiveGear, trainingOf } from "@/lib/store";
import { ELEMENT_TEXT, ElementDot, Face, PosBadge, ProfileBar, Stars } from "@/components/ui";
import type { Position, TechType } from "@/lib/types";

const TYPES: TechType[] = ["Tiro", "Regate", "Bloqueo", "Parada"];
/** Contra qué se mide cada tipo de técnica en el meta */
const VERSUS: Record<TechType, { role: Role; label: string }> = {
  Tiro: { role: "catch", label: "portero meta" },
  Parada: { role: "shot", label: "tiro meta" },
  Regate: { role: "block", label: "defensa meta" },
  Bloqueo: { role: "dribble", label: "regate meta" },
};
const k = (x: number) => (x >= 10000 ? `${(x / 1000).toFixed(1)}k` : Math.round(x).toLocaleString("es"));

export default function PlayersPage() {
  const ctx = useProfiles();
  const { profile } = ctx;
  const [q, setQ] = useState("");
  const [pos, setPos] = useState<Position | "">("");
  const [type, setType] = useState<TechType | "">("");
  const [onlyOwned, setOnlyOwned] = useState(true);
  const [mode, setMode] = useState<"full" | "base">("full");

  const rows = useMemo(() => {
    if (!profile) return [];
    const owned = new Set(profile.owned);
    const metaDuel = (r: Role) => (benchStat(r, profile.level) * BENCH[r].power * BENCH[r].mult) / 100;
    const s = q.trim().toLowerCase();
    return PLAYERS.filter(
      (p) =>
        (!onlyOwned || owned.has(p.id) || profile.owned.length === 0) &&
        (!pos || p.position === pos) &&
        (!s || [p.name, ...p.aliases, p.team, ...p.tags].join(" ").toLowerCase().includes(s)),
    )
      .flatMap((p) => {
        const stage = owned.has(p.id) ? stageOf(profile, p.id) : 10;
        return soloTechniques(p, { techLevel: profile.techLevel, playerLevel: profile.level, gear: effectiveGear(profile), training: (id) => trainingOf(profile, id), stage })
          .filter((t) => !type || t.tech.type === type)
          .map((t) => {
            const v = mode === "full" ? t.full : t.base;
            return { p, stage, t, v, ratio: v / metaDuel(VERSUS[t.tech.type].role) };
          });
      })
      .sort((a, b) => b.ratio - a.ratio);
  }, [profile, q, pos, type, onlyOwned, mode]);

  if (!profile) return <p className="text-muted">Cargando…</p>;

  return (
    <div className="space-y-5">
      <section>
        <h1 className="font-display text-4xl font-extrabold tracking-wide">Poder de cada técnica</h1>
        <p className="mt-1 max-w-3xl text-muted">
          Poder aproximado de cada técnica, con tu nivel ({profile.level}), técnicas a Nv {profile.techLevel} y el despertar de cada jugador. No
          cuenta entrenador, compañeros ni pasivas que dependan del partido: eso lo ves en los equipos. La barra lo compara con lo que tendría
          enfrente en el meta (un tiro contra el portero meta, una parada contra el tiro meta…); 100 % es un duelo igualado.
        </p>
      </section>
      <ProfileBar ctx={ctx} />

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar jugador, equipo, etiqueta…"
          className="min-w-48 flex-1 rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-bolt"
        />
        <select value={type} onChange={(e) => setType(e.target.value as TechType | "")} className="rounded-lg border border-line bg-panel px-2 py-2 text-sm">
          <option value="">Todas las técnicas</option>
          {TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={pos} onChange={(e) => setPos(e.target.value as Position | "")} className="rounded-lg border border-line bg-panel px-2 py-2 text-sm">
          <option value="">Posición</option>
          {(["GK", "DF", "MF", "FW"] as const).map((x) => <option key={x}>{x}</option>)}
        </select>
        <div className="flex overflow-hidden rounded-lg border border-line text-sm">
          <button onClick={() => setMode("full")} className={`px-3 py-2 ${mode === "full" ? "bg-bolt text-bolt-ink" : "bg-panel"}`} title="Con su mejor zona y sus pasivas propias siempre activas">Con sus pasivas</button>
          <button onClick={() => setMode("base")} className={`px-3 py-2 ${mode === "base" ? "bg-bolt text-bolt-ink" : "bg-panel"}`} title="Solo estadística y técnica">Base</button>
        </div>
        <label className="flex items-center gap-1.5 text-sm text-muted">
          <input type="checkbox" checked={onlyOwned} onChange={(e) => setOnlyOwned(e.target.checked)} /> Solo los míos
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-panel">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-muted">
            <tr className="border-b border-line">
              <th className="px-3 py-2">Jugador</th>
              <th>Técnica</th>
              <th className="text-right">Poder téc.</th>
              <th className="text-right">TP</th>
              <th className="text-right">Poder de duelo</th>
              <th className="w-56 px-3">Frente al meta</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, stage, t, v, ratio }) => (
              <tr key={p.id + t.tech.code} className={`border-t border-line/50 ${t.known ? "" : "opacity-40"}`}>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <Face p={p} size={32} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{p.name}</div>
                      <div className="flex items-center gap-1 text-[10px] text-muted">
                        <PosBadge pos={p.position} /> <ElementDot el={p.element} /> <Stars n={p.stars} /> {AWAKEN_RANKS[stage - 1]}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="font-medium">
                    <span className={ELEMENT_TEXT[t.tech.element]}>●</span> {t.tech.name}
                  </div>
                  <div className="text-[11px] text-muted">
                    {t.tech.type}
                    {t.tech.element === p.element && " · mismo elemento +20%"}
                    {t.tech.chain && " · cadena"}
                    {t.tech.shootBlock && t.tech.type === "Bloqueo" && " · bloquea tiros"}
                    {t.tech.type === "Tiro" && ` · alcance ${t.range}`}
                    {!t.known && " · se aprende a nivel 31"}
                  </div>
                </td>
                <td className="text-right tabular-nums">{Math.round(t.power)}</td>
                <td className="text-right tabular-nums text-muted">{Math.round(t.tp)}</td>
                <td className="text-right font-bold tabular-nums">{k(v)}</td>
                <td className="px-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                      <div className={`h-full rounded-full ${ratio >= 1 ? "bg-good" : "bg-bolt"}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
                    </div>
                    <span className="w-12 text-right text-xs tabular-nums" title={`contra el ${VERSUS[t.tech.type].label}`}>
                      {Math.round(ratio * 100)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-4 text-sm text-muted">Nadie con esos filtros.</p>}
      </div>
    </div>
  );
}
