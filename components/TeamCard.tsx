"use client";
import { withBase } from "@/lib/paths";
import { useState } from "react";
import Link from "next/link";
import { COACH_BY_ID, PLAYERS } from "@/lib/data";

const PLAYERS_COUNT = PLAYERS.length;
import { AWAKEN_RANKS, TRIGGER_LABEL, type Evaluation } from "@/lib/engine";
import { STRATEGIES } from "@/lib/strategies";
import { ELEMENT_TEXT, Face, PosBadge } from "./ui";

/** Puntuación interna (50 = empatar con el meta) mostrada sobre 10 */
export const fmtScore = (s: number) => (s / 5).toLocaleString("es", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct = (x: number) => `${Math.round(x * 100)}%`;
const k = (x: number) => (x >= 10000 ? `${(x / 1000).toFixed(1)}k` : Math.round(x).toLocaleString("es"));

function Bar({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div title={hint}>
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <b>{pct(value)}</b>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-bolt" style={{ width: pct(Math.min(1, value)) }} />
      </div>
    </div>
  );
}

export function Pitch({ ev, pinned = [] }: { ev: Evaluation; pinned?: string[] }) {
  return (
    <div className="pitch relative aspect-[3/4] w-full overflow-hidden rounded-xl">
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/20" />
      <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
      <div className="absolute bottom-0 left-1/2 h-12 w-1/2 -translate-x-1/2 border border-b-0 border-white/20" />
      {ev.members.map((m) => {
        const left = 50 + m.slot.screenX * 40;
        const top = 88 - m.slot.screenY * 88 + 4;
        const cond = m.slot.condition;
        return (
          <div key={m.index} className="absolute flex w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${left}%`, top: `${top}%` }}>
            <div className="relative">
              <Face p={m.player} size={44} />
              {m.zone.rank && (
                <span className="absolute -right-1.5 -top-1.5 rounded bg-bolt px-1 text-[9px] font-black text-bolt-ink" title={`Zona ${m.zone.rank}: +${m.zone.bonus}% a estadísticas`}>
                  {m.zone.rank}
                </span>
              )}
              {cond && <span className="absolute -left-1.5 -top-1.5 text-[11px]" title={`Requisito: ${cond.type} ${cond.value}`}>🔒</span>}
              {pinned.includes(m.player.id) && <span className="absolute -bottom-1 -right-1.5 text-[11px]" title="Fijado">📌</span>}
            </div>
            <div className="mt-0.5 max-w-full truncate rounded bg-black/60 px-1 text-[10px] font-semibold leading-tight">
              <span className={ELEMENT_TEXT[m.player.element]}>●</span> {m.player.name.split(" ").slice(-1)[0]}
            </div>
            <div className="text-[9px] font-bold text-white/70">
              {m.slot.position}
              {m.player.position !== m.slot.position && <span className="text-bolt"> ({m.player.position})</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function editorHref(coachId: string, coachLevel: number, slots: (string | null)[]) {
  return `/editor/#c=${coachId}&l=${coachLevel}&s=${slots.map((s) => s ?? "").join(",")}`;
}

export function TeamCard({
  ev,
  rank,
  coachId,
  coachLevel,
  pinned = [],
  pitch,
  editable = true,
  ideal,
  owned,
}: {
  ev: Evaluation;
  rank?: number;
  coachId: string;
  coachLevel: number;
  pinned?: string[];
  pitch?: React.ReactNode;
  editable?: boolean;
  /** Once ideal de esta formación con toda la base (para saber a qué aspirar) */
  ideal?: { lineup: { slots: (string | null)[] }; ev: Evaluation };
  owned?: string[];
}) {
  const [showIdeal, setShowIdeal] = useState(false);
  const [open, setOpen] = useState(rank === 1 || !rank);
  const coach = COACH_BY_ID.get(coachId)!;
  const synergies = ev.passives.filter((p) => p.status === "activa" && (p.conditional || p.weight !== 1));
  const blocked = ev.passives.filter((p) => p.status === "requisito");
  const best = ev.shooters[0];
  const strategy = STRATEGIES[coachId];
  const gkWrong = ev.members.find((m) => m.slot.position === "GK" && m.player.position !== "GK");
  const locked = ev.passives.filter((p) => p.status === "despertar" || p.status === "nivel");

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-panel">
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-panel-2 px-4 py-3">
        {rank && <span className="grid h-9 w-9 place-items-center rounded-lg bg-bolt font-display text-xl font-extrabold text-bolt-ink">{rank}</span>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={withBase(coach.assets.small.replace(/^assets\//, ""))} alt="" className="h-9 w-9 rounded" />
        <div>
          <div className="font-display text-2xl font-bold leading-none">{coach.formation.name}</div>
          <div className="text-xs text-muted">
            {coach.name} · Nv {coachLevel} · formación {ev.formationActive ? <b className="text-good">activa</b> : <b className="text-bad">sin activar</b>}
            {gkWrong && <b className="text-bad"> · ⚠ {gkWrong.player.name} no es portero</b>}
          </div>
        </div>
        {editable && (
          <Link
            href={editorHref(coachId, coachLevel, Array.from({ length: 11 }, (_, i) => ev.members.find((m) => m.index === i)?.player.id ?? null))}
            className="ml-auto rounded-md border border-line px-2 py-1 text-xs text-muted hover:border-bolt hover:text-bolt"
          >
            ✏️ Editar este equipo
          </Link>
        )}
        <div className={`${editable ? "" : "ml-auto "}text-right`}>
          <div className="font-display text-4xl font-extrabold leading-none text-bolt">{fmtScore(ev.score)}<span className="text-lg text-muted">/10</span></div>
          <div className="text-[10px] uppercase tracking-wider text-muted">puntuación</div>
        </div>
      </header>

      <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,340px)_1fr]">
        {pitch ?? <Pitch ev={ev} pinned={pinned} />}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <Bar label="Ataque" value={ev.parts.attack} hint="Probabilidad de que tus mejores tiros superen al portero de referencia" />
            <Bar label="Portería" value={ev.parts.defense} hint="Portero + bloqueos de tiro frente al tiro de referencia" />
            <Bar label="Regate" value={ev.parts.dribble} hint="Tus regateadores contra la defensa de referencia" />
            <Bar label="Robo" value={ev.parts.block} hint="Tus defensas contra el regate de referencia" />
          </div>

          {ideal ? (
            <div className="rounded-lg border border-line bg-panel-2 p-2 text-sm">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Techo de esta formación</span>
                <b className="font-display text-xl text-text">{fmtScore(ideal.ev.score)}</b>
                <span className="text-xs text-muted">
                  con toda la base al máximo despertar · el tuyo es el{" "}
                  <b className="text-bolt">{Math.round((ev.score / Math.max(1, ideal.ev.score)) * 100)}%</b>
                </span>
                <button onClick={() => setShowIdeal(!showIdeal)} className="ml-auto text-xs font-semibold text-bolt hover:underline">
                  {showIdeal ? "Ocultar once ideal" : "Ver once ideal"}
                </button>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-bolt" style={{ width: `${Math.min(100, (ev.score / Math.max(1, ideal.ev.score)) * 100)}%` }} />
              </div>
              {owned && (
                <div className="mt-1.5 text-xs text-muted">
                  {(() => {
                    const missing = ideal.ev.members.filter((m) => !owned.includes(m.player.id));
                    return missing.length ? (
                      <>
                        Te faltan del once ideal:{" "}
                        {missing.map((m, i) => (
                          <span key={m.player.id}>
                            {i > 0 && ", "}
                            <b className="text-text">{m.player.name}</b> <span className="text-[10px]">({m.slot.position})</span>
                          </span>
                        ))}
                      </>
                    ) : (
                      <span className="text-good">Tienes a todo el once ideal: súbelos de despertar y nivel para acercarte.</span>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : owned ? (
            <p className="text-xs text-muted">Calculando el techo de esta formación…</p>
          ) : null}

          <div className="grid gap-2 text-sm sm:grid-cols-2">
            {best && (
              <div className="rounded-lg bg-panel-2 p-2">
                <div className="text-[11px] uppercase tracking-wider text-muted">Tiro principal</div>
                <div className="font-semibold">{best.member.player.name} · {best.tech.tech.name}</div>
                <div className="text-xs text-muted">{k(best.tech.duel)} de poder vs {k(ev.rival.catch.duel)} del portero meta</div>
              </div>
            )}
            {ev.keeper && (
              <div className="rounded-lg bg-panel-2 p-2">
                <div className="text-[11px] uppercase tracking-wider text-muted">Portero</div>
                <div className="font-semibold">{ev.keeper.member.player.name} · {ev.keeper.tech?.tech.name ?? "sin técnica"}</div>
                <div className="text-xs text-muted">{k(ev.keeper.tech?.duel ?? 0)} vs {k(ev.rival.shot.duel)} del tiro meta</div>
              </div>
            )}
          </div>

          {strategy && (
            <div className="rounded-lg border border-bolt/30 bg-bolt/5 p-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-bolt">Estrategia</span>
                <b className="font-display text-lg leading-none">{strategy.title}</b>
                {strategy.tier && <span className="ml-auto rounded bg-bolt px-1.5 text-[10px] font-black text-bolt-ink">Tier {strategy.tier}</span>}
              </div>
              <p className="mt-1 text-sm text-muted">{strategy.summary}</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                {strategy.keys.map((k) => (
                  <li key={k} className="rounded bg-panel-2 px-1.5 py-0.5">{k}</li>
                ))}
              </ul>
            </div>
          )}

          {ev.combos.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Combos clave</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { label: "Potencian a tu portero", member: ev.keeper?.member, tech: ev.keeper?.tech },
                  { label: "Potencian a tu tirador", member: best?.member, tech: best?.tech },
                ].map(({ label, member, tech }) => {
                  if (!member || !tech) return null;
                  const feeds = ev.combos.filter((c) => c.toId === member.player.id).slice(0, 5);
                  return (
                    <div key={label} className="rounded-lg bg-panel-2 p-2 text-xs">
                      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
                      <div className="mb-1 text-sm font-semibold">
                        {member.player.name} · {tech.tech.name}{" "}
                        <span className="font-normal text-muted">
                          poder {tech.basePower}→{Math.round(tech.power)} · {k(tech.duel)}
                        </span>
                      </div>
                      {feeds.length ? (
                        <ul className="space-y-0.5">
                          {feeds.map((c) => (
                            <li key={c.from} className="flex gap-2">
                              <span className="min-w-0 flex-1 truncate" title={c.what.join(" · ")}>
                                <b>{c.from}</b> <span className="text-muted">{c.what.join(" · ")}</span>
                              </span>
                              <span className="shrink-0 font-bold text-good">+{k(c.delta)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted">Nadie le refuerza: busca jugadores cuyas pasivas le apunten.</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <details className="mt-1.5 text-xs">
                <summary className="cursor-pointer text-muted hover:text-text">Todos los combos del once ({ev.combos.length})</summary>
                <ul className="mt-1 space-y-0.5">
                  {ev.combos.slice(0, 25).map((c) => (
                    <li key={c.from + c.toId} className="flex gap-2">
                      <span className="min-w-0 flex-1 truncate">
                        <b>{c.from}</b> → <b>{c.to}</b> <span className="text-muted">{c.what.join(" · ")}</span>
                      </span>
                      <span className="shrink-0 text-good">+{k(c.delta)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}

          {ev.engines.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Motor de este once</h3>
              <ul className="space-y-1.5 text-sm">
                {ev.engines.slice(0, 4).map((en) => (
                  <li key={en.trigger} className="rounded-lg bg-panel-2 px-2 py-1.5">
                    <div className="flex items-baseline gap-2">
                      <b className="first-letter:uppercase">{TRIGGER_LABEL[en.trigger]}</b>
                      <span className="text-xs text-muted" title="Veces que se estima que está activo de media (según quién lo provoca en este once)">≈ ×{en.weight.toFixed(1)}</span>
                    </div>
                    {en.feeders.length > 0 && (
                      <div className="text-xs text-muted">
                        Lo provocan: <span className="text-text">{en.feeders.join(", ")}</span>
                      </div>
                    )}
                    <div className="text-xs text-muted">
                      Se carga: <span className="text-good">{en.beneficiaries.join(" · ")}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Sinergias activas ({synergies.length})</h3>
            <ul className="flex flex-wrap gap-1.5">
              {synergies.map((s, i) => (
                <li key={i} title={`${s.description}\n→ ${s.targets.join(", ")}`} className="rounded-full border border-good/40 bg-good/10 px-2 py-0.5 text-xs">
                  <b>{s.owner}</b>: {s.name}
                  {s.detail && <span className="text-muted"> · {s.detail}</span>}
                  {s.level && s.level.lvl < s.level.max && <span className="text-bolt"> · Nv {s.level.lvl}/{s.level.max}</span>}
                </li>
              ))}
            </ul>
          </div>

          <button onClick={() => setOpen(!open)} className="text-sm font-semibold text-bolt hover:underline">
            {open ? "Ocultar detalle" : "Ver detalle por jugador"}
          </button>
        </div>
      </div>

      {showIdeal && ideal && (
        <div className="grid gap-4 border-t border-line p-4 md:grid-cols-[minmax(0,340px)_1fr]">
          <Pitch ev={ideal.ev} pinned={owned ? ideal.ev.members.filter((m) => owned.includes(m.player.id)).map((m) => m.player.id) : []} />
          <div className="space-y-2 text-sm">
            <h3 className="font-display text-xl font-bold">Once ideal · {fmtScore(ideal.ev.score)}/10</h3>
            <p className="text-xs text-muted">
              El mejor once posible con esta formación usando los {PLAYERS_COUNT} jugadores de la base al máximo despertar, con tu nivel, tu
              equipamiento, tu estilo y tu nivel de entrenador. 📌 = ya lo tienes.
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <Bar label="Ataque" value={ideal.ev.parts.attack} hint="" />
              <Bar label="Portería" value={ideal.ev.parts.defense} hint="" />
              <Bar label="Regate" value={ideal.ev.parts.dribble} hint="" />
              <Bar label="Robo" value={ideal.ev.parts.block} hint="" />
            </div>
            {ideal.ev.keeper?.tech && (
              <p className="text-xs text-muted">
                Portero {ideal.ev.keeper.member.player.name}: {k(ideal.ev.keeper.tech.duel)} · Tiro principal {ideal.ev.shooters[0]?.member.player.name}:{" "}
                {k(ideal.ev.shooters[0]?.tech.duel ?? 0)}
              </p>
            )}
          </div>
        </div>
      )}

      {open && (
        <div className="border-t border-line p-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="py-1">Casilla</th>
                  <th>Jugador</th>
                  <th>Zona</th>
                  <th>Técnicas (poder de duelo)</th>
                  <th>Refuerzos recibidos</th>
                </tr>
              </thead>
              <tbody>
                {ev.members.map((m) => (
                  <tr key={m.index} className="border-t border-line/60 align-top">
                    <td className="py-1.5"><PosBadge pos={m.slot.position} /> <span className="text-xs text-muted">#{m.slot.slot}</span></td>
                    <td className="font-semibold">
                      {m.player.name} <span className="text-xs text-muted">({m.player.position})</span>
                      <div className="text-[10px] font-normal text-muted">{AWAKEN_RANKS[m.stage - 1]}</div>
                    </td>
                    <td>{m.zone.rank ? `${m.zone.rank} +${m.zone.bonus}%` : <span className="text-muted">—</span>}</td>
                    <td>
                      {m.techs.map((t) => (
                        <div key={t.tech.code} className="text-xs">
                          <span className={ELEMENT_TEXT[t.tech.element]}>●</span> {t.tech.name} <span className="text-muted">({t.tech.type}{t.elemMatch ? ", +20%" : ""})</span> <b>{k(t.duel)}</b>
                          {t.power !== t.basePower && <span className="text-good"> · poder {t.basePower}→{Math.round(t.power)}</span>}
                        </div>
                      ))}
                    </td>
                    <td className="text-xs text-muted">
                      {(["kick", "technique", "block", "catch"] as const)
                        .filter((s) => m.statBuff[s] > 0)
                        .map((s) => `${{ kick: "Tiro", technique: "Técnica", block: "Bloqueo", catch: "Parada" }[s]} +${Math.round(m.statBuff[s])}`)
                        .join(" · ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {blocked.length > 0 && (
            <div className="mt-3">
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Pasivas que no se activan</h3>
              <ul className="flex flex-wrap gap-1.5">
                {blocked.map((s, i) => (
                  <li key={i} title={s.description} className="rounded-full border border-bad/40 bg-bad/10 px-2 py-0.5 text-xs">
                    <b>{s.owner}</b>: {s.name} <span className="text-muted">· {s.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {locked.length > 0 && (
            <div className="mt-3">
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Bloqueadas por nivel o despertar ({locked.length})</h3>
              <ul className="flex flex-wrap gap-1.5">
                {locked.map((s, i) => (
                  <li key={i} title={s.description} className="rounded-full border border-line bg-panel-2 px-2 py-0.5 text-xs text-muted">
                    <b className="text-text">{s.owner}</b>: {s.name} · {s.detail}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-3 text-[11px] text-muted">
            Las pasivas que dependen de algo que pasa en el partido cuentan según lo a menudo que se activan (p. ej. «{TRIGGER_LABEL.allySave}» ≈ 1,3 veces).
          </p>
        </div>
      )}
    </article>
  );
}
