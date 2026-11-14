import { useEffect, useMemo, useRef, useState } from "react";
import {
  CONFIDENCE,
  COURSES,
  EXAMINERS,
  PRESIDENT,
  TOPICS,
  type Confidence,
  type Examiner,
  type Topic,
} from "@/lib/game/data";
import {
  START_CREDITS,
  PASS_THRESHOLD,
  REQUIRED_SESSIONS,
  scoreAnswers,
  keywordCoverage,
  missedConcepts,
  diagnose,
  isWeak,
  sessionReportMarkdown,
  reportDisclaimer,
  withTotal,
  creditDelta,
  calibration,
  finalGrade,
  weakestTopics,
  isProtest,
  shuffle,
  type QuestionRecord,
  type SessionRecord,
  type Turn,
} from "@/lib/game/engine";
import { aiStatus, evaluateAnswers, examinerSay } from "@/lib/game/ai";
import { Portrait, type Mood, type Who } from "./Portrait";
import { QuestMap } from "./QuestMap";
import { Mic } from "./Mic";
import { useSpeaker } from "./useSpeaker";
import { Coins, GapBars, Heart, Pulse } from "./Vitals";
import { lessonsFor } from "@/lib/game/materials";
import { Icon } from "./Art";
import { Materials } from "./Materials";
import { Onboarding, type CourseOption, type Profile } from "./Onboarding";
import { ProfileSheet, TabBar, TopBar, type Tab } from "./Shell";
import { Student } from "./QuestMap";

type Phase = "onboarding" | "hub" | "materials" | "session" | "debrief" | "report";

/** "Session N" counting preliminary sessions only, or "Plenary Board". */
function sessionTitle(sessions: SessionRecord[], s: SessionRecord): string {
  if (s.examiner === "presidente") return "Plenary Board";
  const n = sessions.filter((x) => x.examiner !== "presidente").findIndex((x) => x.id === s.id);
  return `Session ${n + 1}`;
}
interface Live {
  examiner: Examiner | null;
  isBoss: boolean;
  topics: Topic[];
  bossNotes: Record<string, string>;
  idx: number;
  credits: number;
  step: "declare" | "dialog" | "result";
  conf: Confidence | "lacuna" | null;
  transcript: Turn[];
  answers: string[];
  asked: number;
  followUps?: string[];
  records: QuestionRecord[];
}
const KEY = "commissione-v1";
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)] as T;

