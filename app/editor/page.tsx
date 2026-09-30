"use client";
import { withBase } from "@/lib/paths";
import { useEffect, useMemo, useState } from "react";
import { COACHES, COACH_BY_ID, PLAYERS, PLAYER_BY_ID, slotArea, slotConditionMet, zoneBonus } from "@/lib/data";
import { evaluate } from "@/lib/engine";
import { coachLevel as ownedCoachLevel, stageOf, useProfiles , effectiveGear, trainingOf } from "@/lib/store";
import { ElementDot, ELEMENT_TEXT, Face, PosBadge, ProfileBar, Stars } from "@/components/ui";
import { editorHref, TeamCard } from "@/components/TeamCard";
import type { Position } from "@/lib/types";

const EMPTY = Array<string | null>(11).fill(null);

export default function EditorPage() {
  const ctx = useProfiles();
  const { profile } = ctx;
  const [coachId, setCoachId] = useState(COACHES[0].id);
  const [level, setLevel] = useState(5);
  const [slots, setSlots] = useState<(string | null)[]>(EMPTY);
  const [picking, setPicking] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Estado inicial desde el enlace (#c=…&l=…&s=…) o el primer entrenador que tengas
  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.slice(1));
    const c = h.get("c");
    if (c && COACH_BY_ID.has(c)) {
      setCoachId(c);
      setLevel(Math.max(1, Math.min(10, Number(h.get("l")) || 5)));
      const s = (h.get("s") ?? "").split(",");
      setSlots(Array.from({ length: 11 }, (_, i) => (s[i] && PLAYER_BY_ID.has(s[i]) ? s[i] : null)));
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) history.replaceState(null, "", withBase(editorHref(coachId, level, slots)));
  }, [coachId, level, slots, loaded]);

  const coach = COACH_BY_ID.get(coachId)!;
  const ev = useMemo(
    () =>
      profile
        ? evaluate({ coachId, coachLevel: level, slots }, { techLevel: profile.techLevel, playerLevel: profile.level, prefs: profile.prefs, gear: effectiveGear(profile), training: (id) => trainingOf(profile, id), awakening: (id) => stageOf(profile, id) })
        : null,
    [coachId, level, slots, profile],
  );

  if (!profile || !ev) return <p className="text-muted">Cargando…</p>;

  const changeCoach = (id: string) => {
    setCoachId(id);
    const lv = ownedCoachLevel(profile, id);
    if (lv > 0) setLevel(lv);
  };

  const pitch = (
    <div className="pitch relative aspect-[3/4] w-full overflow-hidden rounded-xl">
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/20" />
      <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
      {coach.formation.slots.map((s, i) => {
        const p = slots[i] ? PLAYER_BY_ID.get(slots[i]!) : undefined;
        const m = ev.members.find((x) => x.index === i);
        const condOk = slotConditionMet(s.condition, p);
        return (
          <button
            key={i}
            onClick={() => setPicking(i)}
            className="absolute flex w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${50 + s.screenX * 40}%`, top: `${92 - s.screenY * 88}%` }}
            title={s.condition ? `Requisito: ${s.condition.type} ${s.condition.value}` : "Cambiar jugador"}
          >
            <div className={`relative rounded-md ${picking === i ? "ring-2 ring-bolt" : ""}`}>
              {p ? (
                <Face p={p} size={44} />
              ) : (
                <div className="grid h-11 w-11 place-items-center rounded-md border-2 border-dashed border-white/40 bg-black/30 text-lg text-white/70">+</div>
              )}
              {m?.zone.rank && <span className="absolute -right-1.5 -top-1.5 rounded bg-bolt px-1 text-[9px] font-black text-bolt-ink">{m.zone.rank}</span>}
              {s.condition && <span className={`absolute -left-1.5 -top-1.5 text-[11px] ${condOk ? "" : "grayscale"}`}>{condOk ? "✅" : "🔒"}</span>}
            </div>
            <div className="mt-0.5 max-w-full truncate rounded bg-black/60 px-1 text-[10px] font-semibold leading-tight">
              {p ? <><span className={ELEMENT_TEXT[p.element]}>●</span> {p.name.split(" ").slice(-1)[0]}</> : s.condition ? `${s.condition.value}` : "vacío"}
            </div>
            <div className="text-[9px] font-bold text-white/70">
              {s.position}
              {p && p.position !== s.position && <span className="text-bolt"> ({p.position})</span>}
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-5">
      <section>
        <h1 className="font-display text-4xl font-extrabold tracking-wide">Editor de equipo</h1>
        <p className="mt-1 max-w-3xl text-muted">Monta tu once a mano y mira cómo cambian la puntuación, las sinergias y el motor de la estrategia. Pulsa una casilla para elegir jugador.</p>
      </section>
      <ProfileBar ctx={ctx} />

      <div className="flex flex-wrap items-center gap-2">
        <select value={coachId} onChange={(e) => changeCoach(e.target.value)} className="rounded-lg border border-line bg-panel px-2 py-2 text-sm">
          {COACHES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.formation.name} · {c.name}
            </option>
          ))}
        </select>
        <select value={level} onChange={(e) => setLevel(Number(e.target.value))} className="rounded-lg border border-line bg-panel px-2 py-2 text-sm">
          {Array.from({ length: 10 }, (_, i) => (
            <option key={i + 1} value={i + 1}>Entrenador Nv {i + 1}</option>
          ))}
        </select>
        <button onClick={() => setSlots(EMPTY)} className="rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-text">Vaciar</button>
        <span className="text-xs text-muted">El enlace de la barra de direcciones guarda este equipo: puedes compartirlo tal cual.</span>
      </div>

      <TeamCard ev={ev} coachId={coachId} coachLevel={level} pitch={pitch} pinned={profile.locked} editable={false} />

      {picking !== null && (
        <Picker
          slotIndex={picking}
          coachId={coachId}
          current={slots}
          owned={profile.owned}
          onClose={() => setPicking(null)}
          onPick={(id) => {
            setSlots((prev) => {
              const next = [...prev];
              const already = next.indexOf(id);
              if (id && already >= 0) next[already] = next[picking]; // intercambio si ya estaba en el once
              next[picking] = id;
              return next;
            });
            setPicking(null);
          }}
        />
      )}
    </div>
  );
}

