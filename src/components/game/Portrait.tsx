import type { ExaminerId } from "@/lib/game/data";

/**
 * Ritratti a pixel degli esaminatori nello stile "Oral Exam Quest": figure 16×16 a colori piatti
 * con contorno blu notte, disegnate qui come griglie (nessuna immagine esterna). Ogni personaggio
 * ha una griglia di base e piccole variazioni per i tre stati d'animo.
 */
export type Mood = "neutral" | "stern" | "pleased";
export type Who = ExaminerId | "presidente";

const SIZE = 16;

const PALETTE: Record<string, string> = {
  k: "#1a192e", // contorno blu notte
  w: "#ffffff",
  p: "#694ad7", // viola del ciclope
  b: "#386ee0",
  r: "#e03a49",
  y: "#f4b73a",
  g: "#a6abb9", // capelli e barba grigi
  s: "#f0c89f", // pelle
  l: "#dbe0e7",
  n: "#2b2a4a", // giacca
};

type Patch = readonly (readonly [number, number, string])[];

interface Character {
  base: string[];
  /** Pixel da sovrascrivere per ogni stato d'animo: [x, y, colore]. */
  moods: Record<Mood, Patch>;
}

/** Riga orizzontale di pixel dello stesso colore. */
const run = (y: number, from: number, to: number, ch: string): Patch =>
  Array.from({ length: to - from + 1 }, (_, i) => [from + i, y, ch] as const);

// Sguardo stretto dietro gli occhiali: la palpebra copre la metà alta di ogni lente.
const SQUINT: Patch = [
  [5, 7, "k"],
  [6, 7, "k"],
  [9, 7, "k"],
  [10, 7, "k"],
];

const CAST: Record<Who, Character> = {
  // Severa: il ciclope viola. La pupilla si accende di rosso quando incalza.
  severo: {
    base: [
      "................",
      "..kk........kk..",
      ".kppk.kkkk.kppk.",
      ".kpppkppppkpppk.",
      ".kppppppppppppk.",
      ".kpppwwwwwwpppk.",
      ".kppwwwwwwwwppk.",
      ".kppwwkkkkwwppk.",
      ".kppwwkwwkwwppk.",
      ".kppwwkkkkwwppk.",
      ".kppwwwwwwwwppk.",
      ".kpppwwwwwwpppk.",
      ".kppppppppppppk.",
      ".kpkkppkkppkkpk.",
      "..k..kk..kk..k..",
      "................",
    ],
    moods: {
      neutral: [],
      stern: [
        [7, 8, "r"],
        [8, 8, "r"],
        // Palpebra abbassata.
        ...run(5, 5, 10, "p"),
        [4, 6, "p"],
        [11, 6, "p"],
      ],
      // Occhio che sorride: la pupilla diventa un arco.
      pleased: [
        ...run(7, 6, 9, "w"),
        [7, 7, "k"],
        [8, 7, "k"],
        ...run(8, 6, 9, "w"),
        [6, 8, "k"],
        [9, 8, "k"],
        ...run(9, 6, 9, "w"),
      ],
    },
  },
  // Empatico: il robot dal viso tondo, con antenna.
  empatico: {
    base: [
      ".......bb.......",
      ".......bb.......",
      "....bbbbbbbb....",
      "...bwwwwwwwwb...",
      "..bwwwwwwwwwwb..",
      "..bwwwwwwwwwwb..",
      "..bwwkkwwkkwwb..",
      "..bwwkkwwkkwwb..",
      "..bwwwwwwwwwwb..",
      "..bwwwkkkkwwwb..",
      "..bwwwwwwwwwwb..",
      "...bwwwwwwwwb...",
      "....bbbbbbbb....",
      "......bllb......",
      "...bbbbbbbbbb...",
      "..bbbbbbbbbbbb..",
    ],
    moods: {
      neutral: [],
      // Sopracciglia inclinate e bocca all'ingiù.
      stern: [
        [4, 4, "k"],
        [5, 5, "k"],
        [6, 5, "k"],
        [11, 4, "k"],
        [10, 5, "k"],
        [9, 5, "k"],
        [5, 10, "k"],
        [10, 10, "k"],
      ],
      // Sorriso e guance rosse.
      pleased: [
        ...run(9, 6, 9, "w"),
        [5, 9, "k"],
        [10, 9, "k"],
        ...run(10, 6, 9, "k"),
        [3, 8, "r"],
        [12, 8, "r"],
      ],
    },
  },
  // Distratto: il professore dai capelli grigi con occhialoni e baffi.
  distratto: {
    base: [
      ".....kkkkkk.....",
      "....kggggggk....",
      "...kggggggggk...",
      "..kgggssssgggk..",
      "..kggssssssggk..",
      "..kgssssssssgk..",
      "..kssggssggssk..",
      "..kskwwkkwwksk..",
      "..kskwkkkkwksk..",
      "..kssssssssssk..",
      "..ksskkkkkkssk..",
      "...kssssssssk...",
      "....kkkkkkkk....",
      "...nnnnwwnnnn...",
      "..nnnnnwwnnnnn..",
      ".nnnnnnnnnnnnnn.",
    ],
    moods: {
      neutral: [],
      // Sguardo stretto e baffi che scendono.
      stern: [...SQUINT, [4, 11, "k"], [11, 11, "k"]],
      pleased: run(11, 6, 9, "r"),
    },
  },
  // Presidente: il re con corona, occhiali, barba grigia e manto rosso.
  presidente: {
    base: [
      "..k...kkkk...k..",
      ".kyk.kyyyyk.kyk.",
      ".kyykyyyyyykyyk.",
      ".kyyryyyyyyryyk.",
      ".kkkkkkkkkkkkkk.",
      "..kggssssssggk..",
      "..kssggssggssk..",
      "..kskwwkkwwksk..",
      "..kskwkkkkwksk..",
      "..kgssssssssgk..",
      "..kggggggggggk..",
      "..kggggggggggk..",
      "...kggggggggk...",
      "..krrrrggrrrrk..",
      ".krrrrryyrrrrrk.",
      ".krrrrrrrrrrrrk.",
    ],
    moods: {
      neutral: [],
      // Sguardo stretto e bocca serrata nella barba.
      stern: [...SQUINT, ...run(10, 6, 9, "k")],
      pleased: run(10, 6, 9, "r"),
    },
  },
};

function build(who: Who, mood: Mood): string[][] {
  const c = CAST[who];
  const g = c.base.map((r) => r.split(""));
  for (const [x, y, ch] of c.moods[mood]) {
    const line = g[y];
    if (line && x >= 0 && x < SIZE) line[x] = ch;
  }
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
  const grid = build(who, mood);
  return (
    <svg
      role="img"
      aria-label={`${name}, ${MOOD_LABEL[mood]}`}
      viewBox={`-1 -1 ${SIZE + 2} ${SIZE + 2}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className="portrait shrink-0"
    >
      {grid.flatMap((line, y) =>
        line.map((ch, x) =>
          ch === "." ? null : (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={PALETTE[ch]} />
          ),
        ),
      )}
    </svg>
  );
}