function customTopics(course: string, list: string): Topic[] {
  return list
    .split(/[\n,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((t, i) => ({
      id: `cu-${i}-${t}`,
      course,
      title: t,
      question: `Walk me through "${t}": definition, fundamental principles and an applied example.`,
      keywords: t
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .concat(["defin", "example", "applic", "principle"]),
      followUps: [
        `What are the main limits of ${t}?`,
        `How would you connect ${t} to other topics in the course?`,
        "Give me a counterexample.",
        "Which assumption is crucial in what you said?",
      ],
      model: `A model answer on "${t}" should include a rigorous definition, the principles it rests on, at least one applied example and its limits of validity. (Demo mode: with the AI examiner enabled the explanation is generated from the actual exchange.)`,
    }));
}

export default function Game() {
  const [phase, setPhase] = useState<Phase>("onboarding");
  const [course, setCourse] = useState<string>(COURSES[0]);
  const [custom, setCustom] = useState({ name: "", topics: "" });
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [live, setLive] = useState<Live | null>(null);
  const [lastOutcome, setLastOutcome] = useState<SessionRecord | null>(null);

  // Voice variant (the examiner speaks, the student answers by microphone): requires the AI.
  const [voicePref, setVoicePref] = useState(false);
  // Onboarding: (simulated) connected services and whether it has been completed.
  const [profile, setProfile] = useState<Profile>({ polimi: false, webeep: false, done: false });
  const [sheet, setSheet] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  // Splash: shown from the first paint until the record is read and a short minimum has passed.
  const [splash, setSplash] = useState(true);
  useEffect(() => {
    const quick = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setTimeout(() => setSplash(false), quick ? 400 : 1500);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (s) {
        const saved: SessionRecord[] = Array.isArray(s.sessions) ? s.sessions : [];
        setSessions(saved);
        if (typeof s.course === "string") setCourse(s.course);
        if (s.custom)
          setCustom({ name: String(s.custom.name ?? ""), topics: String(s.custom.topics ?? "") });
        setVoicePref(s.voice === true);
        const done = s.profile?.done === true || saved.length > 0 || !!s.live;
        setProfile({
          polimi: s.profile?.polimi === true,
          webeep: s.profile?.webeep === true,
          done,
        });
        // An interrupted session (reload, closed tab) resumes where it left off.
        if (s.live?.topics?.[s.live.idx] && Array.isArray(s.live.records)) {
          setLive(s.live);
          setPhase("session");
        } else if (done) setPhase("hub");
      }
    } catch {
      /* unreadable record: start from scratch */
    }
    setHydrated(true);
  }, []);
  // Save only after the initial read, so the record is not overwritten with the empty state.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ sessions, course, custom, live, voice: voicePref, profile }),
      );
    } catch {
      /* storage full or denied */
    }
  }, [hydrated, sessions, course, custom, live, voicePref, profile]);

  const pool = useMemo(
    () =>
      course === "custom"
        ? customTopics(custom.name || "Custom course", custom.topics)
        : TOPICS.filter((t) => t.course === course),
    [course, custom],
  );
  const courses: CourseOption[] = useMemo(
    () =>
      COURSES.map((c) => ({
        id: c,
        title: c,
        lessons: lessonsFor(TOPICS.filter((t) => t.course === c)),
      })),
    [],
  );
  const courseTitle = course === "custom" ? custom.name || "Custom course" : course;
  const prelim = sessions.filter((s) => s.examiner !== "presidente");
  const passed = prelim.filter((s) => s.passed);
  const boss = sessions.find((s) => s.examiner === "presidente" && s.passed);
  const [debriefId, setDebriefId] = useState<string | null>(null);
  // AI examiner available only if the server has a key: otherwise demo mode.
  const [ai, setAi] = useState(false);
  const voice = ai && voicePref;
  useEffect(() => {
    aiStatus()
      .then((r) => setAi(r.enabled))
      .catch(() => setAi(false));
  }, []);
  const debrief = sessions.find((s) => s.id === debriefId);
  // Changing screen scrolls back to the top, like opening a new page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [phase]);

  function startSession(isBoss: boolean) {
    let topics: Topic[];
    const notes: Record<string, string> = {};
    if (isBoss) {
      const weak = weakestTopics(prelim, 3);
      topics = weak
        .map((w) => pool.find((t) => t.id === w.topicId) || TOPICS.find((t) => t.id === w.topicId))
        .filter(Boolean) as Topic[];
      weak.forEach((w) => {
        notes[w.topicId] =
          w.confidence === "lacuna"
            ? `I read in your record that with ${w.examiner} you declared a gap on "${w.topicTitle}". A learning debt is settled here, today.`
            : `I know full well that with ${w.examiner} you wavered on "${w.topicTitle}" (${w.score.total}/10). I am giving you the chance to redeem yourself.`;
      });
      if (topics.length < 3)
        topics = [...topics, ...shuffle(pool.filter((t) => !topics.includes(t)))].slice(0, 3);
    } else topics = shuffle(pool).slice(0, 3);
    setLive({
      examiner: isBoss ? null : pick(EXAMINERS),
      isBoss,
      topics,
      bossNotes: notes,
      idx: 0,
      credits: START_CREDITS,
      step: "declare",
      conf: null,
      transcript: [],
      answers: [],
      asked: 0,
      records: [],
    });
    setPhase("session");
  }

  function endSession(l: Live) {
    const rec: SessionRecord = {
      id: crypto.randomUUID(),
      examiner: l.isBoss ? "presidente" : l.examiner!.id,
      examinerName: l.isBoss ? PRESIDENT.name : l.examiner!.name,
      credits: l.credits,
      passed: l.credits >= PASS_THRESHOLD,
      questions: l.records,
      date: new Date().toISOString(),
    };
    setSessions((s) => [...s, rec]);
    setLastOutcome(rec);
    setLive(null);
    setDebriefId(rec.id);
    setPhase("debrief");
  }

  /** Leaving a session in progress discards it: ask first. */
  function leaveTo(target: Phase) {
    if (phase === "session" && live) {
      if (!confirm("Leave the session in progress? It will not be saved to your record.")) return;
      setLive(null);
    }
    setPhase(target);
  }

  if (!hydrated || splash) return <Splash />;

  if (phase === "onboarding")
    return (
      <div className="academy-bg text-foreground">
        <Onboarding
          courses={courses}
          course={course === "custom" ? COURSES[0] : course}
          setCourse={setCourse}
          profile={profile}
          setProfile={setProfile}
          onDone={() => {
            setProfile((p) => ({ ...p, done: true }));
            setPhase("hub");
          }}
        />
      </div>
    );

  // During a session tabs and profile disappear: only the exam remains.
  if (phase === "session" && live)
    return (
      <div className="min-h-dvh academy-bg text-foreground">
        <Session
          live={live}
          setLive={setLive}
          onEnd={endSession}
          onQuit={() => leaveTo("hub")}
          ai={ai}
          voice={voice}
        />
      </div>
    );

  const tab: Tab | null =
    phase === "hub" || phase === "materials" || phase === "report" ? phase : null;
  return (
    <div className="min-h-dvh academy-bg text-foreground">
      <TopBar
        passed={Math.min(passed.length, REQUIRED_SESSIONS)}
        required={REQUIRED_SESSIONS}
        onProfile={() => setSheet(true)}
      />
      <div className="mx-auto max-w-6xl md:grid md:grid-cols-[200px_minmax(0,1fr)] md:gap-8 md:px-6">
        <TabBar current={tab} onSelect={(t) => setPhase(t)} />
        <main className="px-4 pb-28 pt-6 md:px-0 md:pb-12 md:pt-8">
          {phase === "hub" && (
            <Hub
              passed={passed.length}
              boss={!!boss}
              last={lastOutcome}
              course={courseTitle}
              first={sessions.length === 0}
              ready={pool.length >= 3}
              onSession={() => startSession(false)}
              onBoss={() => startSession(true)}
              onReport={() => setPhase("report")}
              onMaterials={() => setPhase("materials")}
            />
          )}
          {phase === "materials" && (
            <Materials
              courses={courses}
              course={course}
              setCourse={setCourse}
              custom={custom}
              setCustom={setCustom}
              customCount={course === "custom" ? pool.length : 0}
              questions={sessions.flatMap((x) => x.questions)}
              linked={profile.webeep}
            />
          )}
          {phase === "debrief" && debrief && (
            <Debrief
              session={debrief}
              title={sessionTitle(sessions, debrief)}
              onNext={() =>
                setPhase(debrief.examiner === "presidente" && debrief.passed ? "report" : "hub")
              }
              nextLabel={
                debrief.examiner === "presidente" && debrief.passed
                  ? "Read the final report"
                  : "Back to the path"
              }
            />
          )}
          {phase === "report" && (
            <Report
              sessions={sessions}
              onDebrief={(id) => {
                setDebriefId(id);
                setPhase("debrief");
              }}
            />
          )}
        </main>
      </div>
      {sheet && (
        <ProfileSheet
          onClose={() => setSheet(false)}
          profile={profile}
          ai={ai}
          voice={voicePref}
          setVoice={setVoicePref}
          course={courseTitle}
          onConnect={() => {
            setSheet(false);
            setPhase("onboarding");
          }}
          onReset={() => {
            if (confirm("Delete your record and start over?")) {
              setSessions([]);
              setLastOutcome(null);
              setSheet(false);
              setPhase("hub");
            }
          }}
        />
      )}
    </div>
  );
}

