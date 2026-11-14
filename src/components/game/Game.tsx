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
import { DungeonMap } from "./Dungeon";

type Phase = "home" | "setup" | "hub" | "session" | "debrief" | "report";

/** "Seduta N" contando le sole preliminari, oppure "Commissione Plenaria". */
function sessionTitle(sessions: SessionRecord[], s: SessionRecord): string {
  if (s.examiner === "presidente") return "Commissione Plenaria";
  const n = sessions.filter((x) => x.examiner !== "presidente").findIndex((x) => x.id === s.id);
  return `Seduta ${n + 1}`;
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
      question: `Mi illustri l'argomento "${t}": definizione, principi fondamentali e un esempio applicativo.`,
      keywords: t
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .concat(["defin", "esempio", "applica", "principio"]),
      followUps: [
        `Quali sono i limiti principali di ${t}?`,
        `Come collegherebbe ${t} ad altri argomenti del corso?`,
        "Mi faccia un controesempio.",
        "Quale ipotesi è cruciale in quello che ha detto?",
      ],
      model: `Una risposta modello su "${t}" dovrebbe includere una definizione rigorosa, i principi su cui si fonda, almeno un esempio applicativo e i limiti di validità. (Modalità demo: collegando Lovable AI la spiegazione viene generata sul programma reale.)`,
    }));
}

export default function Game() {
  const [phase, setPhase] = useState<Phase>("home");
  const [course, setCourse] = useState<string>(COURSES[0]);
  const [custom, setCustom] = useState({ name: "", topics: "" });
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [live, setLive] = useState<Live | null>(null);
  const [lastOutcome, setLastOutcome] = useState<SessionRecord | null>(null);

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (s) {
        const saved: SessionRecord[] = Array.isArray(s.sessions) ? s.sessions : [];
        setSessions(saved);
        if (typeof s.course === "string") setCourse(s.course);
        if (s.custom)
          setCustom({ name: String(s.custom.name ?? ""), topics: String(s.custom.topics ?? "") });
        // Una seduta interrotta (ricarica, chiusura della scheda) riprende da dove era rimasta.
        if (s.live?.topics?.[s.live.idx] && Array.isArray(s.live.records)) {
          setLive(s.live);
          setPhase("session");
        } else if (saved.length) setPhase("hub");
      }
    } catch {
      /* fascicolo illeggibile: si riparte da zero */
    }
    setHydrated(true);
  }, []);
  // Si salva solo dopo la lettura iniziale, per non sovrascrivere il fascicolo con lo stato vuoto.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ sessions, course, custom, live }));
    } catch {
      /* storage pieno o negato */
    }
  }, [hydrated, sessions, course, custom, live]);

  const pool = useMemo(
    () =>
      course === "custom"
        ? customTopics(custom.name || "Materia personalizzata", custom.topics)
        : TOPICS.filter((t) => t.course === course),
    [course, custom],
  );
  const prelim = sessions.filter((s) => s.examiner !== "presidente");
  const passed = prelim.filter((s) => s.passed);
  const boss = sessions.find((s) => s.examiner === "presidente" && s.passed);
  const [debriefId, setDebriefId] = useState<string | null>(null);
  // Esaminatore AI disponibile solo se il server ha una chiave: altrimenti modalità demo.
  const [ai, setAi] = useState(false);
  useEffect(() => {
    aiStatus()
      .then((r) => setAi(r.enabled))
      .catch(() => setAi(false));
  }, []);
  const debrief = sessions.find((s) => s.id === debriefId);

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
            ? `Leggo nel fascicolo che con ${w.examiner} ha dichiarato una lacuna su "${w.topicTitle}". Un debito formativo si salda qui, oggi.`
            : `So bene che con ${w.examiner} ha tentennato su "${w.topicTitle}" (${w.score.total}/10). Le do l'occasione di riscattarsi.`;
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

  /** Uscire da una seduta in corso la annulla: lo si chiede prima. */
  function leaveTo(target: Phase) {
    if (phase === "session" && live) {
      if (!confirm("Abbandonare la seduta in corso? Non verrà registrata nel fascicolo.")) return;
      setLive(null);
    }
    setPhase(target);
  }

  return (
    <div className="min-h-screen academy-bg text-foreground">
      <header className="border-b-4 border-border bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 px-6 py-2">
          <button
            onClick={() => leaveTo("home")}
            className="flex min-h-11 items-center font-display text-lg text-brass"
          >
            Commissione
          </button>
          <nav className="flex flex-wrap items-center justify-end gap-x-5 text-muted-foreground">
            <span
              className={`eyebrow ${ai ? "text-brass" : ""}`}
              title={
                ai
                  ? "Domande e valutazione generate da un modello AI"
                  : "Domande predefinite e valutazione a parole chiave"
              }
            >
              {ai ? "Esaminatore AI" : "Modalità demo"}
            </span>
            <span className="eyebrow">
              Sedute {Math.min(passed.length, REQUIRED_SESSIONS)}/{REQUIRED_SESSIONS}
            </span>
            <button
              className="nav-link"
              aria-current={phase === "home" ? "page" : undefined}
              onClick={() => leaveTo("home")}
            >
              Home
            </button>
            {sessions.length > 0 && (
              <>
                <button
                  className="nav-link"
                  aria-current={phase === "hub" ? "page" : undefined}
                  onClick={() => leaveTo("hub")}
                >
                  Percorso
                </button>
                <button
                  className="nav-link"
                  aria-current={phase === "report" ? "page" : undefined}
                  onClick={() => leaveTo("report")}
                >
                  Fascicolo
                </button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        {phase === "home" && (
          <Home
            resume={sessions.length > 0}
            onStart={() => setPhase(sessions.length ? "hub" : "setup")}
          />
        )}
        {phase === "setup" && (
          <Setup
            course={course}
            setCourse={setCourse}
            custom={custom}
            setCustom={setCustom}
            count={pool.length}
            onGo={() => setPhase("hub")}
          />
        )}
        {phase === "hub" && (
          <Hub
            passed={passed.length}
            boss={!!boss}
            last={lastOutcome}
            course={course === "custom" ? custom.name || "Materia personalizzata" : course}
            onSession={() => startSession(false)}
            onBoss={() => startSession(true)}
            onReport={() => setPhase("report")}
            onSetup={() => setPhase("setup")}
            onReset={() => {
              if (confirm("Cancellare il fascicolo e ricominciare?")) {
                setSessions([]);
                setLastOutcome(null);
                setPhase("home");
              }
            }}
          />
        )}
        {phase === "session" && live && (
          <Session live={live} setLive={setLive} onEnd={endSession} ai={ai} />
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
                ? "Leggi il verbale finale"
                : "Torna al percorso"
            }
          />
        )}
        {phase === "report" && (
          <Report
            sessions={sessions}
            onBack={() => setPhase("hub")}
            onDebrief={(id) => {
              setDebriefId(id);
              setPhase("debrief");
            }}
          />
        )}
      </main>
    </div>
  );
}

