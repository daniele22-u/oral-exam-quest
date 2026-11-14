import { CONFIDENCE } from "@/lib/game/data";
import { SUFFICIENT, expectedScore, type QuestionRecord } from "@/lib/game/engine";

/**
 * Indicatori nello stile "Oral Exam Quest": il battito che sale con la pressione, le monete
 * della puntata di sicurezza e il confronto tra quanto si credeva di sapere e quanto si è
 * dimostrato. Ogni indicatore ha anche il valore scritto, mai solo il colore.
 */

/** Cuore a pixel. */
export function Heart({ size = 24 }: { size?: number }) {
  const rows = [
    "..kk...kk..",
    ".krrk.krrk.",
    "krwrrkrrrrk",
    "krrrrrrrrrk",
    "krrrrrrrrrk",
    ".krrrrrrrk.",
    "..krrrrrk..",
    "...krrrk...",
    "....krk....",
    ".....k.....",
  ];
  const fill: Record<string, string> = { k: "#1a192e", r: "#e03a49", w: "#ffffff" };
  return (
    <svg
      viewBox="0 0 11 10"
      width={size}
      height={(size * 10) / 11}
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="shrink-0"
    >
      {rows.flatMap((line, y) =>
        line
          .split("")
          .map((ch, x) =>
            ch === "." ? null : (
              <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill[ch]} />
            ),
          ),
      )}
    </svg>
  );
}

/**
 * Tracciato del battito: più battiti al minuto, più picchi ravvicinati e colore dal verde al
 * rosso. È un termometro della pressione della domanda, non una misura reale.
 */
export function Pulse({ bpm }: { bpm: number }) {
  const color =
    bpm >= 130 ? "var(--red-ink)" : bpm >= 95 ? "oklch(0.62 0.15 70)" : "var(--green-ink)";
  const beats = Math.max(2, Math.min(6, Math.round(bpm / 28)));
  const w = 240;
  const step = w / beats;
  let d = "M0 13";
  for (let i = 0; i < beats; i++) {
    const x = i * step;
    const at = (f: number) => (x + step * f).toFixed(1);
    d += ` L${at(0.3)} 13 L${at(0.38)} 9 L${at(0.46)} 13 L${at(0.54)} 13 L${at(0.6)} 2 L${at(0.68)} 20 L${at(0.74)} 13`;
  }
  d += ` H${w}`;
  return (
    <div
      role="img"
      aria-label={`Tensione: ${bpm} battiti al minuto`}
      className="flex items-center gap-2"
    >
      <Heart size={24} />
      <svg
        viewBox={`0 0 ${w} 22`}
        preserveAspectRatio="none"
        className="h-6 min-w-0 flex-1"
        aria-hidden="true"
      >
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="miter"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="font-display text-2xl leading-none" style={{ color }} aria-hidden="true">
        {bpm}
      </span>
    </div>
  );
}

/** Monete della puntata: tante quante il moltiplicatore dei crediti. */
export function Coins({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-1" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <svg key={i} viewBox="0 0 8 8" width={18} height={18} shapeRendering="crispEdges">
          <path d="M2 0h4v1h1v1h1v4h-1v1h-1v1h-4v-1h-1v-1h-1v-4h1v-1h1z" fill="#1a192e" />
          <path d="M2 1h4v1h1v4h-1v1h-4v-1h-1v-4h1z" fill="#f4b73a" />
          <path d="M2 2h1v1h-1z" fill="#ffffff" />
        </svg>
      ))}
    </span>
  );
}

/**
 * "Pensato" contro "Dimostrato": la resa attesa per la sicurezza dichiarata accanto a quella
 * ottenuta. Se la resa è inferiore, lo scarto è tratteggiato in rosso.
 */
export function GapBars({ q }: { q: QuestionRecord }) {
  if (q.confidence === "lacuna") return null;
  const thought = expectedScore(q.confidence);
  const proven = q.score.total;
  const gap = Math.round((thought - proven) * 10) / 10;
  const pct = (v: number) => `${Math.max(0, Math.min(100, v * 10))}%`;
  return (
    <div className="w-full max-w-sm">
      <div className="flex items-baseline justify-between font-display text-xl leading-none">
        <span>Pensato</span>
        <span className="text-muted-foreground">
          {CONFIDENCE[q.confidence].label} · {thought}/10
        </span>
      </div>
      <div className="meter mt-1" style={{ "--fill": "var(--quest-blue)" } as React.CSSProperties}>
        <div style={{ width: pct(thought) }} />
      </div>
      <div className="mt-3 flex items-baseline justify-between font-display text-xl leading-none">
        <span>Dimostrato</span>
        <span className="text-muted-foreground">{proven}/10</span>
      </div>
      <div className="meter mt-1 flex">
        <div style={{ width: pct(proven) }} />
        {gap > 0 && <div className="gap-hatch" style={{ width: pct(gap) }} />}
      </div>
      <div
        className={`mt-2 font-display text-2xl leading-none ${gap > 0 ? "text-destructive" : "text-[var(--green-ink)]"}`}
      >
        {gap > 0
          ? `Scarto −${gap}`
          : proven >= SUFFICIENT
            ? gap < 0
              ? `Oltre le attese +${-gap}`
              : "In linea con le attese"
            : "In linea, ma insufficiente"}
      </div>
    </div>
  );
}