/** Opening screen: the beating pixel heart and the logo while the app gets ready. */
function Splash() {
  return (
    <div
      role="status"
      aria-label="Loading Oral Exam Quest"
      className="splash academy-bg text-foreground"
    >
      <div className="anim-beat">
        <Heart size={132} />
      </div>
      <div className="quest-logo anim-slide mt-6 text-center text-6xl md:text-8xl">
        Oral Exam
        <em>Quest</em>
      </div>
      <p className="mt-5 font-display text-2xl leading-none text-muted-foreground">
        Know how much you know.
      </p>
      <div className="splash-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function Hub({
  passed,
  boss,
  last,
  course,
  first,
  ready,
  onSession,
  onBoss,
  onReport,
  onMaterials,
}: {
  passed: number;
  boss: boolean;
  last: SessionRecord | null;
  course: string;
  /** No session taken yet: show how it works. */
  first: boolean;
  /** The syllabus has enough topics to draw a session. */
  ready: boolean;
  onSession: () => void;
  onBoss: () => void;
  onReport: () => void;
  onMaterials: () => void;
}) {
  const unlocked = passed >= REQUIRED_SESSIONS;
  const numerals = ["I", "II", "III", "IV", "V"];
  const next = boss
    ? {
        title: "Exam passed",
        text: "The final report is in your record.",
        cta: "Read the report",
        go: onReport,
      }
    : unlocked
      ? {
          title: "Plenary Board",
          text: "The President brings back your weak points. No passing: you answer everything.",
          cta: "Face the President",
          go: onBoss,
        }
      : {
          title: `Session ${numerals[passed] ?? passed + 1}`,
          text: "A randomly drawn examiner and three topics from your syllabus.",
          cta: first ? "Start your first session" : "Start the session",
          go: onSession,
        };
  return (
    <section className="anim-slide">
      {last && (
        <div
          role="status"
          className={`panel mb-6 flex items-center gap-3 border-l-4 p-4 ${last.passed ? "border-l-quest-green" : "border-l-destructive"}`}
        >
          {last.passed && <Icon name="check" size={32} />}
          <div>
            <div className="font-display text-2xl leading-none">
              {last.passed ? "Session passed" : "Session not passed"} · {last.credits} credits
            </div>
            <div className="text-sm text-muted-foreground">
              {last.examinerName}
              {last.passed ? "" : " · the weak topics stay in your record, you can try again"}
            </div>
          </div>
        </div>
      )}

      <div className="panel hero-card">
        <div className="min-w-0">
          <button className="pill" onClick={onMaterials} aria-label={`Course: ${course}. Change`}>
            <Icon name="book" size={18} />
            {course}
          </button>
          <h2 className="mt-4 font-display text-5xl leading-none md:text-6xl">{next.title}</h2>
          <p className="mt-2 max-w-md text-muted-foreground">{next.text}</p>
          {!boss && (
            <ul className="mt-4 flex flex-wrap gap-2 text-sm">
              <li className="fact">
                <Icon name="book" size={18} />3 topics
              </li>
              <li className="fact">
                <Heart size={16} />
                {START_CREDITS} credits, {PASS_THRESHOLD} to pass
              </li>
              <li className="fact">
                <Icon name="bubble" size={18} />
                about 10 minutes
              </li>
            </ul>
          )}
          {ready ? (
            <button className="btn-main mt-6 w-full md:w-auto" onClick={next.go}>
              {next.cta}
            </button>
          ) : (
            <button className="btn-ghost mt-6 w-full md:w-auto" onClick={onMaterials}>
              Add at least 3 topics
            </button>
          )}
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="anim-float">
            <Icon name={boss ? "check" : unlocked ? "crown" : "door"} size={96} />
          </div>
          <Student size={80} />
        </div>
      </div>

      <h3 className="mt-8 font-display text-3xl leading-none">Your path</h3>
      <div className="mt-3">
        <QuestMap
          required={REQUIRED_SESSIONS}
          passed={passed}
          bossPassed={boss}
          onEnter={unlocked ? onBoss : onSession}
        />
      </div>

      {first && (
        <>
          <h3 className="mt-8 font-display text-3xl leading-none">How it works</h3>
          <ol className="mt-3 grid gap-3 md:grid-cols-3">
            <li className="panel how-card">
              <Coins n={3} />
              <b>Bet on your confidence</b>
              <span>The more coins you risk, the more credits you win. Or lose.</span>
            </li>
            <li className="panel how-card">
              <Icon name="bubble" size={36} />
              <b>Answer the examiner</b>
              <span>They press you with follow-up questions.</span>
            </li>
            <li className="panel how-card">
              <Icon name="crown" size={36} />
              <b>Face the President</b>
              <span>
                After {REQUIRED_SESSIONS} sessions, the President returns to your weak points.
              </span>
            </li>
          </ol>
        </>
      )}

      {unlocked && !boss && ready && (
        <button className="btn-ghost mt-8 w-full md:w-auto" onClick={onSession}>
          Practice session
        </button>
      )}
    </section>
  );
}

