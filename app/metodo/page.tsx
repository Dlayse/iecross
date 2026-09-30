import type { Metadata } from "next";
import { GAME_META, PLAYERS, playerPassives } from "@/lib/data";
import { BENCH, TRIGGER_LABEL, TRIGGER_WEIGHT } from "@/lib/engine";
import { describeEffect } from "@/lib/describe";
import type { Trigger } from "@/lib/types";

export const metadata: Metadata = { title: "Cómo calculamos · IE Cross XI" };

const k = (x: number) => Math.round(x).toLocaleString("es");

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 font-display text-2xl font-bold">{children}</h2>;
}

const DYNAMIC: Partial<Record<Trigger, string>> = {
  rivalStopsShot: "½ × tiradores (FW = 1, MF con tiro lejano ≈ 0,6–0,9)",
  allyShootBlockFail: "0,45 × bloqueadores de tiro (DF = 1, MF = 0,7, bandas a la mitad)",
  allySave: "1,1 + 0,15 × bloqueadores de tiro, si el portero tiene técnica de parada",
  mfDribbleWin: "0,6 × MF con técnica de regate",
  allyDribbleWin: "0,5 × MF/FW con técnica de regate",
  dfBlockWin: "0,5 × DF con técnica de bloqueo",
  allyBlockWin: "0,45 × DF/MF con técnica de bloqueo",
};

