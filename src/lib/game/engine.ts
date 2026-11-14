import { CONCEPT_LABELS, CONFIDENCE, type Confidence, type ExaminerId, type Topic } from "./data";

export const START_CREDITS = 30;
export const PASS_THRESHOLD = 40; // crediti per convalidare una seduta
export const REQUIRED_SESSIONS = 3;

export interface Turn {
  role: "prof" | "student";
  text: string;
}
export interface Score {
  accuracy: number;
  completeness: number;
  logic: number;
  total: number;
}
export interface QuestionRecord {
  topicId: string;
  topicTitle: string;
  course: string;
  confidence: Confidence | "lacuna";
  transcript: Turn[];
  score: Score;
  delta: number;
  model: string;
  examiner: string;
  /** Concetti chiave del programma toccati nella risposta (assente nei fascicoli salvati da versioni precedenti). */
  coverage?: Coverage;
  /** Concetti chiave non toccati, con nome leggibile (assente nei fascicoli precedenti). */
  missed?: string[];
}
export interface Coverage {
  hit: number;
  total: number;
}
export interface SessionRecord {
  id: string;
  examiner: ExaminerId | "presidente";
  examinerName: string;
  credits: number;
  passed: boolean;
  questions: QuestionRecord[];
  /** Data di chiusura in formato ISO (assente nei fascicoli precedenti). */
  date?: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/**
 * Le parole chiave sono radici ("campion", "stabil") cercate come sottostringa; simboli e sigle
 * fino a 3 caratteri ("m", "z", "ica", "fir", "log") devono invece comparire come parola a sé,
 * altrimenti le conterrebbe quasi ogni testo ("tipica", "firma", "logica").
 */
function splitKeywords(text: string, keywords: string[]) {
  const tokens = new Set(text.split(/[^a-z0-9]+/).filter(Boolean));
  const hit: string[] = [];
  const missed: string[] = [];
  for (const k of keywords) {
    const n = norm(k);
    const found = /^[a-z0-9]{1,3}$/.test(n) ? tokens.has(n) : text.includes(n);
    (found ? hit : missed).push(k);
  }
  return { hit, missed };
}
const keywordHits = (text: string, keywords: string[]) => splitKeywords(text, keywords).hit.length;

export function keywordCoverage(answers: string[], topic: Topic): Coverage {
  return {
    hit: keywordHits(norm(answers.join(" ")), topic.keywords),
    total: topic.keywords.length,
  };
}

/** Concetti chiave dell'argomento che le risposte non hanno toccato, con nome leggibile. */
export function missedConcepts(answers: string[], topic: Topic): string[] {
  return splitKeywords(norm(answers.join(" ")), topic.keywords).missed.map(
    (k) => CONCEPT_LABELS[k] ?? k,
  );
}

/** Valutazione demo deterministica: parole chiave, lunghezza, connettivi logici. */
export function scoreAnswers(answers: string[], topic: Topic): Score {
  const text = norm(answers.join(" "));
  const hits = keywordHits(text, topic.keywords);
  const accuracy = Math.min(10, Math.round((hits / Math.max(3, topic.keywords.length * 0.6)) * 10));
  const words = text.split(/\s+/).filter(Boolean).length;
  const completeness = Math.min(10, Math.round(words / (answers.length * 4)));
  const connectors = (
    text.match(/\b(perche|quindi|dunque|infatti|poiche|ovvero|cioe|se|allora|mentre)\b/g) || []
  ).length;
  const logic = Math.min(10, 3 + connectors * 2 + (words > 20 ? 1 : 0));
  const total = Math.round((accuracy * 0.5 + completeness * 0.25 + logic * 0.25) * 10) / 10;
  return { accuracy, completeness, logic, total };
}

export function creditDelta(score: Score, conf: Confidence | "lacuna"): number {
  if (conf === "lacuna") return -2;
  const c = CONFIDENCE[conf];
  return score.total >= 6 ? Math.round(score.total * c.mult) : -c.penalty;
}

/** Indice di calibrazione 0-100: quanto la sicurezza dichiarata corrisponde alla resa. */
export function calibration(qs: QuestionRecord[]): number {
  if (!qs.length) return 0;
  // Una lacuna dichiarata è una previsione esatta della propria resa (0): non deve abbassare l'indice.
  const exp: Record<string, number> = { prudente: 4.5, solido: 6.5, senzarete: 8.5, lacuna: 0 };
  const err =
    qs.reduce((a, q) => a + Math.abs((exp[q.confidence] ?? 5) - q.score.total), 0) / qs.length;
  return Math.max(0, Math.round(100 - err * 12));
}

export function finalGrade(sessions: SessionRecord[]): { grade: string; avg: number } {
  const qs = sessions.flatMap((s) => s.questions);
  const avg = qs.reduce((a, q) => a + q.score.total, 0) / Math.max(1, qs.length);
  const cal = calibration(qs);
  let g = Math.round(18 + (avg / 10) * 12 + (cal - 50) / 25);
  g = Math.max(18, Math.min(31, g));
  return { grade: g === 31 ? "30 e lode" : `${g}/30`, avg: Math.round(avg * 10) / 10 };
}

/** Argomenti più deboli o lacune, per il Presidente. */
export function weakestTopics(sessions: SessionRecord[], n = 3) {
  const best = new Map<string, QuestionRecord>();
  for (const s of sessions)
    for (const q of s.questions) {
      const prev = best.get(q.topicId);
      const v = q.confidence === "lacuna" ? -1 : q.score.total;
      const pv = prev ? (prev.confidence === "lacuna" ? -1 : prev.score.total) : Infinity;
      if (v < pv) best.set(q.topicId, q);
    }
  return [...best.values()]
    .sort(
      (a, b) =>
        (a.confidence === "lacuna" ? -1 : a.score.total) -
        (b.confidence === "lacuna" ? -1 : b.score.total),
    )
    .slice(0, n);
}

export const isProtest = (t: string) =>
  /\b(ingiust|di nuovo|ancora questa|perche (mi|me)|gia (fatt|chiest)|non e giusto|basta|protest)/.test(
    norm(t),
  );

export function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j] as T, r[i] as T];
  }
  return r;
}