function Session({
  live,
  setLive: commit,
  onEnd,
  onQuit,
  ai,
  voice,
}: {
  live: Live;
  setLive: (l: Live) => void;
  onEnd: (l: Live) => void;
  /** Leave the session (asks for confirmation). */
  onQuit: () => void;
  ai: boolean;
  /** Voice variant: the examiner speaks and the student can answer by microphone. */
  voice: boolean;
}) {
  const [input, setInput] = useState("");
  // Waiting for the AI examiner: the answer just sent stays visible but is not saved yet,
  // so a reload mid-wait does not leave the session in an incomplete state.
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  // Portrait expression and the line just spoken (the only one shown with the typewriter effect).
  const [mood, setMood] = useState<Mood>("neutral");
  const [fresh, setFresh] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  // After a wait the session may have been abandoned: in that case it must not be restored.
  const setLive = (l: Live) => {
    if (mounted.current) commit(l);
  };
  const endRef = useRef<HTMLDivElement>(null);
  const topic = live.topics[live.idx]!;
  const ex = live.examiner;
  const profName = ex ? ex.name : PRESIDENT.name;
  const maxFU = live.conf && live.conf !== "lacuna" ? CONFIDENCE[live.conf].followUps : 0;
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [live.transcript.length, pending, busy]);

  /** The AI examiner's line, or the preset text if the AI is unavailable. */
  async function profLine(
    kind: "open" | "followup",
    conf: Confidence,
    transcript: Turn[],
    remaining: number,
    fallback: string,
    fallbackMood: Mood,
  ): Promise<string> {
    const say = (text: string, m: Mood) => {
      if (mounted.current) {
        setMood(m);
        setFresh(text);
      }
      return text;
    };
    if (!ai) return say(fallback, fallbackMood);
    try {
      const note = live.bossNotes[topic.id];
      const r = await examinerSay({
        data: {
          kind,
          course: topic.course,
          topicTitle: topic.title,
          transcript,
          baseQuestion: topic.question,
          examinerName: profName,
          examinerTrait: ex
            ? ex.trait
            : "Authoritative, strict but fair; knows the student's record.",
          isBoss: live.isBoss,
          ...(note ? { bossNote: note } : {}),
          confidence: conf,
          remaining,
        },
      });
      return r.ok ? say(r.text, r.mood) : say(fallback, fallbackMood);
    } catch {
      return say(fallback, fallbackMood);
    }
  }

  async function declare(conf: Confidence | "lacuna") {
    // No way out in front of the Plenary Board: a gap can only be declared in preliminary sessions.
    if (conf === "lacuna" && live.isBoss) return;
    if (conf === "lacuna") {
      setMood("neutral");
      setFresh(null);
      const score = { accuracy: 0, completeness: 0, logic: 0, total: 0 };
      const t: Turn[] = [
        { role: "prof", text: topic.question },
        { role: "student", text: "I declare a gap on this topic." },
        {
          role: "prof",
          text: live.isBoss
            ? "I appreciate the honesty, but this was the moment to settle the debt. Noted."
            : "Noted. I am recording it as a learning debt in your record.",
        },
      ];
      const rec: QuestionRecord = {
        topicId: topic.id,
        topicTitle: topic.title,
        course: topic.course,
        confidence: "lacuna",
        transcript: t,
        score,
        delta: creditDelta(score, "lacuna"),
        model: topic.model,
        examiner: profName,
      };
      setLive({
        ...live,
        conf,
        transcript: t,
        step: "result",
        credits: live.credits + rec.delta,
        records: [...live.records, rec],
      });
      return;
    }
    const intro = live.isBoss
      ? (live.bossNotes[topic.id] || "Let us look at this topic.") + " "
      : pick(ex!.open) + " ";
    const pressure =
      conf === "senzarete"
        ? live.isBoss
          ? " And since you declare yourself without a safety net, I will concede nothing."
          : " " + pick(ex!.doubt)
        : "";
    setBusy("The examiner is preparing the question…");
    const opening = await profLine(
      "open",
      conf,
      [],
      0,
      intro + topic.question + pressure,
      conf === "senzarete" ? "stern" : "neutral",
    );
    setBusy(null);
    // Follow-ups are drawn at random: replaying the same topic does not repeat the same sequence.
    setLive({
      ...live,
      conf,
      step: "dialog",
      transcript: [{ role: "prof", text: opening }],
      answers: [],
      asked: 0,
      followUps: shuffle(topic.followUps),
    });
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const conf = live.conf as Confidence;
    setInput("");
    const t: Turn[] = [...live.transcript, { role: "student", text }];
    if (live.isBoss && isProtest(text)) {
      t.push({
        role: "prof",
        text: pick([
          "Protesting will not give you back the points you lost. The record is clear: answer.",
          "The board does not revisit topics out of cruelty but out of fairness. Go on.",
          "I will take that as a sign of nerves. Back to the substance, please.",
        ]),
      });
      setMood("stern");
      setFresh(t[t.length - 1]!.text);
      setLive({ ...live, transcript: t });
      return;
    }
    const answers = [...live.answers, text];
    const followUps = live.followUps?.length ? live.followUps : topic.followUps;
    if (live.asked < maxFU) {
      const partial = scoreAnswers([text], topic).accuracy;
      const prefix = live.isBoss
        ? partial >= 5
          ? "Better than last time. But:"
          : "I expected more, given the precedent. So:"
        : partial >= 5
          ? pick(ex!.praise) + " " + (live.conf === "senzarete" ? pick(ex!.doubt) : "")
          : pick(ex!.push);
      setPending(text);
      setBusy(`${profName} is weighing your answer…`);
      const line = await profLine(
        "followup",
        conf,
        t,
        maxFU - live.asked - 1,
        `${prefix} ${followUps[live.asked % followUps.length]}`,
        partial >= 5 ? "pleased" : "stern",
      );
      setBusy(null);
      setPending(null);
      t.push({ role: "prof", text: line });
      setLive({ ...live, transcript: t, answers, asked: live.asked + 1 });
      return;
    }
    // Final evaluation: AI on the whole transcript, falling back to keywords.
    let score = scoreAnswers(answers, topic);
    let verdict: Pick<QuestionRecord, "coverage" | "missed" | "feedback" | "ai" | "model"> = {
      coverage: keywordCoverage(answers, topic),
      missed: missedConcepts(answers, topic),
      model: topic.model,
    };
    if (ai) {
      setPending(text);
      setBusy("The board is deliberating…");
      try {
        const r = await evaluateAnswers({
          data: { course: topic.course, topicTitle: topic.title, transcript: t },
        });
        if (r.ok) {
          score = withTotal(r.accuracy, r.completeness, r.logic);
          verdict = {
            missed: r.missed,
            feedback: r.feedback,
            ai: true,
            model: r.model || topic.model,
          };
        }
      } catch {
        /* keep the keyword-based evaluation */
      }
      setBusy(null);
      setPending(null);
    }
    const delta = creditDelta(score, conf);
    setMood(score.total >= 6 ? "pleased" : "stern");
    t.push({
      role: "prof",
      text:
        score.total >= 6
          ? "Good. We can consider this topic passed."
          : "That is not sufficient. I am noting the gaps that emerged.",
    });
    setFresh(t[t.length - 1]!.text);
    const rec: QuestionRecord = {
      topicId: topic.id,
      topicTitle: topic.title,
      course: topic.course,
      confidence: conf,
      transcript: t,
      score,
      delta,
      examiner: profName,
      ...verdict,
    };
    setLive({
      ...live,
      transcript: t,
      answers,
      step: "result",
      credits: live.credits + delta,
      records: [...live.records, rec],
    });
  }

  function next() {
    if (live.idx + 1 >= live.topics.length) return onEnd(live);
    setMood("neutral");
    setFresh(null);
    setLive({
      ...live,
      idx: live.idx + 1,
      step: "declare",
      conf: null,
      transcript: [],
      answers: [],
      asked: 0,
      followUps: [],
    });
  }
  const last = live.records[live.records.length - 1];
  const who: Who = live.isBoss ? "presidente" : ex!.id;
  const lastProf = live.transcript.map((m) => m.role).lastIndexOf("prof");
  // Voice: every new examiner line is read aloud; switching to "Text" stops it.
  const { speak, stop, state: speech, failed: mute } = useSpeaker();
  useEffect(() => {
    if (voice && fresh) void speak(fresh, who, mood);
    else stop();
    // Only a new line or a mode change should restart the voice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh, voice]);
  // Heartbeat: rises with the declared stake, with the President and when credits drop.
  const stake = live.conf && live.conf !== "lacuna" ? CONFIDENCE[live.conf].mult * 18 : 0;
  const bpm = Math.min(
    180,
    68 +
      (live.step === "result" ? 0 : stake) +
      (live.isBoss ? 16 : 0) +
      Math.max(0, START_CREDITS - live.credits) +
      (live.step === "dialog" ? live.asked * 4 : 0),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 pb-6 pt-3 md:px-6">
      <div className="flex items-center gap-3">
        <button className="icon-btn" onClick={onQuit} aria-label="Leave the session">
          ✕
        </button>
        <ol
          className="flex flex-1 gap-1.5"
          aria-label={`Topic ${live.idx + 1} of ${live.topics.length}`}
        >
          {live.topics.map((t, i) => (
            <li
              key={t.id}
              className={`step-seg ${
                i < live.idx || (i === live.idx && live.step === "result")
                  ? "step-seg-on"
                  : i === live.idx
                    ? "step-seg-now"
                    : ""
              }`}
            />
          ))}
        </ol>
        <span className="stat-chip">
          <Heart size={18} />
          <span className="sr-only">Trust Credits:</span>
          {live.credits}
        </span>
      </div>
      <section className="mt-4 grid gap-4 md:grid-cols-[260px_minmax(0,1fr)] md:gap-6">
        <aside className="panel h-fit p-3 md:p-5">
          <div className="flex items-center gap-3 md:block">
            <div className="md:hidden">
              <Portrait who={who} mood={mood} name={profName} size={56} />
            </div>
            <div className="mb-4 hidden md:block">
              <Portrait who={who} mood={mood} name={profName} size={128} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="eyebrow text-pop">{live.isBoss ? PRESIDENT.title : ex!.title}</div>
              <div className="font-display text-2xl leading-none md:mt-1">{profName}</div>
              <p className="mt-2 hidden text-sm text-muted-foreground md:block">
                {live.isBoss ? "Has your complete record on the desk." : ex!.trait}
              </p>
            </div>
          </div>
          <div className="mt-3 md:mt-6 md:border-t-2 md:border-ink/15 md:pt-4">
            <div className="hidden md:block">
              <div className="eyebrow text-muted-foreground">Trust Credits</div>
              <div className="font-display text-6xl leading-none">{live.credits}</div>
            </div>
            <div
              className="meter md:mt-2"
              style={
                {
                  "--fill":
                    live.credits >= PASS_THRESHOLD
                      ? "var(--quest-green)"
                      : live.credits >= START_CREDITS
                        ? "var(--quest-yellow)"
                        : "var(--quest-red)",
                } as React.CSSProperties
              }
            >
              <div
                className="meter-grow"
                style={{
                  width: `${Math.min(100, Math.max(0, (live.credits / PASS_THRESHOLD) * 100))}%`,
                }}
              />
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {live.credits} credits · {PASS_THRESHOLD} to pass
            </div>
          </div>
          <div className="mt-3 md:mt-4 md:border-t-2 md:border-ink/15 md:pt-4">
            <div className="mb-1 hidden eyebrow text-muted-foreground md:block">Tension</div>
            <Pulse bpm={bpm} />
          </div>
        </aside>

        <div className="panel flex min-h-[55dvh] flex-col p-4 md:min-h-[560px] md:p-6">
          <div className="eyebrow text-muted-foreground">{topic.course}</div>
          <h2 className="font-display text-3xl leading-none">{topic.title}</h2>

          {live.step === "declare" && (
            <div className="mt-6">
              {live.isBoss && live.bossNotes[topic.id] && (
                <p className="mb-4 border-l-4 border-quest-yellow pl-4 font-display text-xl leading-none">
                  «{live.bossNotes[topic.id]}»
                </p>
              )}
              <p className="text-muted-foreground">
                Before hearing the question, declare how confident you are on this topic.
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {(Object.keys(CONFIDENCE) as Confidence[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => declare(c)}
                    disabled={!!busy}
                    className="panel anim-pop p-4 text-left disabled:pointer-events-none disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-3xl leading-none">
                        {CONFIDENCE[c].label}
                      </span>
                      <Coins n={CONFIDENCE[c].mult} />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{CONFIDENCE[c].desc}</div>
                    <div className="mt-3 text-xs">
                      ×{CONFIDENCE[c].mult} credits · −{CONFIDENCE[c].penalty} if insufficient ·{" "}
                      {CONFIDENCE[c].followUps} follow-ups
                    </div>
                  </button>
                ))}
              </div>
              {live.isBoss ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  In front of the President there is no passing on a topic: you must answer every
                  question.
                </p>
              ) : (
                <button
                  onClick={() => declare("lacuna")}
                  disabled={!!busy}
                  className="btn-ghost mt-4 w-full disabled:pointer-events-none disabled:opacity-50"
                >
                  Pass on this topic · declare a gap (−2 credits)
                </button>
              )}
              {busy && (
                <div className="mt-4">
                  <Busy text={busy} />
                </div>
              )}
            </div>
          )}

          {live.step !== "declare" && (
            <>
              <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
                {live.transcript.map((m, i) =>
                  i === lastProf ? (
                    // The examiner's current line: dialogue box with portrait.
                    <div key={i} className="dialog-box">
                      <Portrait who={who} mood={mood} name={profName} size={72} />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 eyebrow text-pop">{profName}</div>
                        {m.text === fresh ? <Typewriter text={m.text} /> : m.text}
                        {voice && (
                          <button
                            className="mt-2 flex min-h-11 items-center eyebrow text-pop underline disabled:no-underline disabled:opacity-60"
                            disabled={speech === "loading"}
                            onClick={() =>
                              speech === "playing" ? stop() : void speak(m.text, who, mood)
                            }
                          >
                            {speech === "loading"
                              ? "Preparing the voice…"
                              : speech === "playing"
                                ? "■ Stop the voice"
                                : "▶ Listen again"}
                          </button>
                        )}
                        {voice && mute && (
                          <p role="status" className="text-sm text-destructive">
                            Voice unavailable right now (service limit reached): carry on reading,
                            or try again shortly.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      key={i}
                      className={`bubble max-w-[85%] ${m.role === "prof" ? "" : "bubble-me ml-auto"}`}
                    >
                      <div className="mb-1 eyebrow text-muted-foreground">
                        {m.role === "prof" ? profName : "Student"}
                      </div>
                      {m.text}
                    </div>
                  ),
                )}
                {pending && (
                  <div className="bubble bubble-me ml-auto max-w-[85%]">
                    <div className="mb-1 eyebrow text-muted-foreground">Student</div>
                    {pending}
                  </div>
                )}
                {busy && <Busy text={busy} />}
                <div ref={endRef} />
              </div>
              {live.step === "dialog" && (
                <div className="mt-4">
                  <div className="mb-2 text-xs text-muted-foreground">
                    Confidence: {CONFIDENCE[live.conf as Confidence].label} · follow-up {live.asked}
                    /{maxFU}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <textarea
                      autoFocus
                      aria-label="Your answer"
                      disabled={!!busy}
                      className="field min-h-20 min-w-48 flex-1"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={voice ? "Speak or type your answer…" : "Answer the examiner…"}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                    />
                    {voice && (
                      <div className="self-end">
                        <Mic
                          disabled={!!busy}
                          onText={(t) => setInput((v) => (v.trim() ? `${v.trim()} ${t}` : t))}
                        />
                      </div>
                    )}
                    <button
                      className="btn-main self-end disabled:opacity-40"
                      disabled={!input.trim() || !!busy}
                      onClick={send}
                    >
                      Answer
                    </button>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Enter to answer · Shift+Enter for a new line
                  </div>
                </div>
              )}
              {live.step === "result" && last && (
                <div
                  className={`result-sheet anim-slide ${last.score.total >= 6 ? "result-good" : "result-bad"}`}
                >
                  <div className="mb-3 flex items-center gap-2 font-display text-4xl leading-none">
                    {last.score.total >= 6 && <Icon name="check" size={32} />}
                    {last.confidence === "lacuna"
                      ? "Gap declared"
                      : last.score.total >= 6
                        ? "Sufficient answer"
                        : "Insufficient answer"}
                  </div>
                  <div className="flex flex-wrap items-end gap-6">
                    <ScoreBars s={last.score} />
                    <GapBars q={last} />
                    <div
                      className={`font-display text-5xl leading-none ${last.delta >= 0 ? "text-[var(--green-ink)]" : "text-destructive"}`}
                    >
                      {last.delta >= 0 ? "+" : ""}
                      {last.delta}
                    </div>
                    <button className="btn-main w-full md:ml-auto md:w-auto" onClick={next}>
                      {live.idx + 1 >= live.topics.length ? "Close the session" : "Next topic"}
                    </button>
                  </div>
                  <Coverage q={last} />
                  {last.feedback && (
                    <div className="mt-3 border-2 border-ink p-4 text-sm">
                      <div className="eyebrow text-pop">Examiner's assessment</div>
                      <p className="mt-1 leading-relaxed">{last.feedback}</p>
                    </div>
                  )}
                  <details className="mt-3 rounded-md bg-secondary p-4 text-sm">
                    <summary className="cursor-pointer eyebrow text-pop">Model answer</summary>
                    <p className="mt-2 leading-relaxed">{last.model}</p>
                  </details>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function ScoreBars({ s }: { s: QuestionRecord["score"] }) {
  return (
    <div className="grid min-w-56 gap-1 text-xs">
      {(
        [
          ["Accuracy", s.accuracy],
          ["Completeness", s.completeness],
          ["Logic", s.logic],
        ] as const
      ).map(([l, v]) => (
        <div key={l} className="flex items-center gap-2">
          <span className="w-24 text-muted-foreground">{l}</span>
          <div className="meter meter-sm flex-1">
            <div style={{ width: `${v * 10}%` }} />
          </div>
          <span className="w-6 text-right">{v}</span>
        </div>
      ))}
      <div className="mt-1 font-semibold">Total {s.total}/10</div>
    </div>
  );
}

/**
 * Text that appears one character at a time, as in role-playing game dialogue. A tap completes
 * it at once; with "reduce motion" on it appears whole. Screen reader users always get the
 * full sentence, not the fragments.
 */
function Typewriter({ text }: { text: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(text.length);
      return;
    }
    setN(0);
    const id = window.setInterval(() => {
      setN((v) => {
        if (v >= text.length) window.clearInterval(id);
        return Math.min(text.length, v + 2);
      });
    }, 24);
    return () => window.clearInterval(id);
  }, [text]);
  const done = n >= text.length;
  return (
    <div onClick={() => setN(text.length)} className={done ? "" : "cursor-pointer"}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, n)}
        {!done && <span className="caret" />}
      </span>
    </div>
  );
}

function Busy({ text }: { text: string }) {
  return (
    <div role="status" className="flex items-center gap-2 text-sm italic text-muted-foreground">
      <span className="inline-block h-2.5 w-2.5 animate-pulse bg-quest-red" />
      {text}
    </div>
  );
}

function Coverage({ q }: { q: QuestionRecord }) {
  if (!q.coverage || q.confidence === "lacuna") return null;
  return (
    <p className="mt-3 text-xs text-muted-foreground">
      Key syllabus concepts covered:{" "}
      <b className="text-foreground">
        {q.coverage.hit} of {q.coverage.total}
      </b>
    </p>
  );
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** End-of-session report: weak points derived from the answers given, downloadable. */
function Debrief({
  session: s,
  title,
  onNext,
  nextLabel,
}: {
  session: SessionRecord;
  title: string;
  onNext: () => void;
  nextLabel: string;
}) {
  const weak = s.questions.filter(isWeak);
  const strong = s.questions.filter((q) => !isWeak(q));
  const date = new Date(s.date ?? Date.now());
  const save = () =>
    download(
      `report-${title.toLowerCase().replace(/\s+/g, "-")}-${date.toISOString().slice(0, 10)}.md`,
      sessionReportMarkdown(s, title, date.toLocaleDateString("en-GB")),
    );
  return (
    <section className="anim-slide">
      <div className={`panel debrief-hero ${s.passed ? "result-good" : "result-bad"}`}>
        <div className="anim-pop">
          <Portrait
            who={s.examiner as Who}
            mood={s.passed ? "pleased" : "stern"}
            name={s.examinerName}
            size={96}
          />
        </div>
        <div className="min-w-0">
          <div className="eyebrow text-muted-foreground">
            {title} · {s.examinerName}
          </div>
          <h2 className="stamp anim-pop mt-1">{s.passed ? "Passed" : "Not passed"}</h2>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Stat label="Sufficient topics" value={`${strong.length} / ${s.questions.length}`} big />
        <Stat label="Trust Credits" value={`${s.credits} / ${PASS_THRESHOLD}`} />
        <Stat label="Confidence calibration" value={`${calibration(s.questions)}%`} />
      </div>

      <h3 className="mt-10 font-display text-3xl leading-none">Weak points</h3>
      {weak.length === 0 && (
        <p className="mt-3 text-muted-foreground">No weak points found in this session.</p>
      )}
      <div className="mt-4 space-y-4">
        {weak.map((q, i) => (
          <div key={i} className="panel border-l-4 border-l-destructive p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="font-display text-2xl leading-none">{q.topicTitle}</div>
              <div className="text-sm text-muted-foreground">
                {q.confidence === "lacuna" ? "Gap declared" : CONFIDENCE[q.confidence].label} ·{" "}
                {q.score.total}/10
              </div>
            </div>
            <div className="mt-4">
              <GapBars q={q} />
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {diagnose(q).map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            {q.feedback && (
              <p className="mt-3 border-l-4 border-quest-yellow pl-4 text-sm leading-relaxed">
                {q.feedback}
              </p>
            )}
            {q.missed && q.missed.length > 0 && (
              <div className="mt-4">
                <div className="eyebrow text-muted-foreground">
                  {q.ai ? "Missing or wrong concepts" : "Concepts you did not cover"}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {q.missed.map((m) => (
                    <span key={m} className="chip">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 rounded-md bg-secondary p-4 text-sm">
              <div className="eyebrow text-pop">What you should have said</div>
              <p className="mt-1 leading-relaxed">{q.model}</p>
            </div>
          </div>
        ))}
      </div>

      {strong.length > 0 && (
        <>
          <h3 className="mt-10 font-display text-3xl leading-none">Solid topics</h3>
          <ul className="mt-3 space-y-1 text-sm">
            {strong.map((q, i) => (
              <li key={i}>
                <b>{q.topicTitle}</b>{" "}
                <span className="text-muted-foreground">· {q.score.total}/10</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-8 text-xs text-muted-foreground">{reportDisclaimer(s)}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="btn-main" onClick={save}>
          Download the report
        </button>
        <button className="btn-ghost" onClick={onNext}>
          {nextLabel}
        </button>
      </div>
    </section>
  );
}

function Report({
  sessions,
  onDebrief,
}: {
  sessions: SessionRecord[];
  onDebrief: (id: string) => void;
}) {
  const qs = sessions.flatMap((s) => s.questions);
  const { grade, avg } = finalGrade(sessions);
  const cal = calibration(qs);
  const debts = qs.filter((q) => q.confidence === "lacuna");
  // A debt is settled if the same topic was later answered with a sufficient result.
  const lastTry = new Map(qs.map((q) => [q.topicId, q]));
  const openDebts = [...new Map(debts.map((q) => [q.topicId, q])).values()].filter((q) => {
    const l = lastTry.get(q.topicId)!;
    return l.confidence === "lacuna" || l.score.total < 6;
  });
  const final = sessions.some((s) => s.examiner === "presidente" && s.passed);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="anim-slide">
      <h2 className="font-display text-5xl leading-none">
        {final ? "Final exam report" : "Record"}
      </h2>
      {!final && (
        <p className="mt-2 text-muted-foreground">Provisional: updated after every session.</p>
      )}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Stat label={final ? "Final grade" : "Estimated grade"} value={grade} big />
        <Stat label="Confidence calibration" value={`${cal}%`} />
        <Stat label="Topic average" value={`${avg}/10`} />
        <Stat label="Open learning debts" value={String(openDebts.length)} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Calibration measures how closely your declared confidence matched your actual performance:
        100% means knowing exactly how much you know.
      </p>
      {openDebts.length > 0 && (
        <div className="panel mt-8 border-l-4 border-l-destructive p-5">
          <div className="eyebrow text-muted-foreground">To review</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {openDebts.map((q) => (
              <li key={q.topicId}>
                <b>{q.topicTitle}</b>{" "}
                <span className="text-muted-foreground">· gap declared with {q.examiner}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {sessions.length === 0 && (
        <p className="mt-8 text-muted-foreground">
          Your record is still empty: take your first session.
        </p>
      )}
      <h3 className="mt-10 font-display text-3xl leading-none">History</h3>
      <ol className="mt-4 space-y-6 border-l-4 border-ink/30 pl-6">
        {sessions.map((s) => (
          <li key={s.id}>
            <div className="font-display text-2xl leading-none">
              {sessionTitle(sessions, s)} · {s.examinerName}{" "}
              <span
                className={`text-sm ${s.passed ? "text-[var(--green-ink)]" : "text-destructive"}`}
              >
                ({s.passed ? "passed" : "not passed"}, {s.credits} credits)
              </span>{" "}
              <button
                className="eyebrow text-muted-foreground underline hover:text-pop"
                onClick={() => onDebrief(s.id)}
              >
                Report
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {s.questions.map((q, qi) => {
                const k = `${s.id}-${qi}`;
                return (
                  <div key={k} className="panel">
                    <button
                      aria-expanded={open === k}
                      className="flex w-full items-center justify-between gap-4 p-4 text-left"
                      onClick={() => setOpen(open === k ? null : k)}
                    >
                      <span>
                        <b>{q.topicTitle}</b>{" "}
                        <span className="text-xs text-muted-foreground">
                          ·{" "}
                          {q.confidence === "lacuna"
                            ? "Gap declared"
                            : CONFIDENCE[q.confidence].label}
                        </span>
                      </span>
                      <span
                        className={q.delta >= 0 ? "text-[var(--green-ink)]" : "text-destructive"}
                      >
                        {q.score.total}/10 · {q.delta >= 0 ? "+" : ""}
                        {q.delta}
                      </span>
                    </button>
                    {open === k && (
                      <div className="space-y-4 border-t-2 border-ink/15 p-4 text-sm">
                        <ScoreBars s={q.score} />
                        <Coverage q={q} />
                        <div className="space-y-2">
                          {q.transcript.map((m, i) => (
                            <p key={i}>
                              <span
                                className={`eyebrow ${m.role === "prof" ? "text-pop" : "text-muted-foreground"}`}
                              >
                                {m.role === "prof" ? q.examiner : "Student"}
                              </span>
                              <br />
                              {m.text}
                            </p>
                          ))}
                        </div>
                        <div className="rounded-md bg-secondary p-4">
                          <div className="eyebrow text-pop">Model answer</div>
                          <p className="mt-1">{q.model}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
const Stat = ({ label, value, big }: { label: string; value: string; big?: boolean }) => (
  <div className={`panel p-5 ${big ? "panel-on" : ""}`}>
    <div className="eyebrow text-muted-foreground">{label}</div>
    <div className="mt-2 font-display text-4xl leading-none">{value}</div>
  </div>
);