export default function MethodPage() {
  const all = PLAYERS.flatMap((p) => playerPassives(p).map((pp) => ({ p, pp })));
  const unique = new Map<string, (typeof all)[number]>();
  for (const x of all) if (!unique.has(x.pp.code + x.pp.description)) unique.set(x.pp.code + x.pp.description, x);
  const partial = [...unique.values()].filter((x) => x.pp.partial).length;

  return (
    <article className="max-w-3xl leading-relaxed [&_p]:mt-2 [&_li]:mt-1">
      <h1 className="font-display text-4xl font-extrabold">Cómo calculamos</h1>
      <p className="text-muted">
        Datos del juego v{GAME_META.gameVersion} ({PLAYERS.length} jugadores), extraídos por IE Cross Database. Todo lo de esta página es
        la lógica exacta del generador; donde falta información del juego lo decimos.
      </p>

      <H2>1. El duelo</H2>
      <p>
        Cada acción con técnica (tiro contra parada, regate contra bloqueo) enfrenta dos «poderes». La fórmula, verificada por la
        comunidad japonesa:
      </p>
      <pre className="mt-2 overflow-x-auto rounded-lg bg-panel p-3 text-sm">
        poder = (estadística × (1 + zona) + pasivas de estadística){"\n"}        × (poder de la técnica + pasivas de poder){"\n"}        × elemento × 0,01
      </pre>
      <ul className="list-disc pl-5">
        <li><b>Estadística</b>: Tiro para tiros, Técnica para regates, Bloqueo para bloqueos y Parada para paradas.</li>
        <li><b>Zona</b>: +15 % (S), +10 % (A) o +5 % (B) si la casilla de la formación cae en una zona favorita del jugador.</li>
        <li><b>Elemento</b>: +20 % si la técnica es del mismo elemento que el jugador; ±10 % por ventaja (Viento › Montaña › Fuego › Bosque › Viento).</li>
        <li><b>Crítico</b>: contamos el valor esperado (probabilidad × bonus de crítico de la técnica).</li>
      </ul>
      <p>
        Consecuencia práctica: el poder de técnica multiplica todo, así que las pasivas que suben el <i>poder</i> de una técnica
        (+30, +90…) valen muchísimo más de lo que parece al lado de las de estadística (+700, +2000…).
      </p>

      <H2>2. Nivel y despertar (凸)</H2>
      <ul className="list-disc pl-5">
        <li>
          Cada jugador tiene 3 <b>pasivas de nivel</b>, que se desbloquean a nivel 11, 21 y 31 y suben +1 cada 30 niveles (a nivel 440 van por
          Nv 15/14/14; a nivel 300, por 10/10/9). El efecto crece de forma lineal con el nivel de la pasiva.
        </li>
        <li>La 2.ª técnica se aprende a nivel 31.</li>
        <li>
          <b>Despertar</b>: Normal → Normal+ → Growing → Growing+ → Advanced → Advanced+ → Top → Top+ → Legendary → Legendary+. En un ★3,
          0凸 = Growing y 7凸 (完凸) = Legendary+. «TP+ máximo» sube en Advanced/Top/Legendary (+10/+20/+30) y la pasiva única de despertar en
          Advanced+/Top+/Legendary+ (Nv 1/2/3, es decir 3凸/5凸/7凸 en un ★3).
        </li>
        <li className="text-muted">
          Supuestos: no hay datos de cómo crecen las estadísticas con el nivel, así que las escalamos de forma lineal (10 % a nivel 1,
          100 % a 440). Tampoco contamos la pequeña subida de estadísticas que da el despertar.
        </li>
      </ul>

      <H2>3. Pasivas que dependen del partido</H2>
      <p>
        Muchas pasivas se activan «cada vez que…» y se reinician al marcar. No simulamos el partido jugada a jugada: estimamos cuántas veces
        está activo cada efecto de media. Varios disparadores dependen de <b>tu once</b> (más bloqueadores de tiro ⇒ más «bloqueos
        fallidos» que cargan a Kino Aki; más tiradores lejanos ⇒ más «te paran el tiro» para Kira Hitomiko o Nikaidou):
      </p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-muted">
            <tr>
              <th className="py-1">Disparador</th>
              <th>Veces activo (base)</th>
              <th>Según tu once</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(TRIGGER_WEIGHT) as Trigger[]).map((t) => (
              <tr key={t} className="border-t border-line/60">
                <td className="py-1 first-letter:uppercase">{TRIGGER_LABEL[t]}</td>
                <td>×{TRIGGER_WEIGHT[t]}</td>
                <td className="text-muted">{DYNAMIC[t] ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted">
        Las pasivas «propias» (regatear, bloquear un tiro…) solo cuentan si el jugador tiene la técnica necesaria, y menos si juega en una
        banda de la defensa, donde apenas interviene.
      </p>

      <H2>4. La puntuación</H2>
      <p>
        Como no sabemos contra quién juegas, cada duelo se compara con el <b>meta</b>: el mejor once posible con toda la base (nivel 440,
        完凸, entrenadores y técnicas a Nv 10). Hoy sale Kira Hitomiko (F-Raimon 2) con Fei, Tenma, Kirino, Kinako, Natsumi y Kino Aki, que
        coincide con el equipo Tier SS de las guías japonesas. Sus valores de referencia:
      </p>
      <ul className="list-disc pl-5 text-sm">
        <li>Tiro: {k(BENCH.shot.stat)} de Tiro × {k(BENCH.shot.power)} de poder</li>
        <li>Portero: {k(BENCH.catch.stat)} de Parada × {k(BENCH.catch.power)} de poder</li>
        <li>Regate: {k(BENCH.dribble.stat)} de Técnica × {k(BENCH.dribble.power)} de poder</li>
        <li>Robo: {k(BENCH.block.stat)} de Bloqueo × {k(BENCH.block.power)} de poder</li>
      </ul>
      <p>
        La probabilidad de ganar un duelo es r<sup>1,5</sup>/(r<sup>1,5</sup>+1), con r = tu poder / poder del meta (50 % en empate, ~26 %
        con la mitad, ~74 % con el doble). Es una curva suave a propósito: así un portero de 30k puntúa claramente más que uno de 15k
        aunque los dos pierdan contra el tiro del meta. La puntuación final, con el estilo «Equilibrado», es:
      </p>
      <ul className="list-disc pl-5">
        <li><b>40 % ataque</b>: tus 3 mejores tiros contra el portero del meta (pesos 55/30/15 %, porque manda el tiro que rompe).</li>
        <li><b>30 % portería</b>: tu portero contra el tiro del meta, con ayuda de tus 2 mejores bloqueadores de tiro.</li>
        <li><b>15 % regate</b> y <b>15 % robo</b>: medio campo contra la defensa y el regate del meta.</li>
      </ul>
      <p>La web la muestra sobre 10 (la puntuación interna ÷ 5): un 10 significa empatar con el meta. Las pasivas que debilitan al rival se restan de sus valores de referencia.</p>
      <p>
        En <b>Equipos → Estilo</b> puedes cambiar esos pesos, decidir si la portería recae en el portero o en los bloqueadores de tiro,
        cuánto fiarte de las pasivas que se cargan durante el partido (bájalo para priorizar potencia garantizada) y exigir la formación activa.
      </p>

      <H2>Manuales (秘伝書)</H2>
      <p>
        Cada jugador tiene 2 técnicas propias y puede aprender <b>una 3.ª con un manual</b>, sin restricción de posición ni de elemento (si coincide
        con su elemento, también se lleva el +20 %). El manual se gasta al usarlo y se puede sobrescribir con otro. La 3.ª técnica de cada jugador
        se indica en «Mi plantilla» y cuenta en todos los cálculos, incluidos los combos: por ejemplo, un portero de Montaña que aprenda Mano
        celestial también recibe el +62 de Hibiki Seigou. Con los manuales que tengas sin usar, cada equipo propone a quién dárselos probando
        todas las combinaciones de manual y jugador.
      </p>

      <H2>Equipamiento</H2>
      <p>
        Cada pieza suma estadísticas a <b>todos los jugadores con esa posición recomendada</b> (FW, MF, DF o GK), y su nivel máximo va ligado al
        nivel mínimo de tu plantilla (sube cada 5 niveles). Lo que pongas en «Mi plantilla → Equipamiento» se suma a la estadística de cada
        jugador de esa posición antes de multiplicar por el poder de la técnica. El meta de referencia no lleva equipamiento.
      </p>

      <H2>5. Cómo se buscan los equipos</H2>
      <p>
        Para cada entrenador que tengas: se llena el once de forma voraz (portero, delanteros, centrales, medios…) y después se mejora
        cambiando jugadores con el banquillo e intercambiando casillas hasta que nada sube la puntuación. Se hace dos veces (una con algo de
        azar) y se queda la mejor.
      </p>

      <H2>6. Fuentes</H2>
      <ul className="list-disc pl-5 text-sm">
        <li><a className="text-bolt underline" href="https://iecrossdatabase.pages.dev">IE Cross Database</a> (RR_o): datos del juego.</li>
        <li><a className="text-bolt underline" href="https://note.com/manners_inaire/n/n5e063b24e18d">マナー帝国 (note)</a>: fórmula del poder total.</li>
        <li><a className="text-bolt underline" href="https://game8.jp/inazuma-cross/788113">Game8</a> y <a className="text-bolt underline" href="https://appmedia.jp/inazuma-cross/80085055">AppMedia</a>: despertar y 凸.</li>
        <li><a className="text-bolt underline" href="https://kawaii-jp-figure.com/inax-charastatus/">kawaii-jp-figure</a>: pasivas de nivel.</li>
        <li><a className="text-bolt underline" href="https://game8.jp/inazuma-cross/788266">Game8</a>, <a className="text-bolt underline" href="https://appmedia.jp/inazuma-cross/80087167">AppMedia</a> e <a className="text-bolt underline" href="https://inacross-guide.com/pvp">inacross-guide</a>: entrenadores y estrategias.</li>
      </ul>

      <H2>7. Cómo hemos leído cada pasiva</H2>
      <p className="text-muted">
        Las fichas traen las pasivas solo como texto (traducción fan). Un intérprete las convierte en efectos; aquí está el resultado de las{" "}
        {unique.size} distintas{partial ? ` (${partial} con dudas, marcadas con ⚠)` : ""}. Si ves alguna mal, dínoslo.
      </p>
      <div className="mt-3 space-y-1">
        {PLAYERS.map((p) => (
          <details key={p.id} className="rounded-lg border border-line bg-panel px-3 py-1.5">
            <summary className="cursor-pointer text-sm font-semibold">
              {p.name} <span className="text-xs font-normal text-muted">· {p.position} · {p.team}</span>
            </summary>
            <ul className="mt-1 space-y-2 pb-1 text-sm">
              {playerPassives(p).map((pp) => (
                <li key={pp.code}>
                  <div>
                    <b>{pp.name}</b> <span className="text-xs text-muted">({pp.source === "Despertar" ? "despertar" : "nivel"})</span>
                  </div>
                  <div className="text-xs text-muted">{pp.description}</div>
                  <div className="text-xs text-good">
                    {pp.partial && "⚠ "}
                    {pp.requirement && `si hay ${pp.requirement.count}+ ${(pp.requirement.tags ?? pp.requirement.elements ?? []).join(" o ")}: `}
                    {pp.effects.map(describeEffect).join(" · ")}
                  </div>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </article>
  );
}
