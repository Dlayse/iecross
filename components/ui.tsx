"use client";
import { useState } from "react";
import { decodeProfile, shareUrl } from "@/lib/share";
import { withBase } from "@/lib/paths";
import { BOOKS, BOOK_CODES, TECHNIQUES, TECH_BY_CODE } from "@/lib/data";
import type { Element, Player, TechType, Technique } from "@/lib/types";
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
  // Campo de texto en la propia barra (en lugar de prompt(), que algunos navegadores bloquean)
  const [mode, setMode] = useState<null | "add" | "import" | "rename" | "delete" | "copy">(null);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  if (!profile) return null;
  const open = (m: typeof mode, initial = "") => {
    setMode(mode === m ? null : m);
    setText(initial);
    setMsg("");
  };
  const submit = () => {
    const v = text.trim();
    if (mode === "add" && v) add(v);
    if (mode === "rename" && v) rename(v);
    if (mode === "delete") remove(profile.id);
    if (mode === "import") {
      const data = decodeProfile(v.split("#").pop() ?? "");
      if (!data) return setMsg("Ese enlace no es válido o está incompleto.");
      add(data.name, data);
      setMsg(`Añadido «${data.name}» con ${data.owned.length} jugadores.`);
      setMode(null);
      return;
    }
    setMode(null);
  };
  return (
    <div className="rounded-xl border border-line bg-panel p-3">
      <div className="flex flex-wrap items-center gap-2">
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
        <button className="rounded-full border border-dashed border-line px-3 py-1 text-sm text-muted hover:text-text" onClick={() => open("add")}>
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
                open("copy", url);
              }
            }}
          >
            {copied ? "✓ Enlace copiado" : "🔗 Compartir plantilla"}
          </button>
          <button
            className="rounded-md border border-line px-2 py-1 font-semibold hover:border-bolt hover:text-bolt"
            title="Pega un enlace de «Compartir plantilla» (de esta web o de otra copia, como la local) para añadirlo como perfil"
            onClick={() => open("import")}
          >
            📥 Importar
          </button>
          <button className="hover:text-text" onClick={() => open("rename", profile.name)}>Renombrar</button>
          {profiles.length > 1 && (
            <button className="hover:text-bad" onClick={() => open("delete")}>Borrar</button>
          )}
        </div>
      </div>
      {mode && (
        <form
          className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-2 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {mode === "delete" ? (
            <span>¿Borrar el perfil <b>{profile.name}</b>? No se puede deshacer.</span>
          ) : (
            <input
              autoFocus
              value={text}
              readOnly={mode === "copy"}
              onFocus={(e) => mode === "copy" && e.currentTarget.select()}
              onChange={(e) => setText(e.target.value)}
              placeholder={mode === "add" ? "Nombre de la persona" : mode === "import" ? "Pega aquí el enlace de «Compartir plantilla»" : "Nuevo nombre"}
              className="min-w-60 flex-1 rounded-lg border border-line bg-panel-2 px-3 py-1.5 outline-none focus:border-bolt"
            />
          )}
          {mode !== "copy" && (
            <button type="submit" className={`rounded-lg px-3 py-1.5 font-semibold ${mode === "delete" ? "bg-bad text-white" : "bg-bolt text-bolt-ink"}`}>
              {mode === "add" ? "Crear" : mode === "import" ? "Importar" : mode === "delete" ? "Borrar" : "Guardar"}
            </button>
          )}
          <button type="button" onClick={() => setMode(null)} className="text-muted hover:text-text">
            {mode === "copy" ? "Cerrar" : "Cancelar"}
          </button>
          {mode === "copy" && <span className="w-full text-xs text-muted">No se pudo copiar solo: selecciona el enlace y cópialo.</span>}
        </form>
      )}
      {msg && <p className="mt-2 text-xs text-bolt">{msg}</p>}
    </div>
  );
}

const TYPE_ORDER: TechType[] = ["Tiro", "Regate", "Bloqueo", "Parada"];
const techLabel = (t: Technique) => `${t.name} · ${t.type} ${t.element} · ${t.levels[9].power}${t.shootBlock && t.type === "Bloqueo" ? " · bloquea tiros" : ""}`;

/** <option>s de técnicas para elegir un manual: primero los manuales conocidos, luego todas por tipo. */
export function TechOptions({ exclude = [] }: { exclude?: string[] }) {
  return (
    <>
      <optgroup label="Manuales conocidos">
        {BOOKS.filter((b) => !exclude.includes(b.code)).map((b) => (
          <option key={b.code} value={b.code}>
            {techLabel(TECH_BY_CODE.get(b.code)!)}
          </option>
        ))}
      </optgroup>
      {TYPE_ORDER.map((ty) => (
        <optgroup key={ty} label={`Otras de ${ty}`}>
          {TECHNIQUES.filter((t) => t.type === ty && !BOOK_CODES.has(t.code) && !exclude.includes(t.code)).map((t) => (
            <option key={t.code} value={t.code}>
              {techLabel(t)}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}