export const SUFFICIENT = 6;

/** Punti carenti di una singola domanda, ricavati dalle risposte date dallo studente. */
export function diagnose(q: QuestionRecord): string[] {
  if (q.confidence === "lacuna")
    return ["Argomento non sostenuto: lacuna dichiarata, da studiare da capo."];
  const out: string[] = [];
  const { accuracy, completeness, logic, total } = q.score;
  if (accuracy < SUFFICIENT)
    out.push(
      `Accuratezza ${accuracy}/10: nelle risposte mancano concetti centrali dell'argomento.`,
    );
  if (completeness < SUFFICIENT)
    out.push(
      `Completezza ${completeness}/10: risposte troppo brevi. Sviluppi definizione, meccanismo ed esempio.`,
    );
  if (logic < SUFFICIENT)
    out.push(
      `Tenuta logica ${logic}/10: i passaggi non sono collegati. Espliciti cause e conseguenze (perché, quindi, infatti).`,
    );
  const label = CONFIDENCE[q.confidence].label;
  if (q.confidence !== "prudente" && total < SUFFICIENT)
    out.push(`Sicurezza sopravvalutata: ha dichiarato "${label}" ma la resa è stata ${total}/10.`);
  if (q.confidence === "prudente" && total >= 8)
    out.push(
      `Sicurezza sottovalutata: ha dichiarato "${label}" con una resa di ${total}/10. Poteva esporsi di più.`,
    );
  return out;
}

/** Una domanda è carente se insufficiente, dichiarata come lacuna o con qualcosa da segnalare. */
export const isWeak = (q: QuestionRecord) =>
  q.confidence === "lacuna" || q.score.total < SUFFICIENT || diagnose(q).length > 0;

/** Referto di seduta in Markdown, scaricabile. */
export function sessionReportMarkdown(s: SessionRecord, title: string, date: string): string {
  const L: string[] = [];
  const course = s.questions[0]?.course;
  L.push(`# Referto di seduta: ${title}`, "");
  L.push(`- Data: ${date}`);
  if (course) L.push(`- Corso: ${course}`);
  L.push(`- Esaminatore: ${s.examinerName}`);
  L.push(
    `- Esito: ${s.passed ? "convalidata" : "non convalidata"} con ${s.credits} crediti (soglia ${PASS_THRESHOLD})`,
  );
  L.push(`- Calibrazione della sicurezza: ${calibration(s.questions)}%`, "");

  const weak = s.questions.filter(isWeak);
  L.push("## Punti carenti", "");
  if (!weak.length) L.push("Nessun punto carente rilevato in questa seduta.", "");
  for (const q of weak) {
    L.push(`### ${q.topicTitle} (${q.score.total}/10)`, "");
    for (const d of diagnose(q)) L.push(`- ${d}`);
    if (q.missed?.length) L.push(`- Concetti non toccati: ${q.missed.join(", ")}.`);
    L.push("", `**Cosa avrebbe dovuto dire.** ${q.model}`, "");
  }

  L.push("## Dettaglio delle domande", "");
  for (const q of s.questions) {
    const conf = q.confidence === "lacuna" ? "Lacuna riconosciuta" : CONFIDENCE[q.confidence].label;
    L.push(`### ${q.topicTitle}`, "");
    L.push(
      `Sicurezza dichiarata: ${conf}. Punteggio ${q.score.total}/10 (accuratezza ${q.score.accuracy}, completezza ${q.score.completeness}, tenuta logica ${q.score.logic}). Crediti ${q.delta >= 0 ? "+" : ""}${q.delta}.`,
      "",
    );
    for (const t of q.transcript)
      L.push(`> **${t.role === "prof" ? q.examiner : "Studente"}:** ${t.text}`, ">");
    L.pop();
    L.push("");
  }
  L.push(
    "---",
    "Analisi automatica basata sui concetti chiave del programma presenti nelle risposte: indica cosa ripassare, non sostituisce il giudizio di un docente.",
    "",
  );
  return L.join("\n");
}
