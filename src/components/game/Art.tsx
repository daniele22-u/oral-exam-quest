/**
 * The app's pixel icons and small illustrations, drawn as 12×12 grids (no external images).
 * They are decorative: the meaning is always written next to them.
 */
const PALETTE: Record<string, string> = {
  k: "#1a192e",
  w: "#ffffff",
  b: "#386ee0",
  r: "#e03a49",
  y: "#f4b73a",
  g: "#38b271",
  l: "#dbe0e7",
  p: "#694ad7",
};

const ICONS = {
  campus: [
    "....kkkk....",
    "...kyyyyk...",
    "..kkkkkkkk..",
    ".kwwwwwwwwk.",
    ".kkkkkkkkkk.",
    ".kwkwkkwkwk.",
    ".kwkwkkwkwk.",
    ".kwkwkkwkwk.",
    ".kwkwkkwkwk.",
    "kkkkkkkkkkkk",
    "kllllllllllk",
    "kkkkkkkkkkkk",
  ],
  cloud: [
    "............",
    "....kkkk....",
    "...kwwwwk...",
    "..kwwwwwwkk.",
    ".kwwwbbwwwwk",
    "kwwwwbbwwwwk",
    "kwwbbbbbbwwk",
    "kwwwbbbbwwwk",
    ".kwwwbbwwwk.",
    "..kkkkkkkk..",
    "............",
    "............",
  ],
  appunti: [
    "..kkkkkkk...",
    "..kwwwwwkk..",
    "..kwwwwwkwk.",
    "..kwwwwwkkk.",
    "..kwwwwwwwk.",
    "..kwbbbbwwk.",
    "..kwwwwwwwk.",
    "..kwbbbbbwk.",
    "..kwwwwwwwk.",
    "..kwbbbwwwk.",
    "..kwwwwwwwk.",
    "..kkkkkkkkk.",
  ],
  video: [
    "............",
    "kkkkkkkkkkkk",
    "krrrrrrrrrrk",
    "krrrwrrrrrrk",
    "krrrwwrrrrrk",
    "krrrwwwrrrrk",
    "krrrwwwwrrrk",
    "krrrwwwrrrrk",
    "krrrwwrrrrrk",
    "krrrwrrrrrrk",
    "krrrrrrrrrrk",
    "kkkkkkkkkkkk",
  ],
  audio: [
    "............",
    "....kkkkkkk.",
    "....kyyyyyk.",
    "....kykkkyk.",
    "....kyk.kyk.",
    "....kyk.kyk.",
    "....kyk.kyk.",
    "..kkkyk.kyk.",
    ".kyyyykkkyk.",
    ".kyyyykyyyk.",
    "..kkkk.kkk..",
    "............",
  ],
  trascrizione: [
    "............",
    ".kkkkkkkkkk.",
    "kwwwwwwwwwwk",
    "kwggggggggwk",
    "kwwwwwwwwwwk",
    "kwgggggwwwwk",
    "kwwwwwwwwwwk",
    "kwggggggwwwk",
    "kwwwwwwwwwwk",
    ".kkkkkkkkkk.",
    "...kk.......",
    "..kk........",
  ],
  door: [
    "..kkkkkkkk..",
    "..kyyyyyyk..",
    "..kywwwwyk..",
    "..kyyyyyyk..",
    "..kyyyyyyk..",
    "..kyyyyyyk..",
    "..kyyyykyk..",
    "..kyyyyyyk..",
    "..kyyyyyyk..",
    "..kyyyyyyk..",
    "..kyyyyyyk..",
    "kkkkkkkkkkkk",
  ],
  book: [
    "..kkkkkkkk..",
    ".kbbbbbbbbk.",
    ".kbwwwwwwbk.",
    ".kbwkkkkwbk.",
    ".kbwwwwwwbk.",
    ".kbbbbbbbbk.",
    ".kbbbbbbbbk.",
    ".kbbbbbbbbk.",
    ".kbbbbbbbbk.",
    ".kkkkkkkkkk.",
    ".kwwwwwwwwk.",
    ".kkkkkkkkkk.",
  ],
  folder: [
    "............",
    ".kkkk.......",
    "kyyyykkkkkk.",
    "kyyyyyyyyyyk",
    "kkkkkkkkkkkk",
    "kyyyyyyyyyyk",
    "kyyyyyyyyyyk",
    "kyyyyyyyyyyk",
    "kyyyyyyyyyyk",
    "kyyyyyyyyyyk",
    "kkkkkkkkkkkk",
    "............",
  ],
  check: [
    "............",
    "............",
    "..........kk",
    ".........kgk",
    "........kgk.",
    ".kk....kgk..",
    "kggk..kgk...",
    ".kggkkgk....",
    "..kgggk.....",
    "...kgk......",
    "....k.......",
    "............",
  ],
  crown: [
    "............",
    "............",
    "k....kk....k",
    "kk..kyyk..kk",
    "kyk.kyyk.kyk",
    "kyykyyyykyyk",
    "kyyyyyyyyyyk",
    "kyryyyyyyryk",
    "kyyyyyyyyyyk",
    "kkkkkkkkkkkk",
    "............",
    "............",
  ],
  bubble: [
    "............",
    ".kkkkkkkkkk.",
    "kppppppppppk",
    "kpwwpwwpwwpk",
    "kpwwpwwpwwpk",
    "kppppppppppk",
    "kppppppppppk",
    ".kkkkkkkkkk.",
    "......kpk...",
    ".......kk...",
    "............",
    "............",
  ],
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg
      viewBox="0 0 12 12"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="shrink-0"
    >
      {ICONS[name].flatMap((line, y) =>
        line
          .split("")
          .map((ch, x) =>
            ch === "." ? null : (
              <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={PALETTE[ch]} />
            ),
          ),
      )}
    </svg>
  );
}
