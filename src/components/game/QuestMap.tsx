/**
 * Mappa del percorso nello stile "Oral Exam Quest": porte piatte e colorate in fila su una
 * striscia di piastrelle, con lo studente davanti alla prossima da affrontare. Tutto è disegnato
 * qui come griglie di pixel 16×16 (nessuna immagine esterna). La mappa illustra lo stato: ogni
 * porta ha la sua etichetta testuale e l'unica porta attivabile è un vero pulsante.
 */
const SIZE = 16;
type Grid = string[][];

const PALETTE: Record<string, string> = {
  k: "#1a192e",
  w: "#ffffff",
  l: "#dbe0e7", // porta ancora chiusa
  y: "#f4b73a", // porta da affrontare
  g: "#38b271", // porta superata
  r: "#e03a49", // sala del Presidente aperta
  n: "#2b2a4a", // sala del Presidente sigillata
  b: "#386ee0",
  h: "#5a3820",
  s: "#f0c89f",
};

export function Pixels({ grid, size, label }: { grid: Grid; size: number; label?: string }) {
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className="shrink-0"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
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

const parse = (rows: string[]): Grid => rows.map((r) => r.split(""));

/** Porta rettangolare: contorno, riempimento, riflesso in alto e pomello. `top` ne fissa l'altezza. */
function doorGrid(
  fill: string,
  top: number,
  mark?: readonly (readonly [number, number])[],
  markColor = "w",
): Grid {
  const g: Grid = Array.from({ length: SIZE }, () => Array<string>(SIZE).fill("."));
  for (let y = top; y < SIZE; y++)
    for (let x = 3; x <= 12; x++) {
      const edge = x === 3 || x === 12 || y === top;
      g[y]![x] = edge ? "k" : fill;
    }
  for (let x = 5; x <= 10; x++) g[top + 1]![x] = "w";
  g[top + 7]![10] = "k";
  for (const [x, y] of mark ?? []) g[y]![x] = markColor;
  return g;
}

const CHECK = [
  [5, 10],
  [6, 11],
  [7, 12],
  [8, 11],
  [9, 10],
  [10, 9],
] as const;
const STAR = [
  [7, 6],
  [8, 6],
  [6, 7],
  [7, 7],
  [8, 7],
  [9, 7],
  [5, 8],
  [6, 8],
  [7, 8],
  [8, 8],
  [9, 8],
  [10, 8],
  [6, 9],
  [7, 9],
  [8, 9],
  [9, 9],
  [6, 10],
  [9, 10],
] as const;
const LOCK = [
  [6, 7],
  [7, 6],
  [8, 6],
  [9, 7],
  [6, 8],
  [7, 8],
  [8, 8],
  [9, 8],
  [6, 9],
  [9, 9],
  [6, 10],
  [7, 10],
  [8, 10],
  [9, 10],
] as const;

type DoorState = "closed" | "next" | "done";
const door = (state: DoorState): Grid =>
  state === "done" ? doorGrid("g", 4, CHECK) : doorGrid(state === "next" ? "y" : "l", 4);

type GateState = "locked" | "open" | "done";
const gate = (state: GateState): Grid =>
  state === "done"
    ? doorGrid("b", 0, STAR, "y")
    : state === "open"
      ? doorGrid("r", 0)
      : doorGrid("n", 0, LOCK, "y");

const STUDENT = parse([
  "....kkkkkkkk....",
  "...khhhhhhhhk...",
  "..khhhhhhhhhhk..",
  "..khhsssssshhk..",
  "..khsksssskshk..",
  "..kssssssssssk..",
  "...kssssssssk...",
  "..kkkkkkkkkkkk..",
  ".kbbbbbbbbbbbbk.",
  ".ksbbbwwbbbbbsk.",
  ".kskbbbbbbbbksk.",
  "..kkbbbbbbbbkk..",
  "...knnnnnnnnk...",
  "...knnnkknnnk...",
  "...kkkk..kkkk...",
  "................",
]);

/** Lo studente del gioco, riusabile fuori dalla mappa. */
export function Student({ size = 48 }: { size?: number }) {
  return <Pixels grid={STUDENT} size={size} />;
}

const NUMERALS = ["I", "II", "III", "IV", "V"];

export function QuestMap({
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
        size: 80,
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
        size: 80,
        active: state === "open",
        done: state === "done",
      };
    })(),
  ];
  const cols = { gridTemplateColumns: `repeat(${stops.length}, minmax(0, 1fr))` };

  return (
    <div className="panel overflow-hidden">
      <div className="grid items-end px-2 pt-6" style={cols}>
        {stops.map((s) => (
          <div key={s.key} className="flex justify-center">
            {s.active ? (
              <button
                onClick={onEnter}
                className="quest-door"
                aria-label={`${s.title}: ${s.status}. Entra`}
              >
                <Pixels grid={s.grid} size={s.size} />
              </button>
            ) : (
              <Pixels grid={s.grid} size={s.size} />
            )}
          </div>
        ))}
      </div>
      <div className="quest-tiles" aria-hidden="true" />
      <div className="grid px-2 pt-2" style={cols} aria-hidden="true">
        {stops.map((s, i) => (
          <div key={s.key} className="flex h-14 justify-center">
            {i === here && <Student size={56} />}
          </div>
        ))}
      </div>
      <ol className="grid gap-y-1 px-2 pb-4 pt-1 text-center" style={cols}>
        {stops.map((s) => (
          <li key={s.key} className="min-w-0 px-1">
            <div className={`font-display text-2xl leading-none ${s.active ? "text-pop" : ""}`}>
              {s.title}
            </div>
            <div className="text-xs text-muted-foreground">{s.status}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
