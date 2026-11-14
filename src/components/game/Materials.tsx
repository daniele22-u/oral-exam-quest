import { useState } from "react";
import type { QuestionRecord } from "@/lib/game/engine";
import { SOURCE_LABEL, countSources, type SourceKind } from "@/lib/game/materials";
import { Icon } from "./Art";
import type { CourseOption } from "./Onboarding";

/**
 * Materials tab: the course lectures with their sources and, for each, how the last
 * examination went. The course can be changed here, or one added by hand.
 */
export interface Custom {
  name: string;
  topics: string;
}
const KINDS: SourceKind[] = ["video", "trascrizione", "appunti", "audio"];

export function Materials({
  courses,
  course,
  setCourse,
  custom,
  setCustom,
  customCount,
  questions,
  linked,
}: {
  courses: CourseOption[];
  course: string;
  setCourse: (c: string) => void;
  custom: Custom;
  setCustom: (c: Custom) => void;
  /** Topics recognised in the hand-entered course. */
  customCount: number;
  /** Every question answered so far, in chronological order. */
  questions: QuestionRecord[];
  linked: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const current = courses.find((c) => c.id === course);
  const lessons = current?.lessons ?? [];
  const n = countSources(lessons);
  const last = new Map(questions.map((q) => [q.topicId, q]));
  const asked = lessons.filter((l) => last.has(l.topicId)).length;

  return (
    <section className="anim-slide">
      <h2 className="font-display text-5xl leading-none">Materials</h2>
      <p className="mt-2 text-muted-foreground">
        {linked
          ? "Imported from WeBeep (simulation). Each lecture is a possible exam topic."
          : "Sample syllabus. Connect the services from your profile to import your courses."}
      </p>

      <div className="mt-5 flex flex-wrap gap-2" role="radiogroup" aria-label="Course">
        {[
          ...courses.map((c) => [c.id, c.title] as const),
          ["custom", "Custom course"] as const,
        ].map(([id, title]) => (
          <button
            key={id}
            role="radio"
            aria-checked={course === id}
            className={`pill ${course === id ? "pill-on" : ""}`}
            onClick={() => setCourse(id)}
          >
            {title}
          </button>
        ))}
      </div>

      {course === "custom" ? (
        <div className="panel mt-6 grid gap-3 p-5">
          <label className="grid gap-1">
            <span className="eyebrow text-muted-foreground">Course name</span>
            <input
              className="field"
              value={custom.name}
              onChange={(e) => setCustom({ ...custom, name: e.target.value })}
            />
          </label>
          <label className="grid gap-1">
            <span className="eyebrow text-muted-foreground">Topics, one per line</span>
            <textarea
              className="field min-h-32"
              value={custom.topics}
              onChange={(e) => setCustom({ ...custom, topics: e.target.value })}
            />
          </label>
          <p
            role="status"
            className={`text-sm ${customCount >= 3 ? "text-[var(--green-ink)]" : "text-destructive"}`}
          >
            {customCount} {customCount === 1 ? "topic recognised" : "topics recognised"}
            {customCount >= 3 ? " · ready for the exam" : " · at least 3 needed"}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {KINDS.map((k) => (
              <div key={k} className="panel flex items-center gap-3 p-3">
                <Icon name={k} size={32} />
                <div>
                  <div className="font-display text-3xl leading-none">{n[k]}</div>
                  <div className="text-xs text-muted-foreground">{SOURCE_LABEL[k]}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-baseline justify-between">
            <h3 className="font-display text-3xl leading-none">Lectures</h3>
            <span className="text-sm text-muted-foreground">
              {asked}/{lessons.length} already examined
            </span>
          </div>
          <ul className="mt-3 grid gap-3 lg:grid-cols-2">
            {lessons.map((l) => {
              const q = last.get(l.topicId);
              const score = q ? q.score.total : null;
              const isOpen = open === l.topicId;
              return (
                <li key={l.topicId} className="panel min-w-0">
                  <button
                    className="flex w-full items-center gap-3 p-4 text-left"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : l.topicId)}
                  >
                    <span className="lesson-n" aria-hidden="true">
                      {l.n}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-2xl leading-none">{l.title}</span>
                      <span className="mt-2 flex items-center gap-2">
                        {l.sources.map((s) => (
                          <Icon key={s.name} name={s.kind} size={20} />
                        ))}
                        <span className="sr-only">
                          Sources: {l.sources.map((s) => SOURCE_LABEL[s.kind]).join(", ")}
                        </span>
                      </span>
                    </span>
                    <span className="w-20 shrink-0 text-right">
                      {score === null ? (
                        <span className="text-xs text-muted-foreground">To do</span>
                      ) : (
                        <>
                          <span className="font-display text-2xl leading-none">{score}/10</span>
                          <span
                            className="meter meter-sm mt-1 block"
                            style={
                              {
                                "--fill": score >= 6 ? "var(--quest-green)" : "var(--quest-red)",
                              } as React.CSSProperties
                            }
                          >
                            <span
                              className="block h-full"
                              style={{ width: `${score * 10}%`, background: "var(--fill)" }}
                            />
                          </span>
                        </>
                      )}
                    </span>
                  </button>
                  {isOpen && (
                    <ul className="anim-slide flex flex-col gap-1 border-t-2 border-ink/15 p-4 text-sm">
                      {l.sources.map((s) => (
                        <li key={s.name} className="flex items-center gap-2">
                          <Icon name={s.kind} size={18} />
                          <span className="min-w-0 flex-1 truncate">{s.name}</span>
                          <span className="text-muted-foreground">{s.detail}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
