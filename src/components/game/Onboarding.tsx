import { useEffect, useState } from "react";
import { SOURCE_LABEL, countSources, type Lesson, type SourceKind } from "@/lib/game/materials";
import { Icon, type IconName } from "./Art";
import { Portrait } from "./Portrait";
import { Student } from "./QuestMap";

/**
 * Onboarding: one step per screen, as in learning apps. The connection to the Politecnico
 * Online Services and to WeBeep is SIMULATED: no credentials are asked for and no request is
 * sent to those services. Every step can be skipped.
 */
export interface Profile {
  polimi: boolean;
  webeep: boolean;
  done: boolean;
}
export interface CourseOption {
  id: string;
  title: string;
  lessons: Lesson[];
}

const STEPS = ["Welcome", "Politecnico", "WeBeep", "Course", "Exam"] as const;
const KINDS: SourceKind[] = ["video", "trascrizione", "appunti", "audio"];

export function Onboarding({
  courses,
  course,
  setCourse,
  profile,
  setProfile,
  onDone,
}: {
  courses: CourseOption[];
  course: string;
  setCourse: (id: string) => void;
  profile: Profile;
  setProfile: (p: Profile) => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  // Each step is a new screen: start from the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);
  const chosen = courses.find((c) => c.id === course) ?? courses[0]!;

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5 pb-8 pt-4">
      <div className="flex items-center gap-3">
        <button
          className="icon-btn"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          aria-label="Previous step"
        >
          ←
        </button>
        <ol className="flex flex-1 gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <li key={s} className={`step-seg ${i <= step ? "step-seg-on" : ""}`}>
              <span className="sr-only">
                {s}
                {i === step ? " (current step)" : ""}
              </span>
            </li>
          ))}
        </ol>
        <button className="skip-btn" onClick={onDone}>
          Skip · demo
        </button>
      </div>

      <div
        key={step}
        className="anim-slide grid flex-1 items-center gap-8 py-8 md:grid-cols-2 md:gap-14"
      >
        <Scene step={step} lessons={chosen.lessons} />
        <div>
          {step === 0 && (
            <>
              <h1 className="quest-logo text-6xl md:text-8xl">
                Oral Exam
                <em>Quest</em>
              </h1>
              <p className="mt-6 font-display text-3xl leading-none">
                Knowing is not enough.{" "}
                <span className="text-destructive">Know how much you know.</span>
              </p>
              <p className="mt-4 text-muted-foreground">
                Connect your courses: the app reads your lectures and notes and questions you like a
                real oral exam.
              </p>
              <button className="btn-main mt-8 w-full md:w-auto" onClick={next}>
                Start
              </button>
            </>
          )}

          {step === 1 && (
            <Connect
              title="Connect Online Services"
              text="From your study plan we take the list of your courses this semester."
              tasks={["Opening the session", "Reading the study plan", "Finding active courses"]}
              result={`${courses.length} courses found`}
              connected={profile.polimi}
              onConnected={() => setProfile({ ...profile, polimi: true })}
              onNext={next}
            />
          )}

          {step === 2 && (
            <Connect
              title="Connect WeBeep"
              text="From each course we take the uploaded recordings, transcripts, audio and notes."
              tasks={["Opening the courses", "Listing the lectures", "Collecting the materials"]}
              result={`${courses.reduce((a, c) => a + c.lessons.length, 0)} lectures found`}
              connected={profile.webeep}
              onConnected={() => setProfile({ ...profile, webeep: true })}
              onNext={next}
            />
          )}

          {step === 3 && (
            <>
              <h2 className="font-display text-5xl leading-none">Which exam are you preparing?</h2>
              <p className="mt-3 text-muted-foreground">
                You can change it later in the Materials tab.
              </p>
              <div className="mt-6 grid gap-3" role="radiogroup" aria-label="Course">
                {courses.map((c) => {
                  const n = countSources(c.lessons);
                  const on = c.id === chosen.id;
                  return (
                    <button
                      key={c.id}
                      role="radio"
                      aria-checked={on}
                      onClick={() => setCourse(c.id)}
                      className={`panel flex items-center gap-4 p-4 text-left ${on ? "panel-on" : ""}`}
                    >
                      <Icon name="book" size={40} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-3xl leading-none">{c.title}</span>
                        <span className="mt-1 block text-sm text-muted-foreground">
                          {c.lessons.length} lectures · {n.video} recordings · {n.appunti} notes
                        </span>
                      </span>
                      <span
                        className={`radio-dot ${on ? "radio-dot-on" : ""}`}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
              <button className="btn-main mt-8 w-full md:w-auto" onClick={next}>
                Continue
              </button>
            </>
          )}

          {step === 4 && <Build lessons={chosen.lessons} title={chosen.title} onDone={onDone} />}
        </div>
      </div>
    </div>
  );
}

/** Step illustration: shows what is about to happen, before the text. */
function Scene({ step, lessons }: { step: number; lessons: Lesson[] }) {
  if (step === 0)
    return (
      <div className="scene" aria-hidden="true">
        <div className="flex items-end justify-center gap-6">
          <div className="anim-float">
            <Student size={112} />
          </div>
          <div className="anim-float" style={{ animationDelay: "-1.2s" }}>
            <Portrait who="severo" name="" size={128} />
          </div>
        </div>
        <div className="quest-tiles mt-3" />
      </div>
    );
  if (step === 1 || step === 2) {
    const files: IconName[] = ["video", "trascrizione", "appunti", "audio"];
    return (
      <div className="scene" aria-hidden="true">
        <div className="flex items-center justify-center gap-5">
          <div className="anim-float">
            <Icon name={step === 1 ? "campus" : "cloud"} size={120} />
          </div>
          <div className="flex flex-col gap-2">
            {(step === 1 ? (["book", "book", "book"] as IconName[]) : files).map((f, i) => (
              <div key={i} className="anim-pop" style={{ animationDelay: `${0.15 * i + 0.2}s` }}>
                <Icon name={f} size={36} />
              </div>
            ))}
          </div>
          <Student size={88} />
        </div>
        <div className="quest-tiles mt-3" />
      </div>
    );
  }
  const n = countSources(lessons);
  return (
    <div className="scene" aria-hidden="true">
      <div className="grid grid-cols-4 gap-3">
        {KINDS.map((k, i) => (
          <div
            key={k}
            className="anim-pop flex flex-col items-center gap-1"
            style={{ animationDelay: `${0.1 * i}s` }}
          >
            <Icon name={k} size={44} />
            <span className="font-display text-2xl leading-none">{n[k]}</span>
            <span className="text-center text-xs text-muted-foreground">{SOURCE_LABEL[k]}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-3 font-display text-3xl">
        <span aria-hidden="true">↓</span>
      </div>
      <div className="mt-2 flex items-end justify-center gap-4">
        <Icon name="door" size={72} />
        <Student size={72} />
      </div>
      <div className="quest-tiles mt-1" />
    </div>
  );
}

function Connect({
  title,
  text,
  tasks,
  result,
  connected,
  onConnected,
  onNext,
}: {
  title: string;
  text: string;
  tasks: string[];
  result: string;
  connected: boolean;
  onConnected: () => void;
  onNext: () => void;
}) {
  // -1 idle; from 0 up, how many operations are done.
  const [progress, setProgress] = useState(connected ? tasks.length : -1);
  useEffect(() => {
    if (progress < 0 || progress >= tasks.length) return;
    const id = window.setTimeout(() => {
      setProgress((p) => p + 1);
      if (progress + 1 >= tasks.length) onConnected();
    }, 650);
    return () => window.clearTimeout(id);
    // onConnected changes on every render: only progress matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, tasks.length]);
  const done = progress >= tasks.length;
  return (
    <>
      <span className="sim-chip">Simulation · no real sign-in</span>
      <h2 className="mt-3 font-display text-5xl leading-none">{title}</h2>
      <p className="mt-3 text-muted-foreground">{text}</p>
      <ul className="mt-6 grid gap-2" aria-live="polite">
        {tasks.map((t, i) => {
          const state = progress > i ? "ok" : progress === i ? "run" : "wait";
          return (
            <li key={t} className={`task task-${state}`}>
              <span className="task-mark" aria-hidden="true">
                {state === "ok" ? <Icon name="check" size={20} /> : state === "run" ? "…" : ""}
              </span>
              {t}
              <span className="sr-only">
                {state === "ok" ? " — done" : state === "run" ? " — in progress" : ""}
              </span>
            </li>
          );
        })}
      </ul>
      {done ? (
        <>
          <p className="anim-pop mt-5 font-display text-3xl leading-none text-[var(--green-ink)]">
            Connected · {result}
          </p>
          <button className="btn-main mt-6 w-full md:w-auto" onClick={onNext}>
            Continue
          </button>
        </>
      ) : (
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            className="btn-main w-full md:w-auto"
            disabled={progress >= 0}
            onClick={() => setProgress(0)}
          >
            {progress >= 0 ? "Connecting…" : "Connect"}
          </button>
          <button className="skip-btn" onClick={onNext} disabled={progress >= 0}>
            Skip this step
          </button>
        </div>
      )}
      <p className="mt-6 text-xs text-muted-foreground">
        Prototype: you are never asked for a password and no data leaves your device.
      </p>
    </>
  );
}

/** Last step: materials are "read" one by one and become exam topics. */
function Build({
  lessons,
  title,
  onDone,
}: {
  lessons: Lesson[];
  title: string;
  onDone: () => void;
}) {
  const files = lessons.flatMap((l) => l.sources.map((s) => s.name));
  const [i, setI] = useState(0);
  useEffect(() => {
    setI(0);
  }, [title]);
  useEffect(() => {
    if (i >= files.length) return;
    const id = window.setTimeout(() => setI((v) => v + 1), 2400 / Math.max(1, files.length));
    return () => window.clearTimeout(id);
  }, [i, files.length]);
  const done = i >= files.length;
  return (
    <>
      <h2 className="font-display text-5xl leading-none">
        {done ? "Your exam is ready" : "Preparing your exam"}
      </h2>
      <p className="mt-3 text-muted-foreground">
        Mixing notes and transcripts from <b>{title}</b>: each lecture becomes an exam topic.
      </p>
      <div
        className="meter mt-6"
        role="progressbar"
        aria-label="Reading the materials"
        aria-valuemin={0}
        aria-valuemax={files.length}
        aria-valuenow={Math.min(i, files.length)}
      >
        <div
          className="meter-grow"
          style={{ width: `${(Math.min(i, files.length) / Math.max(1, files.length)) * 100}%` }}
        />
      </div>
      <p className="mt-2 h-5 truncate text-sm text-muted-foreground" aria-hidden="true">
        {done ? `${files.length} files read` : `Reading ${files[i]}`}
      </p>
      <ul className="mt-5 flex flex-wrap gap-2" aria-label="Exam topics">
        {lessons.map((l, k) =>
          (k + 1) / lessons.length <= (i + 0.001) / Math.max(1, files.length) || done ? (
            <li key={l.topicId} className="topic-chip anim-pop">
              {l.title}
            </li>
          ) : null,
        )}
      </ul>
      <button className="btn-main mt-8 w-full md:w-auto" disabled={!done} onClick={onDone}>
        Go to the exam
      </button>
    </>
  );
}
