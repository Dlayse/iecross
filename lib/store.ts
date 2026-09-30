"use client";
// Perfiles guardados en el navegador: cada persona marca qué jugadores y entrenadores tiene.
import { useCallback, useEffect, useState } from "react";
import { PLAYER_BY_ID } from "./data";
import { autoGear } from "./gear";
import type { Gear, Prefs } from "./engine";

export interface Profile {
  id: string;
  name: string;
  owned: string[]; // ids de jugadores
  /** Rango de despertar por jugador: 1 Normal … 10 Legendary+ */
  stages: Record<string, number>;
  /** Nivel mínimo de tus jugadores (el del más bajo del núcleo) */
  level: number;
  coaches: Record<string, number>; // id entrenador → nivel (0 = no lo tiene)
  techLevel: number;
  /** Jugadores que deben salir sí o sí en los equipos generados */
  locked: string[];
  /** Cómo puntuar los equipos (panel Personalizar) */
  prefs?: Prefs;
  /** Equipamiento: "auto" = completo al nivel máximo que permite tu nivel; "manual" = lo que pongas */
  gearMode?: "auto" | "manual";
  /** Estadísticas que suma el equipamiento a todos los jugadores de cada posición (modo manual) */
  gear?: Gear;
}

interface State {
  active: string;
  profiles: Profile[];
}

const KEY = "iecross-v1";

export function newProfile(name: string): Profile {
  return { id: Math.random().toString(36).slice(2, 9), name, owned: [], stages: {}, level: 300, coaches: {}, techLevel: 10, locked: [] };
}

/** Un ★3 recién sacado está en Growing (0凸); los ★1/★2 empiezan en Normal. */
export function defaultStage(id: string) {
  return (PLAYER_BY_ID.get(id)?.stars ?? 1) >= 3 ? 3 : 1;
}

export function stageOf(p: Profile, id: string) {
  return p.stages?.[id] ?? defaultStage(id);
}

function migrate(p: Partial<Profile> & { noAwaken?: string[] }): Profile {
  return {
    id: p.id ?? Math.random().toString(36).slice(2, 9),
    name: p.name ?? "Yo",
    owned: p.owned ?? [],
    stages: p.stages ?? {},
    level: p.level ?? 300,
    coaches: p.coaches ?? {},
    techLevel: p.techLevel ?? 10,
    locked: p.locked ?? [],
    prefs: p.prefs,
    gear: p.gear,
    gearMode: p.gearMode ?? "auto",
  };
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as State;
      if (s.profiles?.length) return { active: s.active, profiles: s.profiles.map(migrate) };
    }
  } catch {}
  const p = newProfile("Yo");
  return { active: p.id, profiles: [p] };
}

export function useProfiles() {
  const [state, setState] = useState<State | null>(null);
  useEffect(() => setState(load()), []);
  const save = useCallback((fn: (s: State) => State) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);
  const profile = state?.profiles.find((p) => p.id === state.active) ?? state?.profiles[0];
  const update = useCallback(
    (fn: (p: Profile) => Profile) => save((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === s.active ? fn(p) : p)) })),
    [save],
  );
  return {
    ready: !!state,
    profiles: state?.profiles ?? [],
    profile,
    update,
    setActive: (id: string) => save((s) => ({ ...s, active: id })),
    add: (name: string, data?: Omit<Profile, "id">) => {
      const p = { ...newProfile(name), ...data };
      save((s) => ({ active: p.id, profiles: [...s.profiles, p] }));
    },
    remove: (id: string) =>
      save((s) => {
        const profiles = s.profiles.filter((p) => p.id !== id);
        return profiles.length ? { active: profiles[0].id, profiles } : s;
      }),
    rename: (name: string) => update((p) => ({ ...p, name })),
  };
}

/** Equipamiento que se aplica en los cálculos */
export function effectiveGear(p: Profile): Gear | undefined {
  return (p.gearMode ?? "auto") === "auto" ? autoGear(p.level).gear : p.gear;
}

/** Nivel del entrenador; si el perfil no dice nada, se asume que lo tienes a nivel 1. */
export function coachLevel(p: Profile, id: string) {
  return p.coaches[id] ?? 1;
}
