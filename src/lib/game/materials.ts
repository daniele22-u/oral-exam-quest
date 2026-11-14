import type { Topic } from "./data";

/**
 * Course materials as they would arrive from the learning platform: for each lecture a
 * recording, its transcript and, sometimes, notes and audio. Here they are simulated from the
 * syllabus topics: no file is actually downloaded.
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
  video: "Recording",
  audio: "Audio",
  appunti: "Notes",
  trascrizione: "Transcript",
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
      { kind: "video", name: `Lecture_${nn}_${slug(t.title)}.mp4`, detail: `${minutes} min` },
      {
        kind: "trascrizione",
        name: `Lecture_${nn}_transcript.txt`,
        detail: `${minutes * 130} words`,
      },
    ];
    if (i % 2 === 0)
      sources.push({
        kind: "appunti",
        name: `Notes_${nn}.pdf`,
        detail: `${6 + ((i * 5) % 9)} pages`,
      });
    if (i % 3 === 1)
      sources.push({ kind: "audio", name: `Office_hours_${nn}.mp3`, detail: `${18 + i * 3} min` });
    return { topicId: t.id, n, title: t.title, sources };
  });
}

export function countSources(lessons: Lesson[]): Record<SourceKind, number> {
  const out: Record<SourceKind, number> = { video: 0, audio: 0, appunti: 0, trascrizione: 0 };
  for (const l of lessons) for (const s of l.sources) out[s.kind]++;
  return out;
}
