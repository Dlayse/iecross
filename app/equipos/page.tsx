"use client";
import { withBase } from "@/lib/paths";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { COACHES, PLAYERS } from "@/lib/data";
import { DEFAULT_PREFS, evaluate, type Lineup, type Prefs } from "@/lib/engine";
import { PrefsPanel } from "@/components/PrefsPanel";
import { coachLevel, stageOf, useProfiles , effectiveGear, trainingOf } from "@/lib/store";
import { ProfileBar } from "@/components/ui";
import { TeamCard } from "@/components/TeamCard";

export default function TeamsPage() {
  const ctx = useProfiles();
  const { profile } = ctx;
  const [lineups, setLineups] = useState<Lineup[] | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number; ms?: number } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const workers = useRef<Worker[]>([]);
  const [genPrefs, setGenPrefs] = useState<Prefs | null>(null);
  const [ideals, setIdeals] = useState<Record<string, Lineup>>({});
  const prefs = profile?.prefs ?? DEFAULT_PREFS;
  const stopAll = () => {
    workers.current.forEach((w) => w.terminate());
    workers.current = [];
  };

  useEffect(() => {
    setLineups(null);
  }, [profile?.id]);
  useEffect(() => stopAll, []);
  // /equipos#auto (lo usa /demo): generar en cuanto el perfil esté listo
  useEffect(() => {
    if (profile && window.location.hash === "#auto" && !lineups && !workers.current.length) {
      history.replaceState(null, "", withBase("/equipos/"));
      run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const coaches = useMemo(
    () => (profile ? COACHES.map((c) => ({ id: c.id, level: coachLevel(profile, c.id) })).filter((c) => c.level > 0) : []),
    [profile],
  );

  const run = () => {
    if (!profile) return;
    stopAll();
    // Un worker por núcleo libre (máx. 6); los entrenadores se reparten y cada resultado llega suelto.
    const n = Math.max(1, Math.min(coaches.length, 6, (navigator.hardwareConcurrency || 4) - 1));
    const t0 = performance.now();
    let done = 0;
    let finished = 0;
    setProgress({ done: 0, total: coaches.length });
    setLineups([]);
    const base = {
      pool: profile.owned,
      techLevel: profile.techLevel,
      playerLevel: profile.level,
      stages: Object.fromEntries(profile.owned.map((id) => [id, stageOf(profile, id)])),
      locked: profile.locked.filter((id) => profile.owned.includes(id)),
      prefs,
      gear: effectiveGear(profile),
      training: Object.fromEntries(profile.owned.map((id) => [id, trainingOf(profile, id)]).filter(([, t]) => t)),
    };
    setGenPrefs(prefs);
    setIdeals({});
    // Once ideal de cada formación: toda la base, despertar máximo, con tu nivel, equipamiento y entrenador.
    const ideal = { ...base, tag: "ideal", pool: PLAYERS.map((p) => p.id), stages: {}, locked: [], training: {} };
    for (let k = 0; k < n; k++) {
      const w = new Worker(new URL("../../lib/recommend.worker.ts", import.meta.url));
      workers.current.push(w);
      w.onmessage = (e) => {
        if (e.data.type === "result" && e.data.tag === "mine") {
          done++;
          setLineups((prev) => [...(prev ?? []), e.data.lineup]);
          setProgress({ done, total: coaches.length });
        } else if (e.data.type === "result" && e.data.tag === "ideal") {
          setIdeals((prev) => ({ ...prev, [e.data.lineup.coachId]: e.data.lineup }));
        } else if (e.data.type === "done" && e.data.tag === "mine") {
          if (++finished === n) setProgress({ done, total: coaches.length, ms: performance.now() - t0 });
        } else if (e.data.type === "done" && e.data.tag === "ideal") {
          w.terminate();
          workers.current = workers.current.filter((x) => x !== w);
        }
      };
      const mine = coaches.filter((_, i) => i % n === k);
      w.postMessage({ ...base, tag: "mine", coaches: mine });
      w.postMessage({ ...ideal, coaches: mine });
    }
  };

  const idealEvals = useMemo(() => {
    if (!profile) return {};
    return Object.fromEntries(
      Object.entries(ideals).map(([cid, l]) => [
        cid,
        { lineup: l, ev: evaluate(l, { techLevel: profile.techLevel, playerLevel: profile.level, prefs: genPrefs ?? prefs, gear: effectiveGear(profile) }) },
      ]),
    );
  }, [ideals, profile, genPrefs, prefs]);

  const results = useMemo(() => {
    if (!lineups || !profile) return [];
    return lineups
      .map((l) => ({ l, ev: evaluate(l, { techLevel: profile.techLevel, playerLevel: profile.level, prefs: genPrefs ?? prefs, gear: effectiveGear(profile), training: (id) => trainingOf(profile, id), awakening: (id) => stageOf(profile, id) }) }))
      .sort((a, b) => b.ev.score - a.ev.score);
  }, [lineups, profile, genPrefs, prefs]);

  if (!profile) return <p className="text-muted">Cargando…</p>;
  const enough = profile.owned.length >= 11;

  return (
    <div className="space-y-5">
      <section>
        <h1 className="font-display text-4xl font-extrabold tracking-wide">Equipos recomendados</h1>
        <p className="mt-1 max-w-3xl text-muted">
          Para cada entrenador que tienes, buscamos el once que más puntúa con tus jugadores. La puntuación compara tus duelos
          (tiro, parada, regate y robo) contra el <b className="text-text">mejor equipo posible de toda la base</b>: un 10 significa que
          empatarías con él.
        </p>
      </section>
      <ProfileBar ctx={ctx} />
      <PrefsPanel prefs={prefs} onChange={(p) => ctx.update((pr) => ({ ...pr, prefs: p }))} />

      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={!enough || (!!progress && progress.ms === undefined) || coaches.length === 0}
          onClick={run}
          className="rounded-xl bg-bolt px-5 py-2.5 font-display text-xl font-extrabold text-bolt-ink hover:brightness-110 disabled:opacity-40"
        >
          ⚡ {lineups ? "Volver a generar" : "Generar equipos"}
        </button>
        {progress?.ms !== undefined && <span className="text-xs text-good">✓ {progress.total} formaciones en {(progress.ms / 1000).toFixed(1)} s</span>}
        <span className="text-sm text-muted">
          {profile.owned.length} jugadores · nivel {profile.level} · {coaches.length} entrenadores · técnicas Nv {profile.techLevel}
        </span>
        {genPrefs && lineups && JSON.stringify(genPrefs) !== JSON.stringify(prefs) && (
          <span className="rounded-md border border-bolt/50 px-2 py-1 text-xs text-bolt">Has cambiado el estilo: vuelve a generar para aplicarlo</span>
        )}
        {!enough && (
          <Link href="/" className="text-sm text-bolt underline">Marca al menos 11 jugadores</Link>
        )}
      </div>

      {progress && progress.ms === undefined && (
        <div className="rounded-xl border border-line bg-panel p-4">
          <div className="mb-2 text-sm">Probando formaciones… {progress.done}/{progress.total}</div>
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full bg-bolt transition-all" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="space-y-4">
        {(showAll ? results : results.slice(0, 3)).map(({ l, ev }, i) => (
          <TeamCard key={l.coachId} ev={ev} rank={i + 1} coachId={l.coachId} coachLevel={l.coachLevel} pinned={profile.locked} ideal={idealEvals[l.coachId]} owned={profile.owned} />
        ))}
      </div>
      {results.length > 3 && (
        <button onClick={() => setShowAll(!showAll)} className="w-full rounded-xl border border-line py-2 text-sm text-muted hover:text-text">
          {showAll ? "Ver solo los 3 mejores" : `Ver las ${results.length} formaciones`}
        </button>
      )}
    </div>
  );
}
