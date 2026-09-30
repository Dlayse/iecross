// Texto legible de un efecto interpretado (para /metodo y depuración).
import { TRIGGER_LABEL } from "./engine";
import type { Effect } from "./types";

const STAT: Record<string, string> = { kick: "Tiro", technique: "Técnica", block: "Bloqueo", catch: "Parada" };

export function describeEffect(e: Effect): string {
  const sign = e.value > 0 ? "+" : "";
  let what: string;
  switch (e.kind) {
    case "stat":
      what = (e.stats ?? []).map((s) => STAT[s]).join(" y ");
      break;
    case "power":
      what = e.techName ? `poder de «${e.techName}»` : `poder de técnicas${e.techTypes ? " de " + e.techTypes.join("/") : ""}${e.techElements ? " de " + e.techElements.join("/") : ""}`;
      break;
    case "crit":
      what = e.techName ? `% crítico de «${e.techName}»` : "% crítico";
      break;
    case "tpMax":
      what = "TP máximo";
      break;
    case "tpCost":
      return `coste de TP −${e.value}${e.techName ? ` en «${e.techName}»` : ""}`;
    case "foul":
      what = "% de falta";
      break;
    case "chainRate":
      what = "% de cadena";
      break;
    case "range":
      what = "alcance";
      break;
    case "speed":
      what = "velocidad";
      break;
  }
  const who =
    e.scope === "self"
      ? "propio"
      : `${e.side === "rival" ? "rivales" : "aliados"}${e.filter?.positions ? " " + e.filter.positions.join("/") : ""}${e.filter?.elements ? " de " + e.filter.elements.join("/") : ""}${e.filter?.tags ? " con " + e.filter.tags.join(" o ") : ""}`;
  const when = e.trigger === "start" ? "" : ` · ${TRIGGER_LABEL[e.trigger]}${e.stacks ? " (acumulable)" : ""}`;
  return `${what} ${sign}${e.value} → ${who}${when}`;
}
