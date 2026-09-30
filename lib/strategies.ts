// Cómo se juega cada formación. Resumen de guías japonesas (Game8, AppMedia, inacross-guide)
// contrastado con los efectos reales de los datos del juego.
import type { Trigger } from "./types";

export interface Strategy {
  title: string;
  summary: string;
  /** Disparadores que cargan las pasivas del entrenador/formación */
  engine: Trigger[];
  keys: string[];
  /** Jugadores que las guías citan como piezas de esta formación (nombres de la base) */
  showcase?: string[];
  tier?: string;
}

export const STRATEGIES: Record<string, Strategy> = {
  // Hibiki Seigou · F-Raimon
  "71002": {
    title: "Muro Raimon",
    summary:
      "Portero Raimon enorme (+3113 Parada a Nv 10) y +1200 de Técnica para todo el que lleve la etiqueta Raimon. Junta al menos 3 Raimon para encender las pasivas de «Cohesión» y activa la formación con Raimon en el MF 3, el DF 7 y la portería.",
    engine: [],
    keys: ["Portero con etiqueta Raimon (Kino Aki, Endou)", "3+ Raimon para las pasivas de Cohesión", "Casillas 3, 7 y 11 con Raimon"],
    showcase: ["Kino Aki", "Raimon Natsumi", "Asuka Domon", "Kazuya Ichinose"],
  },
  // Kageyama Reiji · F-Zona de Muerte
  "71003": {
    title: "Zona de Muerte (hoy sin piezas)",
    summary:
      "Su pasiva refuerza la etiqueta «Creador de juego» y la formación pide jugadores Teikoku: ahora mismo ninguna ficha las tiene, así que solo aprovechas la base de la formación. Úsala solo si no tienes otro entrenador.",
    engine: [],
    keys: ["Sin jugadores con etiqueta Teikoku / Creador de juego en la versión actual"],
  },
  // Aida Chikara · F-Inazuma KFC
  "71004": {
    title: "Pegada KFC",
    summary:
      "Sube muchísimo el Tiro del FW (+3300) y la Parada del GK (+3000) si llevan etiqueta Raimon o Inazuma KFC y juegan en su posición. Un delantero y un portero Raimon bien subidos bastan para sacarle partido; la formación añade poder a tiros de Bosque y bloqueos de Montaña.",
    engine: [],
    keys: ["FW y GK con etiqueta Raimon/Inazuma KFC en su posición", "Tiradores de Bosque y bloqueadores de Montaña"],
  },
  // Jikiru Haito · F-Occult
  "71005": {
    title: "Regatear para ablandar al portero",
    summary:
      "Cada regate con éxito de un MF baja la Parada del portero rival (−600 por regate a Nv 10, se acumula hasta que marcas). Cinco casillas de medio: llénalas de regateadores y remata con un FW de Bosque. La formación da +2000 de Técnica a los MF en su posición.",
    engine: ["mfDribbleWin"],
    keys: ["4-5 MF con técnica de regate", "FW de elemento Bosque en punta (requisito)", "2 MF de posición natural en las casillas 2 y 3"],
  },
  // Tayama Kousuke · F-Nose
  "71006": {
    title: "Todo Viento",
    summary:
      "+40 de poder a todas las técnicas de Viento y, con la formación activa, +900 de Tiro y Técnica a cada aliado de Viento. Tres delanteros: cuantos más jugadores de Viento, mejor.",
    engine: [],
    keys: ["Equipo casi entero de Viento", "3 FW, uno de Viento en la casilla 3", "2 MF de Viento en las bandas"],
    showcase: ["Gazelle", "Fubuki Shirou", "Matsukaze Tenma", "Ulvida", "Ichirota Kazemaru"],
  },
  // Tomiyama Shinichirou · F-Mikage Sennou
  "71007": {
    title: "Fuego arriba, Bosque en la portería",
    summary:
      "Refuerza los tiros de los FW de Fuego y las paradas de un GK de Bosque; la formación suma +30 a todas las técnicas de Fuego y de Bosque. Necesita un portero de Bosque (Tachimukai, Gorleo).",
    engine: [],
    keys: ["FW de Fuego (Gouenji, Torch, Tsurugi)", "GK de Bosque (requisito)", "Resto de Fuego o Bosque"],
    tier: "A",
  },
  // Maniya Saito · F-Shuyou Meito
  "71008": {
    title: "Remontada en la 2.ª parte",
    summary:
      "Todo llega en la segunda parte: +4200 de Tiro a los FW y de Técnica a los MF, y +2700 a defensas y portero con la formación. Cinco delanteros (dos casillas piden «Segundo delantero»): aguanta la primera parte y arrolla después.",
    engine: ["secondHalf"],
    keys: ["Delanteros en su posición (el bonus es para FW recomendados)", "Dos «Segundo delantero» en las casillas 4 y 5", "Un Occult en la casilla 2"],
  },
  // Igajima Senichi · F-Sengoku Igajima
  "71009": {
    title: "Robar para atacar",
    summary:
      "Cada vez que un jugador gana un duelo con su técnica de bloqueo contra un regate, todo tu equipo gana +250 de Técnica y Tiro (acumulable hasta que marcas). Llénala de defensas y mediocentros defensivos con buenos bloqueos.",
    engine: ["allyBlockWin"],
    keys: ["Muchos DF/MF con técnica de bloqueo", "Mediocentros defensivos (+2250 Bloqueo y Técnica del entrenador)", "Stopper en la casilla 10"],
  },
  // Nikaidou Shuugo · F-Kidokawa Seishuu
  "71010": {
    title: "Tirar sin parar (aunque te paren)",
    summary:
      "Cada tiro que el rival para o bloquea da +400 de Tiro a TODO tu equipo, acumulable hasta que marcas. En Japón se juega lanzando tiros lejanos flojos a propósito (p. ej. Sugata) para cargar el contador sin regalar confianza al portero, y rematando con un FW fuerte. Raimon Natsumi suma poder de tiro cada vez que te bloquean.",
    engine: ["rivalStopsShot"],
    keys: ["Muchos tiradores, incluidos MF con tiro lejano", "Un rematador potente (Tsurugi, Gouenji)", "FW de Montaña, Fuego y Viento en las tres casillas de arriba"],
    showcase: ["Raimon Natsumi", "Sugata Gen", "Kenjou Kyousuke", "Matsukaze Tenma"],
    tier: "S",
  },
  // Kageyama Reiji · F-Zeus
  "71011": {
    title: "Medio de regateadores",
    summary:
      "Cada regate con éxito de un MF sube +10 el poder de TODAS las técnicas del equipo (acumulable hasta que marcas). Cinco medios: pon regateadores fiables, idealmente con etiqueta Zeus para el +60 de tiro del entrenador.",
    engine: ["mfDribbleWin"],
    keys: ["5 MF con técnica de regate", "Jugadores Zeus (MF casilla 4)", "Un único FW de posición natural", "GK de Montaña"],
  },
  // Endou Daisuke · F-Young Inazuma
  "71012": {
    title: "Muro y contraataque",
    summary:
      "Cada parada con éxito da +50 de poder de tiro a todo el equipo. Se monta un muro: portero de Montaña (Kino Aki, Hibiki) reforzado por defensas con bloqueo de tiro. Muchos de ellos (Kinako, Kirino, Nishigaki/Malcolm, Kamimura) suben la Parada del portero cada vez que su bloqueo falla, y Kino Aki también se carga con esos fallos. Arriba, un rematador aprovecha la acumulación.",
    engine: ["allySave", "allyShootBlockFail"],
    keys: ["GK de Montaña (requisito y +80 de poder de parada)", "Hibiki Seigou (versión Young Inazuma) fuera de la portería: +62 a la Mano celestial de tu GK de Montaña", "3-4 bloqueadores de tiro que buffen al portero", "DF de Montaña en la casilla 6", "FW de Fuego en la casilla 2"],
    showcase: ["Kino Aki", "Kinako Nanobana", "Kirino Ranmaru", "Nishigaki Mamoru", "Kamimura Setsuto", "Hibiki Seigou"],
    tier: "SS",
  },
  // Kudou Michiya · F-Inazuma Japón
  "73023": {
    title: "Núcleo Inazuma Japan",
    summary:
      "+87 de poder de tiro a los FW y de regate a los MF con etiqueta Inazuma Japan, y la formación suma +40 a tiros de FW y bloqueos de DF. Flexible: basta con meter Inazuma Japan en las casillas marcadas.",
    engine: [],
    keys: ["FW y MF con etiqueta Inazuma Japan en su posición", "Inazuma Japan en las casillas 1, 4 y 9"],
    showcase: ["Gouenji Shuuya", "Fubuki Shirou", "Utsunomiya Toramaru", "Yuuto Kidou"],
    tier: "S",
  },
  // Kira Hitomiko · F-Raimon 2
  "71013": {
    title: "Tiros largos para cargar Bosque y Viento",
    summary:
      "Con la formación activa, cada tiro que te paran suma +40 al poder de todas las técnicas de Bosque y Viento (acumulable hasta que marcas), y el entrenador da +70 a sus tiros. Se juega tirando mucho, sobre todo desde el medio con tiro lejano (Tenma), para cargar el contador. Ulvida también crece cada vez que te paran un tiro. Es la formación más usada en PvP.",
    engine: ["rivalStopsShot"],
    keys: ["Equipo de Bosque y Viento", "MF con tiro lejano que carguen la pasiva", "FW de Bosque en la casilla 1 y MF de Viento/Bosque en las casillas 5-6"],
    showcase: ["Matsukaze Tenma", "Ulvida", "Fei Rune", "Otonashi Haruna", "Kirino Ranmaru", "Kino Aki"],
    tier: "SS",
  },
};
