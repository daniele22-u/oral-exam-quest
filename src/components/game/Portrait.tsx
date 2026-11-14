import type { ExaminerId } from "@/lib/game/data";

/**
 * Pixel portraits of the examiners in the "Oral Exam Quest" style: 16×16 flat-colour figures
 * with a midnight-blue outline, drawn here as grids (no external images). Each character has
 * a base grid and small variations for the three moods.
 */
export type Mood = "neutral" | "stern" | "pleased";
export type Who = ExaminerId | "presidente";

const SIZE = 16;

const PALETTE: Record<string, string> = {
  k: "#1a192e", // midnight-blue outline
  w: "#ffffff",
  p: "#694ad7", // cyclops purple
  b: "#386ee0",
  r: "#e03a49",
  y: "#f4b73a",
  g: "#a6abb9", // grey hair and beard
  s: "#f0c89f", // skin
  l: "#dbe0e7",
  n: "#2b2a4a", // jacket
};

type Patch = readonly (readonly [number, number, string])[];

interface Character {
  base: string[];
  /** Pixels to overwrite for each mood: [x, y, colour]. */
  moods: Record<Mood, Patch>;
}

/** Horizontal run of same-colour pixels. */
const run = (y: number, from: number, to: number, ch: string): Patch =>
  Array.from({ length: to - from + 1 }, (_, i) => [from + i, y, ch] as const);

// Narrowed gaze behind the glasses: the eyelid covers the top half of each lens.
const SQUINT: Patch = [
  [5, 7, "k"],
  [6, 7, "k"],
  [9, 7, "k"],
  [10, 7, "k"],
];

const CAST: Record<Who, Character> = {
  // Strict: the purple cyclops. The pupil turns red when pressing.
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
        // Lowered eyelid.
        ...run(5, 5, 10, "p"),
        [4, 6, "p"],
        [11, 6, "p"],
      ],
      // Smiling eye: the pupil becomes an arc.
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
  // Supportive: the round-faced robot, with antenna.
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
      // Slanted eyebrows and downturned mouth.
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
      // Smile and red cheeks.
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
  // Absent-minded: the grey-haired professor with big glasses and a moustache.
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
      // Narrowed gaze and drooping moustache.
      stern: [...SQUINT, [4, 11, "k"], [11, 11, "k"]],
      pleased: run(11, 6, 9, "r"),
    },
  },
  // President: the king with crown, glasses, grey beard and red cloak.
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
      // Narrowed gaze and tight mouth in the beard.
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
  neutral: "neutral expression",
  stern: "stern expression",
  pleased: "pleased expression",
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
