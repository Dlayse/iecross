"use client";
// Carga un perfil de ejemplo (45 jugadores al azar) y abre el generador.
import { withBase } from "@/lib/paths";
import { useEffect } from "react";
import { COACHES, PLAYERS } from "@/lib/data";

export default function DemoPage() {
  useEffect(() => {
    let s = 7;
    const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const owned = PLAYERS.map((p) => p.id).sort(() => r() - 0.5).slice(0, 45);
    const levels = [5, 3, 0, 4, 6, 2, 5, 7, 3, 5, 8, 6, 5];
    const coaches = Object.fromEntries(COACHES.map((c, i) => [c.id, levels[i] ?? 5]));
    // 凸 variados: ★3 entre 0凸 (Growing) y 7凸 (Legendary+), ★1/★2 entre Normal y Top+
    const stages = Object.fromEntries(
      owned.map((id) => {
        const stars = PLAYERS.find((p) => p.id === id)!.stars;
        return [id, stars >= 3 ? 3 + Math.floor(r() * 8) : 1 + Math.floor(r() * 8)];
      }),
    );
    const demo = { id: "demo", name: "Demo (45 al azar)", owned, stages, level: 300, coaches, techLevel: 8 };
    try {
      const raw = localStorage.getItem("iecross-v1");
      const st = raw ? JSON.parse(raw) : { profiles: [] };
      const profiles = [...(st.profiles ?? []).filter((p: { id: string }) => p.id !== "demo"), demo];
      localStorage.setItem("iecross-v1", JSON.stringify({ active: "demo", profiles }));
    } catch {}
    window.location.replace(withBase("/equipos/#auto"));
  }, []);
  return <p className="text-muted">Preparando la demo…</p>;
}
