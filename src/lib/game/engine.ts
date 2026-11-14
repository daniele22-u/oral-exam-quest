import { CONCEPT_LABELS, CONFIDENCE, type Confidence, type ExaminerId, type Topic } from "./data";

export const START_CREDITS = 30;
export const PASS_THRESHOLD = 40; // credits needed to pass a session
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
  /** Key syllabus concepts touched by the answer (missing in records saved by older versions). */
  coverage?: Coverage;
  /** Key concepts not touched, with a readable name (missing in older records). */
  missed?: string[];
  /** Written feedback from the AI examiner; missing in demo mode. */
  feedback?: string;
  /** true when score and weak points come from the AI evaluator rather than keywords. */
  ai?: boolean;
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
  /** Closing date in ISO format (missing in older records). */
  date?: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/**
 * Keywords are stems ("sampl", "stab") matched as substrings; symbols and acronyms of up to
 * 3 characters ("m", "z", "ica", "fir", "log") must instead appear as a word of their own,
 * otherwise nearly any text would contain them ("typical", "first", "logic").
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

/** Key concepts of the topic that the answers did not touch, with a readable name. */
export function missedConcepts(answers: string[], topic: Topic): string[] {
  return splitKeywords(norm(answers.join(" ")), topic.keywords).missed.map(
    (k) => CONCEPT_LABELS[k] ?? k,
  );
}

/** Overall score: accuracy weighs half, completeness and logic a quarter each. */
export function withTotal(accuracy: number, completeness: number, logic: number): Score {
  const total = Math.round((accuracy * 0.5 + completeness * 0.25 + logic * 0.25) * 10) / 10;
  return { accuracy, completeness, logic, total };
}

/** Deterministic demo scoring: keywords, length, logical connectives. */
export function scoreAnswers(answers: string[], topic: Topic): Score {
  const text = norm(answers.join(" "));
  const hits = keywordHits(text, topic.keywords);
  const accuracy = Math.min(10, Math.round((hits / Math.max(3, topic.keywords.length * 0.6)) * 10));
  const words = text.split(/\s+/).filter(Boolean).length;
  const completeness = Math.min(10, Math.round(words / (answers.length * 4)));
  const connectors = (
    text.match(/\b(because|therefore|thus|hence|so|since|indeed|if|then|while|whereas)\b/g) || []
  ).length;
  const logic = Math.min(10, 3 + connectors * 2 + (words > 20 ? 1 : 0));
  return withTotal(accuracy, completeness, logic);
}

export function creditDelta(score: Score, conf: Confidence | "lacuna"): number {
  if (conf === "lacuna") return -2;
  const c = CONFIDENCE[conf];
  return score.total >= 6 ? Math.round(score.total * c.mult) : -c.penalty;
}

const EXPECTED: Record<Confidence | "lacuna", number> = {
  prudente: 4.5,
  solido: 6.5,
  senzarete: 8.5,
  lacuna: 0,
};
/** Score (0-10) that a stated confidence leads one to expect. */
export const expectedScore = (conf: Confidence | "lacuna") => EXPECTED[conf];

/** Calibration index 0-100: how well stated confidence matches performance. */
export function calibration(qs: QuestionRecord[]): number {
  if (!qs.length) return 0;
  // A declared gap is an exact prediction of one's own performance (0): it must not lower the index.
  const err =
    qs.reduce((a, q) => a + Math.abs(expectedScore(q.confidence) - q.score.total), 0) / qs.length;
  return Math.max(0, Math.round(100 - err * 12));
}

export function finalGrade(sessions: SessionRecord[]): { grade: string; avg: number } {
  const qs = sessions.flatMap((s) => s.questions);
  const avg = qs.reduce((a, q) => a + q.score.total, 0) / Math.max(1, qs.length);
  const cal = calibration(qs);
  let g = Math.round(18 + (avg / 10) * 12 + (cal - 50) / 25);
  g = Math.max(18, Math.min(31, g));
  return { grade: g === 31 ? "30 cum laude" : `${g}/30`, avg: Math.round(avg * 10) / 10 };
}