function Picker({
  slotIndex,
  coachId,
  current,
  owned,
  onClose,
  onPick,
}: {
  slotIndex: number;
  coachId: string;
  current: (string | null)[];
  owned: string[];
  onClose: () => void;
  onPick: (id: string | null) => void;
}) {
  const slot = COACH_BY_ID.get(coachId)!.formation.slots[slotIndex];
  const area = slotArea(slot.fieldX, slot.fieldY);
  const [q, setQ] = useState("");
  const [pos, setPos] = useState<Position | "">(slot.position);
  const [all, setAll] = useState(owned.length < 11);
  const ownedSet = new Set(owned);
  const rankVal = { S: 3, A: 2, B: 1 } as Record<string, number>;

  const list = PLAYERS.filter(
    (p) =>
      (all || ownedSet.has(p.id)) &&
      (!pos || p.position === pos) &&
      (!q || [p.name, ...p.aliases, p.team, ...p.tags].join(" ").toLowerCase().includes(q.toLowerCase())),
  )
    .map((p) => ({ p, zone: zoneBonus(p, area), cond: slotConditionMet(slot.condition, p) }))
    .sort((a, b) => Number(b.cond) - Number(a.cond) || (rankVal[b.zone.rank ?? ""] ?? 0) - (rankVal[a.zone.rank ?? ""] ?? 0) || b.p.stats.power - a.p.stats.power);

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-line bg-panel" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <b className="font-display text-xl">
            Casilla {slot.slot} · {slot.position}
          </b>
          {slot.condition && <span className="rounded bg-panel-2 px-2 py-0.5 text-xs">Requisito: {slot.condition.type} {slot.condition.value}</span>}
          <button onClick={onClose} className="ml-auto text-muted hover:text-text">✕</button>
        </div>
        <div className="flex flex-wrap items-center gap-2 p-3">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="min-w-40 flex-1 rounded-lg border border-line bg-panel-2 px-3 py-1.5 text-sm outline-none focus:border-bolt" />
          <select value={pos} onChange={(e) => setPos(e.target.value as Position | "")} className="rounded-lg border border-line bg-panel-2 px-2 py-1.5 text-sm">
            <option value="">Todas</option>
            {(["GK", "DF", "MF", "FW"] as const).map((x) => <option key={x}>{x}</option>)}
          </select>
          <label className="flex items-center gap-1 text-sm text-muted">
            <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Incluir los que no tengo
          </label>
          {current[slotIndex] && (
            <button onClick={() => onPick(null)} className="rounded-lg border border-bad/50 px-2 py-1 text-sm text-bad">Quitar</button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-1.5 overflow-y-auto p-3 pt-0 sm:grid-cols-2">
          {list.map(({ p, zone, cond }) => (
            <button
              key={p.id}
              onClick={() => onPick(p.id)}
              className={`flex items-center gap-2 rounded-lg border p-1.5 text-left hover:border-bolt ${current.includes(p.id) ? "border-bolt/60 bg-panel-2" : "border-line"} ${ownedSet.has(p.id) ? "" : "opacity-60"}`}
            >
              <Face p={p} size={36} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">
                  {p.name} {current.includes(p.id) && <span className="text-[10px] text-bolt">(en el once)</span>}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted">
                  <PosBadge pos={p.position} /> <ElementDot el={p.element} /> <Stars n={p.stars} /> {p.team}
                </div>
              </div>
              <div className="text-right text-[10px]">
                {zone.rank && <div className="rounded bg-bolt px-1 font-black text-bolt-ink">Zona {zone.rank}</div>}
                {slot.condition && <div className={cond ? "text-good" : "text-bad"}>{cond ? "cumple" : "no cumple"}</div>}
              </div>
            </button>
          ))}
          {list.length === 0 && <p className="text-sm text-muted">Nadie con esos filtros.</p>}
        </div>
      </div>
    </div>
  );
}