function Home({ onStart, resume }: { onStart: () => void; resume: boolean }) {
  return (
    <section className="py-12 text-center">
      <p className="eyebrow text-brass">Simulatore d'esame orale</p>
      <h1 className="mt-6 font-display text-3xl leading-snug md:text-5xl">
        Non basta sapere.
        <br />
        <em className="not-italic text-brass">Devi sapere quanto sai.</em>
      </h1>
      <p className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground">
        Supera tre sedute preliminari con esaminatori estratti a sorte, dichiara la tua sicurezza
        prima di ogni risposta e affronta infine il Presidente di Commissione, che conosce ogni tuo
        tentennamento.
      </p>
      <div className="mx-auto mt-12 grid max-w-3xl gap-4 text-left md:grid-cols-3">
        {[
          [
            "I",
            "Dichiara",
            "Prudente, Solido o Senza Rete: più ti esponi, più crediti, più domande incalzanti.",
          ],
          [
            "II",
            "Sostieni",
            "2–4 domande di approfondimento per ogni argomento, valutate su accuratezza, completezza e logica.",
          ],
          [
            "III",
            "Riscattati",
            "Il Presidente ripropone esattamente le tue lacune. Poi, il verbale.",
          ],
        ].map(([n, t, d]) => (
          <div key={n} className="panel p-5">
            <div className="font-display text-xl text-brass">{n}</div>
            <div className="mt-2 font-semibold">{t}</div>
            <p className="mt-1 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>
      <button onClick={onStart} className="btn-brass mt-12">
        {resume ? "Riprendi il percorso" : "Entra in aula"}
      </button>
    </section>
  );
}

interface Custom {
  name: string;
  topics: string;
}
function Setup({
  course,
  setCourse,
  custom,
  setCustom,
  count,
  onGo,
}: {
  course: string;
  setCourse: (c: string) => void;
  custom: Custom;
  setCustom: (c: Custom) => void;
  count: number;
  onGo: () => void;
}) {
  const ok = count >= 3;
  return (
    <section className="mx-auto max-w-2xl">
      <h2 className="font-display text-2xl">Programma d'esame</h2>
      <p className="mt-2 text-muted-foreground">
        Gli argomenti di ogni seduta vengono estratti a sorte da questo programma.
      </p>
      <div className="mt-8 grid gap-3">
        {[...COURSES, "custom"].map((c) => (
          <button
            key={c}
            onClick={() => setCourse(c)}
            className={`panel p-4 text-left transition ${course === c ? "panel-on" : ""}`}
          >
            <div className="font-display text-base">
              {c === "custom" ? "Materia personalizzata" : c}
            </div>
            <div className="text-sm text-muted-foreground">
              {c === "custom"
                ? "Inserisci il nome del corso e almeno 3 argomenti."
                : TOPICS.filter((t) => t.course === c)
                    .map((t) => t.title)
                    .join(" · ")}
            </div>
          </button>
        ))}
      </div>
      {course === "custom" && (
        <div className="mt-4 grid gap-3">
          <input
            className="field"
            placeholder="Nome del corso"
            value={custom.name}
            onChange={(e) => setCustom({ ...custom, name: e.target.value })}
          />
          <textarea
            className="field min-h-28"
            placeholder="Argomenti, uno per riga"
            value={custom.topics}
            onChange={(e) => setCustom({ ...custom, topics: e.target.value })}
          />
          <div className={`text-xs ${ok ? "text-muted-foreground" : "text-destructive"}`}>
            {count} {count === 1 ? "argomento riconosciuto" : "argomenti riconosciuti"}
            {ok ? "" : " · ne servono almeno 3"}
          </div>
        </div>
      )}
      <div className="panel mt-6 p-4 text-sm text-muted-foreground">
        Regole: ogni seduta parte da <b className="text-brass">{START_CREDITS} Crediti Fiducia</b> e
        si convalida con almeno <b className="text-brass">{PASS_THRESHOLD}</b>. Servono{" "}
        {REQUIRED_SESSIONS} sedute convalidate per accedere alla Commissione Plenaria.
      </div>
      <button disabled={!ok} onClick={onGo} className="btn-brass mt-8 disabled:opacity-40">
        Conferma programma
      </button>
    </section>
  );
}

function Hub({
  passed,
  boss,
  last,
  course,
  onSession,
  onBoss,
  onReport,
  onSetup,
  onReset,
}: {
  passed: number;
  boss: boolean;
  last: SessionRecord | null;
  course: string;
  onSession: () => void;
  onBoss: () => void;
  onReport: () => void;
  onSetup: () => void;
  onReset: () => void;
}) {
  const unlocked = passed >= REQUIRED_SESSIONS;
  return (
    <section>
      {last && (
        <div
          className={`panel mb-8 border-l-4 p-5 ${last.passed ? "border-l-brass" : "border-l-destructive"}`}
        >
          <div className="eyebrow text-muted-foreground">
            Esito ultima seduta · {last.examinerName}
          </div>
          <div className="mt-1 font-display text-lg">
            {last.passed ? "Seduta convalidata" : "Seduta non convalidata"} — {last.credits} crediti
          </div>
          {!last.passed && (
            <p className="text-sm text-muted-foreground">
              Gli argomenti critici restano nel fascicolo. Può ripresentarsi quando vuole.
            </p>
          )}
        </div>
      )}
      <h2 className="font-display text-2xl">Il percorso verso il verbale</h2>
      <p className="mt-1 text-muted-foreground">
        {course} ·{" "}
        <button className="underline hover:text-brass" onClick={onSetup}>
          cambia programma
        </button>
      </p>
      <div className="mt-8">
        <DungeonMap
          required={REQUIRED_SESSIONS}
          passed={passed}
          bossPassed={boss}
          onEnter={unlocked ? onBoss : onSession}
        />
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        {!unlocked && (
          <button className="btn-brass" onClick={onSession}>
            Estrai una seduta
          </button>
        )}
        {unlocked && !boss && (
          <button className="btn-brass" onClick={onBoss}>
            Presentati al Presidente
          </button>
        )}
        {boss && (
          <button className="btn-brass" onClick={onReport}>
            Leggi il verbale finale
          </button>
        )}
        {unlocked && (
          <button className="btn-ghost" onClick={onSession}>
            Seduta di allenamento
          </button>
        )}
        <button className="btn-ghost" onClick={onReset}>
          Ricomincia da capo
        </button>
      </div>
    </section>
  );
}

function Session({
  live,
  setLive: commit,
  onEnd,
  ai,
}: {
  live: Live;
  setLive: (l: Live) => void;
  onEnd: (l: Live) => void;
  ai: boolean;
}) {
  const [input, setInput] = useState("");
  // In attesa dell'esaminatore AI: la risposta appena inviata resta visibile ma non è ancora
  // salvata, così una ricarica a metà attesa non lascia la seduta in uno stato incompleto.
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  // Espressione del ritratto e battuta appena pronunciata (l'unica che compare a macchina da scrivere).
  const [mood, setMood] = useState<Mood>("neutral");
  const [fresh, setFresh] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  // Dopo un'attesa la seduta può essere stata abbandonata: in quel caso non va ripristinata.
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

  /** Battuta dell'esaminatore AI, oppure il testo predefinito se l'AI non è disponibile. */
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
          examinerTrait: ex ? ex.trait : "Autorevole, severo ma giusto; conosce il fascicolo.",
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
    if (conf === "lacuna") {
      setMood(live.isBoss ? "stern" : "neutral");
      setFresh(null);
      const score = { accuracy: 0, completeness: 0, logic: 0, total: 0 };
      const t: Turn[] = [
        { role: "prof", text: topic.question },
        { role: "student", text: "Dichiaro una lacuna su questo argomento." },
        {
          role: "prof",
          text: live.isBoss
            ? "Le riconosco l'onestà, ma era il momento di saldare il debito. Annoto."
            : "Prendo atto. Lo registro come debito formativo nel suo fascicolo.",
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
      ? (live.bossNotes[topic.id] || "Vediamo questo argomento.") + " "
      : pick(ex!.open) + " ";
    const pressure =
      conf === "senzarete"
        ? live.isBoss
          ? " E visto che si dichiara senza rete, non le concederò nulla."
          : " " + pick(ex!.doubt)
        : "";
    setBusy("L'esaminatore formula la domanda…");
    const opening = await profLine(
      "open",
      conf,
      [],
      0,
      intro + topic.question + pressure,
      conf === "senzarete" ? "stern" : "neutral",
    );
    setBusy(null);
    // Gli approfondimenti vengono estratti a sorte: rigiocare lo stesso argomento non ripete la stessa sequenza.
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
          "Protestare non le restituisce i punti persi. Il fascicolo parla chiaro: risponda.",
          "Giovanotto, la commissione non ripete gli argomenti per crudeltà ma per giustizia. Prosegua.",
          "Lo prendo come un segno di nervosismo. Torniamo al merito, prego.",
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
          ? "Meglio di allora. Ma:"
          : "Mi aspettavo di più, considerato il precedente. Allora:"
        : partial >= 5
          ? pick(ex!.praise) + " " + (live.conf === "senzarete" ? pick(ex!.doubt) : "")
          : pick(ex!.push);
      setPending(text);
      setBusy(`${profName} sta valutando la risposta…`);
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
    // Valutazione finale: AI sulla trascrizione intera, con ripiego sulle parole chiave.
    let score = scoreAnswers(answers, topic);
    let verdict: Pick<QuestionRecord, "coverage" | "missed" | "feedback" | "ai" | "model"> = {
      coverage: keywordCoverage(answers, topic),
      missed: missedConcepts(answers, topic),
      model: topic.model,
    };
    if (ai) {
      setPending(text);
      setBusy("La commissione delibera…");
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
        /* resta la valutazione a parole chiave */
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
          ? "Va bene. Possiamo considerare l'argomento superato."
          : "Non è sufficiente. Annoto le lacune emerse.",
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

  return (
    <section className="grid gap-6 md:grid-cols-[260px_1fr]">
      <aside className="panel h-fit p-5">
        <div className="mb-4 hidden md:block">
          <Portrait who={who} mood={mood} name={profName} size={128} />
        </div>
        <div className="eyebrow text-brass">{live.isBoss ? PRESIDENT.title : ex!.title}</div>
        <div className="mt-1 font-display text-lg">{profName}</div>
        <p className="mt-2 text-sm text-muted-foreground">
          {live.isBoss ? "Ha davanti a sé il suo fascicolo completo." : ex!.trait}
        </p>
        <div className="mt-6 border-t border-brass/20 pt-4">
          <div className="eyebrow text-muted-foreground">Crediti Fiducia</div>
          <div className="font-display text-4xl text-brass">{live.credits}</div>
          <div className="meter mt-2">
            <div
              style={{
                width: `${Math.min(100, Math.max(0, (live.credits / PASS_THRESHOLD) * 100))}%`,
              }}
            />
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Soglia di convalida: {PASS_THRESHOLD}
          </div>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          Domanda {live.idx + 1} di {live.topics.length}
        </div>
      </aside>

      <div className="panel flex min-h-[560px] flex-col p-6">
        <div className="eyebrow text-muted-foreground">{topic.course}</div>
        <h2 className="font-display text-xl">{topic.title}</h2>

        {live.step === "declare" && (
          <div className="mt-6">
            {live.isBoss && live.bossNotes[topic.id] && (
              <p className="mb-4 border-l-2 border-brass pl-4 font-display text-sm">
                «{live.bossNotes[topic.id]}»
              </p>
            )}
            <p className="text-muted-foreground">
              Prima di ascoltare la domanda, dichiari il suo livello di sicurezza su questo
              argomento.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {(Object.keys(CONFIDENCE) as Confidence[]).map((c) => (
                <button
                  key={c}
                  onClick={() => declare(c)}
                  disabled={!!busy}
                  className="panel p-4 text-left transition disabled:pointer-events-none disabled:opacity-50"
                >
                  <div className="font-display text-base text-brass">{CONFIDENCE[c].label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{CONFIDENCE[c].desc}</div>
                  <div className="mt-3 text-xs">
                    ×{CONFIDENCE[c].mult} crediti · −{CONFIDENCE[c].penalty} se insufficiente ·{" "}
                    {CONFIDENCE[c].followUps} follow-up
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => declare("lacuna")}
              disabled={!!busy}
              className="btn-ghost mt-4 w-full disabled:pointer-events-none disabled:opacity-50"
            >
              Rinvio a giudizio · dichiaro una lacuna (−2 crediti)
            </button>
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
                  // La battuta corrente dell'esaminatore: riquadro di dialogo con ritratto.
                  <div key={i} className="dialog-box">
                    <Portrait who={who} mood={mood} name={profName} size={72} />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 eyebrow text-brass">{profName}</div>
                      {m.text === fresh ? <Typewriter text={m.text} /> : m.text}
                    </div>
                  </div>
                ) : (
                  <div
                    key={i}
                    className={`bubble max-w-[85%] ${m.role === "prof" ? "" : "bubble-me ml-auto"}`}
                  >
                    <div className="mb-1 eyebrow text-muted-foreground">
                      {m.role === "prof" ? profName : "Studente"}
                    </div>
                    {m.text}
                  </div>
                ),
              )}
              {pending && (
                <div className="bubble bubble-me ml-auto max-w-[85%]">
                  <div className="mb-1 eyebrow text-muted-foreground">Studente</div>
                  {pending}
                </div>
              )}
              {busy && <Busy text={busy} />}
              <div ref={endRef} />
            </div>
            {live.step === "dialog" && (
              <div className="mt-4">
                <div className="mb-2 text-xs text-muted-foreground">
                  Sicurezza: {CONFIDENCE[live.conf as Confidence].label} · approfondimento{" "}
                  {live.asked}/{maxFU}
                </div>
                <div className="flex gap-2">
                  <textarea
                    autoFocus
                    aria-label="La tua risposta"
                    disabled={!!busy}
                    className="field min-h-20 flex-1"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Risponda all'esaminatore…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                  />
                  <button
                    className="btn-brass self-end disabled:opacity-40"
                    disabled={!input.trim() || !!busy}
                    onClick={send}
                  >
                    Rispondi
                  </button>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Invio per rispondere · Maiusc+Invio per andare a capo
                </div>
              </div>
            )}
            {live.step === "result" && last && (
              <div className="mt-4 border-t border-brass/20 pt-4">
                <div className="flex flex-wrap items-end gap-6">
                  <ScoreBars s={last.score} />
                  <div
                    className={`font-display text-2xl ${last.delta >= 0 ? "text-brass" : "text-destructive"}`}
                  >
                    {last.delta >= 0 ? "+" : ""}
                    {last.delta}
                  </div>
                  <button className="btn-brass ml-auto" onClick={next}>
                    {live.idx + 1 >= live.topics.length ? "Chiudi la seduta" : "Prossimo argomento"}
                  </button>
                </div>
                <Coverage q={last} />
                {last.feedback && (
                  <div className="mt-3 rounded-md border border-brass/30 p-4 text-sm">
                    <div className="eyebrow text-brass">Giudizio dell'esaminatore</div>
                    <p className="mt-1 leading-relaxed">{last.feedback}</p>
                  </div>
                )}
                <details className="mt-3 rounded-md bg-secondary p-4 text-sm">
                  <summary className="cursor-pointer eyebrow text-brass">
                    Spiegazione modello
                  </summary>
                  <p className="mt-2 leading-relaxed">{last.model}</p>
                </details>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function ScoreBars({ s }: { s: QuestionRecord["score"] }) {
  return (
    <div className="grid min-w-56 gap-1 text-xs">
      {(
        [
          ["Accuratezza", s.accuracy],
          ["Completezza", s.completeness],
          ["Tenuta logica", s.logic],
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
      <div className="mt-1 font-semibold">Totale {s.total}/10</div>
    </div>
  );
}

/**
 * Testo che compare un carattere alla volta, come nei dialoghi dei giochi di ruolo. Un tocco lo
 * completa subito; con "riduci movimento" attivo compare intero. Chi usa uno screen reader riceve
 * sempre la frase completa, non i frammenti.
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
      <span className="inline-block h-2.5 w-2.5 animate-pulse bg-brass" />
      {text}
    </div>
  );
}

function Coverage({ q }: { q: QuestionRecord }) {
  if (!q.coverage || q.confidence === "lacuna") return null;
  return (
    <p className="mt-3 text-xs text-muted-foreground">
      Concetti chiave del programma toccati:{" "}
      <b className="text-foreground">
        {q.coverage.hit} su {q.coverage.total}
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

/** Referto di fine seduta: punti carenti ricavati dalle risposte date, scaricabile. */
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
      `referto-${title.toLowerCase().replace(/\s+/g, "-")}-${date.toISOString().slice(0, 10)}.md`,
      sessionReportMarkdown(s, title, date.toLocaleDateString("it-IT")),
    );
  return (
    <section>
      <div className="eyebrow text-brass">Referto di seduta</div>
      <h2 className="mt-2 font-display text-2xl">
        {title} · {s.examinerName}
      </h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Stat label="Esito" value={s.passed ? "Convalidata" : "Non convalidata"} big />
        <Stat label="Crediti Fiducia" value={`${s.credits} / ${PASS_THRESHOLD}`} />
        <Stat label="Calibrazione sicurezza" value={`${calibration(s.questions)}%`} />
      </div>

      <h3 className="mt-10 font-display text-xl">Punti carenti</h3>
      {weak.length === 0 && (
        <p className="mt-3 text-muted-foreground">
          Nessun punto carente rilevato in questa seduta.
        </p>
      )}
      <div className="mt-4 space-y-4">
        {weak.map((q, i) => (
          <div key={i} className="panel border-l-4 border-l-destructive p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="font-display text-lg">{q.topicTitle}</div>
              <div className="text-sm text-muted-foreground">
                {q.confidence === "lacuna" ? "Lacuna riconosciuta" : CONFIDENCE[q.confidence].label}{" "}
                · {q.score.total}/10
              </div>
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {diagnose(q).map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            {q.feedback && (
              <p className="mt-3 border-l-2 border-brass pl-4 text-sm leading-relaxed">
                {q.feedback}
              </p>
            )}
            {q.missed && q.missed.length > 0 && (
              <div className="mt-4">
                <div className="eyebrow text-muted-foreground">
                  {q.ai ? "Concetti mancanti o sbagliati" : "Concetti che non ha toccato"}
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
              <div className="eyebrow text-brass">Cosa avrebbe dovuto dire</div>
              <p className="mt-1 leading-relaxed">{q.model}</p>
            </div>
          </div>
        ))}
      </div>

      {strong.length > 0 && (
        <>
          <h3 className="mt-10 font-display text-xl">Argomenti solidi</h3>
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
        <button className="btn-brass" onClick={save}>
          Scarica il referto
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
  onBack,
  onDebrief,
}: {
  sessions: SessionRecord[];
  onBack: () => void;
  onDebrief: (id: string) => void;
}) {
  const qs = sessions.flatMap((s) => s.questions);
  const { grade, avg } = finalGrade(sessions);
  const cal = calibration(qs);
  const debts = qs.filter((q) => q.confidence === "lacuna");
  // Un debito è saldato se lo stesso argomento è stato poi sostenuto con esito sufficiente.
  const lastTry = new Map(qs.map((q) => [q.topicId, q]));
  const openDebts = [...new Map(debts.map((q) => [q.topicId, q])).values()].filter((q) => {
    const l = lastTry.get(q.topicId)!;
    return l.confidence === "lacuna" || l.score.total < 6;
  });
  const final = sessions.some((s) => s.examiner === "presidente" && s.passed);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section>
      <button className="btn-ghost" onClick={onBack}>
        ← Torna al percorso
      </button>
      <div className="mt-6 eyebrow text-brass">
        {final ? "Verbale d'esame" : "Fascicolo provvisorio"}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <Stat label={final ? "Voto finale" : "Voto stimato"} value={grade} big />
        <Stat label="Calibrazione sicurezza" value={`${cal}%`} />
        <Stat label="Media argomenti" value={`${avg}/10`} />
        <Stat label="Debiti formativi aperti" value={String(openDebts.length)} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        La calibrazione misura quanto la sicurezza dichiarata ha corrisposto alla resa reale: 100%
        significa sapere esattamente quanto si sa.
      </p>
      {openDebts.length > 0 && (
        <div className="panel mt-8 border-l-4 border-l-destructive p-5">
          <div className="eyebrow text-muted-foreground">Da ripassare</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {openDebts.map((q) => (
              <li key={q.topicId}>
                <b>{q.topicTitle}</b>{" "}
                <span className="text-muted-foreground">· lacuna dichiarata con {q.examiner}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {sessions.length === 0 && (
        <p className="mt-8 text-muted-foreground">
          Il fascicolo è ancora vuoto: sostenga la prima seduta.
        </p>
      )}
      <h3 className="mt-10 font-display text-xl">Cronologia</h3>
      <ol className="mt-4 space-y-6 border-l border-brass/30 pl-6">
        {sessions.map((s) => (
          <li key={s.id}>
            <div className="font-display text-base">
              {sessionTitle(sessions, s)} · {s.examinerName}{" "}
              <span className={`text-sm ${s.passed ? "text-brass" : "text-destructive"}`}>
                ({s.passed ? "convalidata" : "non convalidata"}, {s.credits} crediti)
              </span>{" "}
              <button
                className="eyebrow text-muted-foreground underline hover:text-brass"
                onClick={() => onDebrief(s.id)}
              >
                Referto
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
                            ? "Lacuna riconosciuta"
                            : CONFIDENCE[q.confidence].label}
                        </span>
                      </span>
                      <span className={q.delta >= 0 ? "text-brass" : "text-destructive"}>
                        {q.score.total}/10 · {q.delta >= 0 ? "+" : ""}
                        {q.delta}
                      </span>
                    </button>
                    {open === k && (
                      <div className="space-y-4 border-t border-brass/20 p-4 text-sm">
                        <ScoreBars s={q.score} />
                        <Coverage q={q} />
                        <div className="space-y-2">
                          {q.transcript.map((m, i) => (
                            <p key={i}>
                              <span
                                className={`eyebrow ${m.role === "prof" ? "text-brass" : "text-muted-foreground"}`}
                              >
                                {m.role === "prof" ? q.examiner : "Studente"}
                              </span>
                              <br />
                              {m.text}
                            </p>
                          ))}
                        </div>
                        <div className="rounded-md bg-secondary p-4">
                          <div className="eyebrow text-brass">Spiegazione modello</div>
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
  <div className={`panel p-5 ${big ? "border-brass glow" : ""}`}>
    <div className="eyebrow text-muted-foreground">{label}</div>
    <div className="mt-2 font-display text-2xl text-brass">{value}</div>
  </div>
);