/** Weakest topics or declared gaps, for the President. */
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
  /\b(unfair|not fair|again|why (me|are you)|already (did|asked|answered)|enough|protest)/.test(
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

/** Weak points of a single question, derived from the answers the student gave. */
export function diagnose(q: QuestionRecord): string[] {
  if (q.confidence === "lacuna")
    return ["Topic not attempted: gap declared, to be studied from scratch."];
  const out: string[] = [];
  const { accuracy, completeness, logic, total } = q.score;
  if (accuracy < SUFFICIENT)
    out.push(`Accuracy ${accuracy}/10: the answers miss central concepts of the topic.`);
  if (completeness < SUFFICIENT)
    out.push(
      `Completeness ${completeness}/10: answers too short. Develop definition, mechanism and example.`,
    );
  if (logic < SUFFICIENT)
    out.push(
      `Logic ${logic}/10: the steps are not connected. Make causes and consequences explicit (because, therefore, so).`,
    );
  const label = CONFIDENCE[q.confidence].label;
  if (q.confidence !== "prudente" && total < SUFFICIENT)
    out.push(`Overconfident: you declared "${label}" but scored ${total}/10.`);
  if (q.confidence === "prudente" && total >= 8)
    out.push(
      `Underconfident: you declared "${label}" and scored ${total}/10. You could have staked more.`,
    );
  return out;
}

/** A question is weak if failed, declared as a gap, or with something to flag. */
export const isWeak = (q: QuestionRecord) =>
  q.confidence === "lacuna" || q.score.total < SUFFICIENT || diagnose(q).length > 0;

/** Session report in Markdown, downloadable. */
export function sessionReportMarkdown(s: SessionRecord, title: string, date: string): string {
  const L: string[] = [];
  const course = s.questions[0]?.course;
  L.push(`# Session report: ${title}`, "");
  L.push(`- Date: ${date}`);
  if (course) L.push(`- Course: ${course}`);
  L.push(`- Examiner: ${s.examinerName}`);
  L.push(
    `- Outcome: ${s.passed ? "passed" : "not passed"} with ${s.credits} credits (threshold ${PASS_THRESHOLD})`,
  );
  L.push(`- Confidence calibration: ${calibration(s.questions)}%`, "");

  const weak = s.questions.filter(isWeak);
  L.push("## Weak points", "");
  if (!weak.length) L.push("No weak points found in this session.", "");
  for (const q of weak) {
    L.push(`### ${q.topicTitle} (${q.score.total}/10)`, "");
    for (const d of diagnose(q)) L.push(`- ${d}`);
    if (q.missed?.length) L.push(`- Concepts not covered: ${q.missed.join(", ")}.`);
    if (q.feedback) L.push("", `**Examiner's feedback.** ${q.feedback}`);
    L.push("", `**What you should have said.** ${q.model}`, "");
  }

  L.push("## Question details", "");
  for (const q of s.questions) {
    const conf = q.confidence === "lacuna" ? "Gap declared" : CONFIDENCE[q.confidence].label;
    L.push(`### ${q.topicTitle}`, "");
    L.push(
      `Stated confidence: ${conf}. Score ${q.score.total}/10 (accuracy ${q.score.accuracy}, completeness ${q.score.completeness}, logic ${q.score.logic}). Credits ${q.delta >= 0 ? "+" : ""}${q.delta}.`,
      "",
    );
    for (const t of q.transcript)
      L.push(`> **${t.role === "prof" ? q.examiner : "Student"}:** ${t.text}`, ">");
    L.pop();
    L.push("");
  }
  L.push("---", reportDisclaimer(s), "");
  return L.join("\n");
}

/** States how the analysis was produced: AI evaluator or keywords. */
export function reportDisclaimer(s: SessionRecord): string {
  return s.questions.some((q) => q.ai)
    ? "Analysis generated by an AI model from the transcript of your answers: it can be wrong, it points to what to review and does not replace a teacher's judgement."
    : "Automatic analysis based on the key syllabus concepts found in your answers: it points to what to review and does not replace a teacher's judgement.";
}
