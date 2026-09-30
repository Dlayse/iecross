"use client";
import { useState } from "react";
import { shareUrl } from "@/lib/share";
import { withBase } from "@/lib/paths";
import type { Element, Player } from "@/lib/types";
import type { useProfiles } from "@/lib/store";

export const ELEMENT_CLASS: Record<Element, string> = {
  Fuego: "bg-fuego",
  Viento: "bg-viento",
  Bosque: "bg-bosque",
  Montaña: "bg-montana",
};
export const ELEMENT_TEXT: Record<Element, string> = {
  Fuego: "text-fuego",
  Viento: "text-viento",
  Bosque: "text-bosque",
  Montaña: "text-montana",
};
export const POS_CLASS: Record<string, string> = {
  GK: "bg-amber-400 text-amber-950",
  DF: "bg-sky-400 text-sky-950",
  MF: "bg-emerald-400 text-emerald-950",
  FW: "bg-rose-400 text-rose-950",
};

export function PosBadge({ pos }: { pos: string }) {
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${POS_CLASS[pos]}`}>{pos}</span>;
}

export function ElementDot({ el }: { el: Element }) {
  return <span title={el} className={`inline-block h-2.5 w-2.5 rounded-full ${ELEMENT_CLASS[el]}`} />;
}

export function Stars({ n }: { n: number }) {
  return <span className="text-bolt text-xs tracking-tighter">{"★".repeat(n)}</span>;
}

export function Face({ p, size = 48 }: { p: Player; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={withBase(p.image)} alt={p.name} width={size} height={size} loading="lazy" className="rounded-md bg-panel-2 object-cover" style={{ width: size, height: size }} />
  );
}

export function ProfileBar({ ctx }: { ctx: ReturnType<typeof useProfiles> }) {
  const { profiles, profile, setActive, add, rename, remove } = ctx;
  const [copied, setCopied] = useState(false);
  if (!profile) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-panel p-3">
      <span className="text-xs font-bold uppercase tracking-wider text-muted">Perfil</span>
      {profiles.map((p) => (
        <button
          key={p.id}
          onClick={() => setActive(p.id)}
          className={`rounded-full px-3 py-1 text-sm font-semibold ${p.id === profile.id ? "bg-bolt text-bolt-ink" : "bg-panel-2 hover:bg-line"}`}
        >
          {p.name} <span className="opacity-60">· {p.owned.length}</span>
        </button>
      ))}
      <button
        className="rounded-full border border-dashed border-line px-3 py-1 text-sm text-muted hover:text-text"
        onClick={() => {
          const n = prompt("Nombre del perfil (p. ej. el de un amigo)");
          if (n?.trim()) add(n.trim());
        }}
      >
        + Añadir persona
      </button>
      <div className="ml-auto flex items-center gap-3 text-xs text-muted">
        <button
          className="rounded-md border border-bolt/50 px-2 py-1 font-semibold text-bolt hover:bg-bolt hover:text-bolt-ink"
          onClick={async () => {
            const url = shareUrl(profile);
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              prompt("Copia este enlace:", url);
            }
          }}
        >
          {copied ? "✓ Enlace copiado" : "🔗 Compartir plantilla"}
        </button>
        <button className="hover:text-text" onClick={() => { const n = prompt("Nuevo nombre", profile.name); if (n?.trim()) rename(n.trim()); }}>Renombrar</button>
        {profiles.length > 1 && (
          <button className="hover:text-bad" onClick={() => confirm(`¿Borrar el perfil ${profile.name}?`) && remove(profile.id)}>Borrar</button>
        )}
      </div>
    </div>
  );
}
