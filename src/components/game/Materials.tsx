import { useState } from "react";
import type { QuestionRecord } from "@/lib/game/engine";
import { SOURCE_LABEL, countSources, type SourceKind } from "@/lib/game/materials";
import { Icon } from "./Art";
import type { CourseOption } from "./Onboarding";

/**
 * Scheda Materiali: le lezioni del corso con le loro fonti e, per ciascuna, quanto è andata
 * l'ultima interrogazione. Da qui si cambia corso o se ne aggiunge uno a mano.
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
  /** Argomenti riconosciuti nella materia inserita a mano. */
  customCount: number;
  /** Tutte le domande sostenute finora, in ordine di tempo. */
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
      <h2 className="font-display text-5xl leading-none">Materiali</h2>
      <p className="mt-2 text-muted-foreground">
        {linked
          ? "Importati da WeBeep (simulazione). Ogni lezione è un possibile argomento d'esame."
          : "Programma di esempio. Collega i servizi dal profilo per importare i tuoi corsi."}
      </p>

      <div className="mt-5 flex flex-wrap gap-2" role="radiogroup" aria-label="Corso">
        {[
          ...courses.map((c) => [c.id, c.title] as const),
          ["custom", "Materia a mano"] as const,
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
            <span className="eyebrow text-muted-foreground">Nome del corso</span>
            <input
              className="field"
              value={custom.name}
              onChange={(e) => setCustom({ ...custom, name: e.target.value })}
            />
          </label>
          <label className="grid gap-1">
            <span className="eyebrow text-muted-foreground">Argomenti, uno per riga</span>
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
            {customCount} {customCount === 1 ? "argomento riconosciuto" : "argomenti riconosciuti"}
            {customCount >= 3 ? " · pronto per l'esame" : " · ne servono almeno 3"}
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
            <h3 className="font-display text-3xl leading-none">Lezioni</h3>
            <span className="text-sm text-muted-foreground">
              {asked}/{lessons.length} già interrogate
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
                          Fonti: {l.sources.map((s) => SOURCE_LABEL[s.kind]).join(", ")}
                        </span>
                      </span>
                    </span>
                    <span className="w-20 shrink-0 text-right">
                      {score === null ? (
                        <span className="text-xs text-muted-foreground">Da fare</span>
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
