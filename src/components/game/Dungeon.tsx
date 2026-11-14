/**
 * Mappa del percorso come corridoio di un dungeon visto di fronte: tre porte per le sedute
 * preliminari e il portone della Commissione Plenaria. Tutto è disegnato qui come griglie di
 * pixel 16×16 (nessuna immagine esterna). La mappa è un'illustrazione dello stato: ogni porta ha
 * la sua etichetta testuale e l'unica porta attivabile è un vero pulsante.
 */
const SIZE = 16;
type Grid = string[][];

const blank = (): Grid => Array.from({ length: SIZE }, () => Array<string>(SIZE).fill("."));

function Pixels({
  grid,
  palette,
  size,
  label,
}: {
  grid: Grid;
  palette: Record<string, string>;
  size: number;
  label?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
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

const COLORS = {
  f: "#8a8f86", // pietra della cornice
  F: "#e3b758", // cornice in ottone: porta raggiungibile o superata
  d: "#7a4d2a", // legno
  D: "#5c381d", // venatura del legno
  i: "#4b4f57", // ferro
  o: "#0c100e", // varco buio
  a: "#e3b758", // ottone
  r: "#b3402f", // bagliore della sala del Presidente
};

/** Arco in pietra con interno riempito da `fill(x, y)`. */
function arch(frame: string, fill: (x: number, y: number) => string): Grid {
  const g = blank();
  for (let y = 1; y < SIZE; y++) {
    // L'arco si stringe nelle prime tre righe.
    const inset = y === 1 ? 4 : y === 2 ? 3 : 2;
    for (let x = inset; x < SIZE - inset; x++) {
      const edge = x === inset || x === SIZE - inset - 1 || y === 1;
      g[y]![x] = edge ? frame : fill(x, y);
    }
  }
  return g;
}

type DoorState = "closed" | "next" | "done";

function door(state: DoorState): Grid {
  const frame = state === "closed" ? "f" : "F";
  if (state === "done") {
    // Porta aperta: varco buio con il segno di spunta in ottone.
    const g = arch(frame, () => "o");
    for (const [x, y] of [
      [5, 9],
      [6, 10],
      [7, 11],
      [8, 10],
      [9, 9],
      [10, 8],
      [11, 7],
    ] as const)
      g[y]![x] = "a";
    return g;
  }
  return arch(frame, (x, y) => {
    if (y === 5 || y === 12) return "i"; // bandelle di ferro
    if (x === 11 && (y === 8 || y === 9)) return "a"; // maniglia
    return x === 6 || x === 9 ? "D" : "d";
  });
}

type GateState = "locked" | "open" | "done";

function gate(state: GateState): Grid {
  const frame = state === "locked" ? "f" : "F";
  if (state === "done") {
    // Sala conquistata: varco con corona.
    const g = arch(frame, () => "o");
    for (const [x, y] of [
      [5, 7],
      [8, 7],
      [10, 7],
      [5, 8],
      [6, 8],
      [7, 8],
      [8, 8],
      [9, 8],
      [10, 8],
      [5, 9],
      [6, 9],
      [7, 9],
      [8, 9],
      [9, 9],
      [10, 9],
    ] as const)
      g[y]![x] = "a";
    return g;
  }
  if (state === "open") {
    // Saracinesca alzata: restano le punte in alto, sotto il bagliore della sala.
    return arch(frame, (x, y) => (y <= 4 ? (x % 2 === 0 ? "i" : "o") : y >= 12 ? "r" : "o"));
  }
  // Saracinesca abbassata con lucchetto.
  const g = arch(frame, (x, y) => (x % 2 === 0 || y === 6 || y === 11 ? "i" : "o"));
  for (let y = 7; y <= 10; y++) for (let x = 6; x <= 9; x++) g[y]![x] = "a";
  g[8]![7] = "o";
  g[9]![7] = "o";
  g[8]![8] = "o";
  return g;
}

const STUDENT_PALETTE = {
  h: "#3a2a1c",
  s: "#eec39f",
  e: "#1b1a22",
  b: "#3f6fa8",
  p: "#2c3140",
  k: "#15171c",
  a: "#e3b758",
};
const STUDENT: Grid = [
  "................",
  ".....hhhhhh.....",
  "....hhhhhhhh....",
  "....hsssssshh...",
  "....sesssses....",
  "....ssssssss....",
  ".....ssssss.....",
  "....bbbaabbb....",
  "...bbbbbbbbbb...",
  "...sbbbbbbbbs...",
  "...sbbbbbbbbs...",
  "....bbbbbbbb....",
  "....pppppppp....",
  "....ppp..ppp....",
  "....ppp..ppp....",
  "....kkk..kkk....",
].map((r) => r.split(""));

const NUMERALS = ["I", "II", "III", "IV", "V"];

export function DungeonMap({
  required,
  passed,
  bossPassed,
  onEnter,
}: {
  /** Sedute preliminari necessarie. */
  required: number;
  /** Sedute preliminari convalidate. */
  passed: number;
  bossPassed: boolean;
  /** Entra nella porta raggiungibile (seduta successiva o Commissione). */
  onEnter: () => void;
}) {
  const unlocked = passed >= required;
  // Colonna in cui si trova lo studente: davanti alla prossima porta da affrontare.
  const here = Math.min(passed, required);
  const stops = [
    ...Array.from({ length: required }, (_, i) => {
      const state: DoorState = i < passed ? "done" : i === passed ? "next" : "closed";
      return {
        key: `s${i}`,
        title: `Seduta ${NUMERALS[i] ?? i + 1}`,
        status: state === "done" ? "Convalidata" : state === "next" ? "Da sostenere" : "Chiusa",
        grid: door(state),
        size: 72,
        active: state === "next",
        done: state === "done",
      };
    }),
    (() => {
      const state: GateState = bossPassed ? "done" : unlocked ? "open" : "locked";
      return {
        key: "boss",
        // "Plenaria" e non "Commissione": l'etichetta deve stare in una colonna anche su telefono.
        title: "Plenaria",
        status: bossPassed ? "Superata" : unlocked ? "Aperta" : "Sigillata",
        grid: gate(state),
        size: 88,
        active: state === "open",
        done: state === "done",
      };
    })(),
  ];
  const cols = { gridTemplateColumns: `repeat(${stops.length}, minmax(0, 1fr))` };

  return (
    <div className="panel overflow-hidden">
      <div className="dungeon-wall grid items-end px-2 pt-6" style={cols}>
        {stops.map((s) => (
          <div key={s.key} className="flex justify-center">
            {s.active ? (
              <button
                onClick={onEnter}
                className="dungeon-door"
                aria-label={`${s.title}: ${s.status}. Entra`}
              >
                <Pixels grid={s.grid} palette={COLORS} size={s.size} />
              </button>
            ) : (
              <Pixels grid={s.grid} palette={COLORS} size={s.size} />
            )}
          </div>
        ))}
      </div>
      <div className="dungeon-floor grid px-2 py-3" style={cols} aria-hidden="true">
        {stops.map((s, i) => (
          <div key={s.key} className="flex h-12 justify-center">
            {i === here && <Pixels grid={STUDENT} palette={STUDENT_PALETTE} size={48} />}
          </div>
        ))}
      </div>
      <ol className="grid gap-y-1 px-2 py-4 text-center" style={cols}>
        {stops.map((s) => (
          <li key={s.key} className="min-w-0 px-1">
            <div className={`font-display text-sm ${s.done || s.active ? "text-brass" : ""}`}>
              {s.title}
            </div>
            <div className="text-xs text-muted-foreground">{s.status}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
