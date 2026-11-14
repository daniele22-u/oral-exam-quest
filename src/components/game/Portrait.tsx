import type { ExaminerId } from "@/lib/game/data";

/**
 * Ritratti a pixel degli esaminatori, disegnati qui come griglie 16×16 (nessuna immagine esterna).
 * Ogni ritratto parte da una testa comune, a cui si sovrappongono capelli e accessori del
 * personaggio e infine l'espressione, così ogni esaminatore ha tre stati d'animo senza
 * ridisegnare nulla.
 */
export type Mood = "neutral" | "stern" | "pleased";
export type Who = ExaminerId | "presidente";

const SIZE = 16;

// "." = trasparente; s pelle, n naso, c abito. Sopracciglia sulle righe 5-7, occhi sulla 8,
// bocca sulle 10-11.
const HEAD = [
  "................",
  "................",
  "................",
  "................",
  "....ssssssss....",
  "...ssssssssss...",
  "...ssssssssss...",
  "...ssssssssss...",
  "...ssssssssss...",
  "...ssssnnssss...",
  "...ssssssssss...",
  "....ssssssss....",
  ".....ssssss.....",
  "......ssss......",
  "..cccccsscccccc.",
  ".cccccccccccccc.",
];

interface Character {
  /** Colori per lettera della griglia. */
  palette: Record<string, string>;
  /** Strato sopra la testa: capelli, barba, abito. "." lascia vedere sotto. */
  layer: string[];
  /** Strato sopra l'espressione: occhiali e simili. */
  top?: string[];
  /** Riga della bocca (più bassa per chi porta i baffi). */
  mouthRow?: number;
  /** Lettera di palette per le sopracciglia: più chiare degli occhi, che restano il tratto più scuro. */
  brow?: string;
}

const row = (n: number, s: string): [number, string] => [n, s];
const rows = (...r: [number, string][]) => {
  const out: string[] = Array.from({ length: SIZE }, () => ".".repeat(SIZE));
  for (const [n, s] of r) out[n] = s;
  return out;
};

const CAST: Record<Who, Character> = {
  // Severa: chignon scuro, occhiali, colletto bianco su abito bordeaux.
  severo: {
    palette: {
      s: "#e8b796",
      n: "#c98f6e",
      h: "#2b2233",
      c: "#6e2436",
      a: "#f1ead8",
      g: "#e0b34a",
      r: "#5b4a68",
    },
    layer: rows(
      row(0, "......hhhh......"),
      row(1, "......hhhh......"),
      row(2, "....hhhhhhhh...."),
      row(3, "...hhhhhhhhhh..."),
      row(4, "...hhhsssshhh..."),
      row(5, "...hssssssssh..."),
      row(9, "..a..........a.."),
      row(14, "......a..a......"),
    ),
    top: rows(row(8, "....g..gg..g....")),
    brow: "r",
  },
  // Empatico: capelli castani morbidi, barba, maglione verde.
  empatico: {
    palette: { s: "#f0c39c", n: "#d39d76", h: "#7a4a26", b: "#7a4a26", c: "#3f7d5a", a: "#9fd0a8" },
    layer: rows(
      row(2, "....hhhhhhhh...."),
      row(3, "...hhhhhhhhhh..."),
      row(4, "...hhhhhhhhhh..."),
      row(5, "...hhsssssshh..."),
      row(9, "...b........b..."),
      row(10, "...bb......bb..."),
      row(11, "....bbbbbbbb...."),
      row(12, ".....bbbbbb....."),
      row(14, "......a..a......"),
      row(15, ".......aa......."),
    ),
    brow: "h",
  },
  // Distratto: capelli grigi arruffati, occhiali di tartaruga, papillon. La montatura sta solo ai
  // lati degli occhi: un bordo inferiore, a questa scala, sembra una maschera.
  distratto: {
    palette: {
      s: "#eac4a4",
      n: "#cf9f7d",
      h: "#b9bcc2",
      c: "#4a4f6a",
      a: "#e0b34a",
      g: "#8fd0e6",
      r: "#8d9199",
    },
    layer: rows(
      row(1, "...h..h.hh..h..."),
      row(2, "..hhhhhhhhhhhh.."),
      row(3, "..hhhhhhhhhhhh.."),
      row(4, "..hhssssssshhh.."),
      row(5, "..hsssssssssshh."),
      row(6, "..h..........h.."),
      row(14, ".....aa..aa....."),
      row(15, "......aaaa......"),
    ),
    top: rows(row(8, "....g..gg..g....")),
    brow: "r",
  },
  // Presidente: calvo, capelli e baffi bianchi, toga nera con collare dorato.
  presidente: {
    palette: { s: "#e2b08e", n: "#c48a68", w: "#f2efe6", c: "#16181d", a: "#e0b34a" },
    layer: rows(
      row(3, "....ssssssss...."),
      row(5, "..ww........ww.."),
      row(6, "..ww........ww.."),
      row(7, "..w..........w.."),
      row(10, "....wwwwwwww...."),
      row(14, "....aaaaaaaa...."),
      row(15, ".......aa......."),
    ),
    mouthRow: 11,
    brow: "w",
  },
};

