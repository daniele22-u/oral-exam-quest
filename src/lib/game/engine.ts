import { CONFIDENCE, type Confidence, type ExaminerId, type Topic } from "./data";

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
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/**
 * Le parole chiave sono radici ("campion", "stabil") cercate come sottostringa; quelle di 1-2
 * caratteri ("m", "h", "z") devono invece comparire come parola a sé, altrimenti qualsiasi
 * testo le conterrebbe.
 */
function keywordHits(text: string, keywords: string[]): number {
  const tokens = new Set(text.split(/[^a-z0-9]+/).filter(Boolean));
  return keywords.filter((k) => {
    const n = norm(k);
    return n.length <= 2 ? tokens.has(n) : text.includes(n);
  }).length;
}

export function keywordCoverage(answers: string[], topic: Topic): Coverage {
  return {
    hit: keywordHits(norm(answers.join(" ")), topic.keywords),
    total: topic.keywords.length,
  };
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
