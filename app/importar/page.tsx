"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { COACHES, PLAYER_BY_ID } from "@/lib/data";
import { AWAKEN_RANKS } from "@/lib/engine";
import { decodeProfile } from "@/lib/share";
import { stageOf, useProfiles, type Profile } from "@/lib/store";
import { Face } from "@/components/ui";

export default function ImportPage() {
  const ctx = useProfiles();
  const [data, setData] = useState<Omit<Profile, "id"> | null | undefined>(undefined);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setData(decodeProfile(window.location.hash.slice(1)));
  }, []);

  if (data === undefined || !ctx.ready) return <p className="text-muted">Cargando…</p>;
  if (data === null)
    return (
      <div className="space-y-2">
        <h1 className="font-display text-4xl font-extrabold">Enlace no válido</h1>
        <p className="text-muted">El enlace está incompleto o dañado. Pide que te lo vuelvan a copiar.</p>
        <Link href="/" className="text-bolt underline">Ir a mi plantilla</Link>
      </div>
    );

  const preview = { id: "x", ...data } as Profile;
  const importIt = () => {
    ctx.add(data.name, data);
    setDone(true);
  };

  return (
    <div className="space-y-5">
      <section>
        <p className="text-xs font-bold uppercase tracking-wider text-bolt">Plantilla compartida</p>
        <h1 className="font-display text-4xl font-extrabold">{data.name}</h1>
        <p className="text-muted">
          {data.owned.length} jugadores · nivel {data.level} · técnicas Nv {data.techLevel} ·{" "}
          {COACHES.filter((c) => (data.coaches[c.id] ?? 1) > 0).length} entrenadores
        </p>
      </section>

      {done ? (
        <div className="rounded-xl border border-good/40 bg-good/10 p-4">
          <p>
            Añadida como perfil <b>{data.name}</b>.
          </p>
          <div className="mt-2 flex gap-3">
            <Link href="/equipos" className="rounded-lg bg-bolt px-4 py-2 font-bold text-bolt-ink">⚡ Generar sus equipos</Link>
            <Link href="/" className="rounded-lg border border-line px-4 py-2">Ver plantilla</Link>
          </div>
        </div>
      ) : (
        <button onClick={importIt} className="rounded-xl bg-bolt px-5 py-2.5 font-display text-xl font-extrabold text-bolt-ink hover:brightness-110">
          Añadir como perfil nuevo
        </button>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {data.owned.map((id) => {
          const p = PLAYER_BY_ID.get(id)!;
          return (
            <div key={id} className="flex items-center gap-2 rounded-lg border border-line bg-panel p-2">
              <Face p={p} size={36} />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{p.name}</div>
                <div className="text-[11px] text-muted">
                  {p.position} · {AWAKEN_RANKS[stageOf(preview, id) - 1]}
                  {data.locked.includes(id) && " · 📌"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