const EYE = "#1b1a22";
const MOUTH = "#7a2e2e";

function build(who: Who, mood: Mood): string[][] {
  const c = CAST[who];
  const g = HEAD.map((r) => r.split(""));
  const put = (x: number, y: number, ch: string) => {
    const line = g[y];
    if (line && x >= 0 && x < SIZE) line[x] = ch;
  };
  const overlay = (layer?: string[]) =>
    layer?.forEach((line, y) =>
      line.split("").forEach((ch, x) => {
        if (ch !== ".") put(x, y, ch);
      }),
    );

  overlay(c.layer);

  // Occhi una riga sotto le sopracciglia neutre: se si toccassero, a questa scala
  // diventerebbero un unico blocco scuro.
  for (const x of [5, 6, 9, 10]) put(x, 8, "E");
  const brow = c.brow ?? "E";
  if (mood === "stern") {
    // Sopracciglia inclinate verso il centro.
    for (const [x, y] of [
      [4, 6],
      [5, 7],
      [6, 7],
      [11, 6],
      [10, 7],
      [9, 7],
    ] as const)
      put(x, y, brow);
  } else {
    const y = mood === "pleased" ? 5 : 6;
    for (const x of [4, 5, 6, 9, 10, 11]) put(x, y, brow);
  }
  const m = c.mouthRow ?? 10;
  if (mood === "pleased") {
    put(5, m, "M");
    put(10, m, "M");
    for (const x of [6, 7, 8, 9]) put(x, m + 1, "M");
  } else {
    for (const x of [6, 7, 8, 9]) put(x, m, "M");
    if (mood === "stern") {
      put(5, m + 1, "M");
      put(10, m + 1, "M");
    }
  }

  overlay(c.top);
  return g;
}

const MOOD_LABEL: Record<Mood, string> = {
  neutral: "espressione neutra",
  stern: "espressione severa",
  pleased: "espressione soddisfatta",
};

export function Portrait({
  who,
  mood = "neutral",
  name,
  size = 96,
}: {
  who: Who;
  mood?: Mood;
  name: string;
  size?: number;
}) {
  const palette: Record<string, string> = { ...CAST[who].palette, E: EYE, M: MOUTH };
  const grid = build(who, mood);
  return (
    <svg
      role="img"
      aria-label={`${name}, ${MOOD_LABEL[mood]}`}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className="portrait shrink-0"
    >
      {grid.flatMap((line, y) =>
        line.map((ch, x) =>
          ch === "." ? null : (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={palette[ch]} />
          ),
        ),
      )}
    </svg>
  );
}
