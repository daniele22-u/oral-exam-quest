import type { Topic } from "./data";

/**
 * Materiali del corso così come arriverebbero dalla piattaforma didattica: per ogni lezione una
 * registrazione, la sua trascrizione e, a volte, appunti e audio. Qui sono simulati a partire
 * dagli argomenti del programma: nessun file viene scaricato davvero.
 */
export type SourceKind = "video" | "audio" | "appunti" | "trascrizione";

export interface Source {
  kind: SourceKind;
  name: string;
  detail: string;
}
export interface Lesson {
  topicId: string;
  n: number;
  title: string;
  sources: Source[];
}

export const SOURCE_LABEL: Record<SourceKind, string> = {
  video: "Registrazione",
  audio: "Audio",
  appunti: "Appunti",
  trascrizione: "Trascrizione",
};

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 28);

export function lessonsFor(topics: Topic[]): Lesson[] {
  return topics.map((t, i) => {
    const n = i + 1;
    const nn = String(n).padStart(2, "0");
    const minutes = 70 + ((i * 17) % 35);
    const sources: Source[] = [
      { kind: "video", name: `Lezione_${nn}_${slug(t.title)}.mp4`, detail: `${minutes} min` },
      {
        kind: "trascrizione",
        name: `Lezione_${nn}_trascrizione.txt`,
        detail: `${minutes * 130} parole`,
      },
    ];
    if (i % 2 === 0)
      sources.push({
        kind: "appunti",
        name: `Appunti_${nn}.pdf`,
        detail: `${6 + ((i * 5) % 9)} pagine`,
      });
    if (i % 3 === 1)
      sources.push({ kind: "audio", name: `Ricevimento_${nn}.mp3`, detail: `${18 + i * 3} min` });
    return { topicId: t.id, n, title: t.title, sources };
  });
}

export function countSources(lessons: Lesson[]): Record<SourceKind, number> {
  const out: Record<SourceKind, number> = { video: 0, audio: 0, appunti: 0, trascrizione: 0 };
  for (const l of lessons) for (const s of l.sources) out[s.kind]++;
  return out;
}
