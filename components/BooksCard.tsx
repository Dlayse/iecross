"use client";
// Manuales (秘伝書) que tienes sin usar. El generador sugiere a quién dárselos en cada equipo.
import { useState } from "react";
import { TECH_BY_CODE } from "@/lib/data";
import type { Profile } from "@/lib/store";
import { TechOptions } from "./ui";

export function BooksCard({ profile, update }: { profile: Profile; update: (fn: (p: Profile) => Profile) => void }) {
  const [pick, setPick] = useState("");
  const books = Object.entries(profile.books ?? {}).filter(([, n]) => n > 0);
  const setCount = (code: string, n: number) =>
    update((p) => {
      const b = { ...p.books };
      if (n > 0) b[code] = n;
      else delete b[code];
      return { ...p, books: b };
    });

  return (
    <div className="rounded-xl border border-line bg-panel p-3">
      <h2 className="font-display text-xl font-bold">📘 Manuales sin usar</h2>
      <p className="mb-2 text-xs text-muted">
        Los que tienes guardados (秘伝書). En cada equipo te diremos a quién ponérselos. Los que ya has usado van en la 3.ª técnica de cada jugador.
      </p>
      {books.length > 0 && (
        <ul className="mb-2 space-y-1 text-sm">
          {books.map(([code, n]) => {
            const t = TECH_BY_CODE.get(code);
            return (
              <li key={code} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate" title={t ? `${t.type} · ${t.element}` : code}>
                  {t?.name ?? code} <span className="text-[11px] text-muted">{t?.type}</span>
                </span>
                <button onClick={() => setCount(code, n - 1)} className="h-6 w-6 rounded border border-line text-muted hover:text-text">−</button>
                <b className="w-4 text-center tabular-nums">{n}</b>
                <button onClick={() => setCount(code, n + 1)} className="h-6 w-6 rounded border border-line text-muted hover:text-text">+</button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex gap-1">
        <select value={pick} onChange={(e) => setPick(e.target.value)} className="min-w-0 flex-1 rounded border border-line bg-panel-2 px-1 py-1 text-xs">
          <option value="">Añadir manual…</option>
          <TechOptions />
        </select>
        <button
          disabled={!pick}
          onClick={() => {
            setCount(pick, (profile.books?.[pick] ?? 0) + 1);
            setPick("");
          }}
          className="rounded bg-bolt px-2 text-xs font-bold text-bolt-ink disabled:opacity-40"
        >
          Añadir
        </button>
      </div>
    </div>
  );
}
