import { useEffect, useMemo, useRef, useState } from "react";
import { CONFIDENCE, COURSES, EXAMINERS, PRESIDENT, TOPICS, type Confidence, type Examiner, type Topic } from "@/lib/game/data";
import { START_CREDITS, PASS_THRESHOLD, REQUIRED_SESSIONS, scoreAnswers, creditDelta, calibration, finalGrade, weakestTopics, isProtest, shuffle, type QuestionRecord, type SessionRecord, type Turn } from "@/lib/game/engine";

type Phase = "home" | "setup" | "hub" | "session" | "report";
interface Live { examiner: Examiner | null; isBoss: boolean; topics: Topic[]; bossNotes: Record<string, string>; idx: number; credits: number; step: "declare" | "dialog" | "result"; conf: Confidence | "lacuna" | null; transcript: Turn[]; answers: string[]; asked: number; records: QuestionRecord[] }
const KEY = "commissione-v1";
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)] as T;

function customTopics(course: string, list: string): Topic[] {
  return list.split(/[\n,;]/).map((s) => s.trim()).filter(Boolean).map((t, i) => ({
    id: `cu-${i}-${t}`, course, title: t, question: `Mi illustri l'argomento "${t}": definizione, principi fondamentali e un esempio applicativo.`,
    keywords: t.toLowerCase().split(/\s+/).filter((w) => w.length > 3).concat(["defin", "esempio", "applica", "principio"]),
    followUps: [`Quali sono i limiti principali di ${t}?`, `Come collegherebbe ${t} ad altri argomenti del corso?`, "Mi faccia un controesempio.", "Quale ipotesi è cruciale in quello che ha detto?"],
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

  useEffect(() => { try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s) { setSessions(s.sessions); setCourse(s.course); setCustom(s.custom); if (s.sessions.length) setPhase("hub"); } } catch {} }, []);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify({ sessions, course, custom })); }, [sessions, course, custom]);

  const pool = useMemo(() => course === "custom" ? customTopics(custom.name || "Materia personalizzata", custom.topics) : TOPICS.filter((t) => t.course === course), [course, custom]);
  const passed = sessions.filter((s) => s.passed && s.examiner !== "presidente");
  const boss = sessions.find((s) => s.examiner === "presidente" && s.passed);

  function startSession(isBoss: boolean) {
    let topics: Topic[]; const notes: Record<string, string> = {};
    if (isBoss) {
      const weak = weakestTopics(passed.length ? passed : sessions, 3);
      topics = weak.map((w) => pool.find((t) => t.id === w.topicId) || TOPICS.find((t) => t.id === w.topicId)).filter(Boolean) as Topic[];
      weak.forEach((w) => { notes[w.topicId] = w.confidence === "lacuna" ? `Leggo nel fascicolo che con ${w.examiner} ha dichiarato una lacuna su "${w.topicTitle}". Un debito formativo si salda qui, oggi.` : `So bene che con ${w.examiner} ha tentennato su "${w.topicTitle}" (${w.score.total}/10). Le do l'occasione di riscattarsi.`; });
      if (topics.length < 3) topics = [...topics, ...shuffle(pool.filter((t) => !topics.includes(t)))].slice(0, 3);
    } else topics = shuffle(pool).slice(0, 3);
    setLive({ examiner: isBoss ? null : pick(EXAMINERS), isBoss, topics, bossNotes: notes, idx: 0, credits: START_CREDITS, step: "declare", conf: null, transcript: [], answers: [], asked: 0, records: [] });
    setPhase("session");
  }

  function endSession(l: Live) {
    const rec: SessionRecord = { id: crypto.randomUUID(), examiner: l.isBoss ? "presidente" : l.examiner!.id, examinerName: l.isBoss ? PRESIDENT.name : l.examiner!.name, credits: l.credits, passed: l.credits >= PASS_THRESHOLD, questions: l.records };
    setSessions((s) => [...s, rec]); setLastOutcome(rec); setLive(null);
    setPhase(l.isBoss && rec.passed ? "report" : "hub");
  }

  return (
    <div className="min-h-screen academy-bg text-foreground">
      <header className="border-b border-brass/30">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <button onClick={() => setPhase(sessions.length ? "hub" : "home")} className="font-display text-2xl tracking-wide text-brass">Commissione</button>
          <div className="flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <span>Sedute {Math.min(passed.length, REQUIRED_SESSIONS)}/{REQUIRED_SESSIONS}</span>
            {sessions.length > 0 && <button className="hover:text-brass" onClick={() => setPhase("report")}>Fascicolo</button>}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        {phase === "home" && <Home onStart={() => setPhase("setup")} />}
        {phase === "setup" && <Setup course={course} setCourse={setCourse} custom={custom} setCustom={setCustom} ok={pool.length >= 3} onGo={() => setPhase("hub")} />}
        {phase === "hub" && <Hub passed={passed.length} boss={!!boss} last={lastOutcome} course={course === "custom" ? custom.name : course}
          onSession={() => startSession(false)} onBoss={() => startSession(true)} onReport={() => setPhase("report")} onSetup={() => setPhase("setup")}
          onReset={() => { if (confirm("Cancellare il fascicolo e ricominciare?")) { setSessions([]); setLastOutcome(null); setPhase("home"); } }} />}
        {phase === "session" && live && <Session live={live} setLive={setLive} onEnd={endSession} />}
        {phase === "report" && <Report sessions={sessions} onBack={() => setPhase("hub")} />}
      </main>
    </div>
  );
}

function Home({ onStart }: { onStart: () => void }) {
  return (
    <section className="py-12 text-center">
      <p className="text-xs uppercase tracking-[0.4em] text-brass">Simulatore d'esame orale</p>
      <h1 className="mt-6 font-display text-6xl leading-tight md:text-7xl">Non basta sapere.<br /><em className="text-brass">Devi sapere quanto sai.</em></h1>
      <p className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground">Supera tre sedute preliminari con esaminatori estratti a sorte, dichiara la tua sicurezza prima di ogni risposta e affronta infine il Presidente di Commissione, che conosce ogni tuo tentennamento.</p>
      <div className="mx-auto mt-12 grid max-w-3xl gap-4 text-left md:grid-cols-3">
        {[["I", "Dichiara", "Prudente, Solido o Senza Rete: più ti esponi, più crediti, più domande incalzanti."], ["II", "Sostieni", "2–4 domande di approfondimento per ogni argomento, valutate su accuratezza, completezza e logica."], ["III", "Riscattati", "Il Presidente ripropone esattamente le tue lacune. Poi, il verbale."]].map(([n, t, d]) => (
          <div key={n} className="panel p-5"><div className="font-display text-3xl text-brass">{n}</div><div className="mt-2 font-semibold">{t}</div><p className="mt-1 text-sm text-muted-foreground">{d}</p></div>))}
      </div>
      <button onClick={onStart} className="btn-brass mt-12">Entra in aula</button>
    </section>
  );
}

function Setup({ course, setCourse, custom, setCustom, ok, onGo }: any) {
  return (
    <section className="mx-auto max-w-2xl">
      <h2 className="font-display text-4xl">Programma d'esame</h2>
      <p className="mt-2 text-muted-foreground">Gli argomenti di ogni seduta vengono estratti a sorte da questo programma.</p>
      <div className="mt-8 grid gap-3">
        {[...COURSES, "custom"].map((c) => (
          <button key={c} onClick={() => setCourse(c)} className={`panel p-4 text-left transition ${course === c ? "ring-2 ring-brass" : "hover:border-brass/60"}`}>
            <div className="font-display text-xl">{c === "custom" ? "Materia personalizzata" : c}</div>
            <div className="text-sm text-muted-foreground">{c === "custom" ? "Inserisci il nome del corso e almeno 3 argomenti." : TOPICS.filter((t) => t.course === c).map((t) => t.title).join(" · ")}</div>
          </button>))}
      </div>
      {course === "custom" && (
        <div className="mt-4 grid gap-3">
          <input className="field" placeholder="Nome del corso" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
          <textarea className="field min-h-28" placeholder="Argomenti, uno per riga" value={custom.topics} onChange={(e) => setCustom({ ...custom, topics: e.target.value })} />
        </div>)}
      <div className="panel mt-6 p-4 text-sm text-muted-foreground">Regole: ogni seduta parte da <b className="text-brass">{START_CREDITS} Crediti Fiducia</b> e si convalida con almeno <b className="text-brass">{PASS_THRESHOLD}</b>. Servono {REQUIRED_SESSIONS} sedute convalidate per accedere alla Commissione Plenaria.</div>
      <button disabled={!ok} onClick={onGo} className="btn-brass mt-8 disabled:opacity-40">Conferma programma</button>
    </section>
  );
}

function Hub({ passed, boss, last, course, onSession, onBoss, onReport, onSetup, onReset }: any) {
  const unlocked = passed >= REQUIRED_SESSIONS;
  return (
    <section>
      {last && (
        <div className={`panel mb-8 border-l-4 p-5 ${last.passed ? "border-l-brass" : "border-l-destructive"}`}>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Esito ultima seduta · {last.examinerName}</div>
          <div className="mt-1 font-display text-2xl">{last.passed ? "Seduta convalidata" : "Seduta non convalidata"} — {last.credits} crediti</div>
          {!last.passed && <p className="text-sm text-muted-foreground">Gli argomenti critici restano nel fascicolo. Può ripresentarsi quando vuole.</p>}
        </div>)}
      <h2 className="font-display text-4xl">Il percorso verso il verbale</h2>
      <p className="mt-1 text-muted-foreground">{course} · <button className="underline hover:text-brass" onClick={onSetup}>cambia programma</button></p>
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        {Array.from({ length: REQUIRED_SESSIONS }).map((_, i) => (
          <div key={i} className={`panel flex aspect-square flex-col items-center justify-center p-4 text-center ${i < passed ? "border-brass" : ""}`}>
            <div className={`seal ${i < passed ? "seal-on" : ""}`}>{["I", "II", "III"][i] ?? i + 1}</div>
            <div className="mt-3 text-sm">{i < passed ? "Convalidata" : "Seduta preliminare"}</div>
          </div>))}
        <div className={`panel flex aspect-square flex-col items-center justify-center p-4 text-center ${unlocked ? "border-brass glow" : "opacity-50"}`}>
          <div className={`seal ${boss ? "seal-on" : ""}`}>P</div>
          <div className="mt-3 text-sm">{unlocked ? "Commissione Plenaria" : "Bloccata"}</div>
        </div>
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        {!unlocked && <button className="btn-brass" onClick={onSession}>Estrai una seduta</button>}
        {unlocked && !boss && <button className="btn-brass" onClick={onBoss}>Presentati al Presidente</button>}
        {boss && <button className="btn-brass" onClick={onReport}>Leggi il verbale finale</button>}
        {unlocked && <button className="btn-ghost" onClick={onSession}>Seduta di allenamento</button>}
        <button className="btn-ghost" onClick={onReset}>Ricomincia da capo</button>
      </div>
    </section>
  );
}

function Session({ live, setLive, onEnd }: { live: Live; setLive: (l: Live) => void; onEnd: (l: Live) => void }) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const topic = live.topics[live.idx]!;
  const ex = live.examiner;
  const profName = ex ? ex.name : PRESIDENT.name;
  const maxFU = live.conf && live.conf !== "lacuna" ? CONFIDENCE[live.conf].followUps : 0;
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [live.transcript.length]);

  function declare(conf: Confidence | "lacuna") {
    if (conf === "lacuna") {
      const score = { accuracy: 0, completeness: 0, logic: 0, total: 0 };
      const t: Turn[] = [{ role: "prof", text: topic.question }, { role: "student", text: "Dichiaro una lacuna su questo argomento." }, { role: "prof", text: live.isBoss ? "Le riconosco l'onestà, ma era il momento di saldare il debito. Annoto." : "Prendo atto. Lo registro come debito formativo nel suo fascicolo." }];
      const rec: QuestionRecord = { topicId: topic.id, topicTitle: topic.title, course: topic.course, confidence: "lacuna", transcript: t, score, delta: creditDelta(score, "lacuna"), model: topic.model, examiner: profName };
      setLive({ ...live, conf, transcript: t, step: "result", credits: live.credits + rec.delta, records: [...live.records, rec] });
      return;
    }
    const intro = live.isBoss ? (live.bossNotes[topic.id] || "Vediamo questo argomento.") + " " : pick(ex!.open) + " ";
    const pressure = conf === "senzarete" ? (live.isBoss ? " E visto che si dichiara senza rete, non le concederò nulla." : " " + pick(ex!.doubt)) : "";
    setLive({ ...live, conf, step: "dialog", transcript: [{ role: "prof", text: intro + topic.question + pressure }], answers: [], asked: 0 });
  }

  function send() {
    const text = input.trim(); if (!text) return; setInput("");
    const t: Turn[] = [...live.transcript, { role: "student", text }];
    if (live.isBoss && isProtest(text)) {
      t.push({ role: "prof", text: pick(["Protestare non le restituisce i punti persi. Il fascicolo parla chiaro: risponda.", "Giovanotto, la commissione non ripete gli argomenti per crudeltà ma per giustizia. Prosegua.", "Lo prendo come un segno di nervosismo. Torniamo al merito, prego."]) });
      setLive({ ...live, transcript: t }); return;
    }
    const answers = [...live.answers, text];
    if (live.asked < maxFU) {
      const partial = scoreAnswers([text], topic).accuracy;
      const prefix = live.isBoss ? (partial >= 5 ? "Meglio di allora. Ma:" : "Mi aspettavo di più, considerato il precedente. Allora:") : partial >= 5 ? pick(ex!.praise) + " " + (live.conf === "senzarete" ? pick(ex!.doubt) : "") : pick(ex!.push);
      t.push({ role: "prof", text: `${prefix} ${topic.followUps[live.asked % topic.followUps.length]}` });
      setLive({ ...live, transcript: t, answers, asked: live.asked + 1 }); return;
    }
    const score = scoreAnswers(answers, topic);
    const delta = creditDelta(score, live.conf!);
    t.push({ role: "prof", text: score.total >= 6 ? "Va bene. Possiamo considerare l'argomento superato." : "Non è sufficiente. Annoto le lacune emerse." });
    const rec: QuestionRecord = { topicId: topic.id, topicTitle: topic.title, course: topic.course, confidence: live.conf!, transcript: t, score, delta, model: topic.model, examiner: profName };
    setLive({ ...live, transcript: t, answers, step: "result", credits: live.credits + delta, records: [...live.records, rec] });
  }

  function next() {
    if (live.idx + 1 >= live.topics.length) return onEnd(live);
    setLive({ ...live, idx: live.idx + 1, step: "declare", conf: null, transcript: [], answers: [], asked: 0 });
  }
  const last = live.records[live.records.length - 1];

  return (
    <section className="grid gap-6 md:grid-cols-[260px_1fr]">
      <aside className="panel h-fit p-5">
        <div className="text-xs uppercase tracking-[0.2em] text-brass">{live.isBoss ? PRESIDENT.title : ex!.title}</div>
        <div className="mt-1 font-display text-2xl">{profName}</div>
        <p className="mt-2 text-sm text-muted-foreground">{live.isBoss ? "Ha davanti a sé il suo fascicolo completo." : ex!.trait}</p>
        <div className="mt-6 border-t border-brass/20 pt-4">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Crediti Fiducia</div>
          <div className="font-display text-5xl text-brass">{live.credits}</div>
          <div className="mt-2 h-1.5 overflow-hidden rounded bg-muted"><div className="h-full bg-brass transition-all" style={{ width: `${Math.min(100, Math.max(0, (live.credits / PASS_THRESHOLD) * 100))}%` }} /></div>
          <div className="mt-1 text-xs text-muted-foreground">Soglia di convalida: {PASS_THRESHOLD}</div>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">Domanda {live.idx + 1} di {live.topics.length}</div>
      </aside>

      <div className="panel flex min-h-[560px] flex-col p-6">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{topic.course}</div>
        <h2 className="font-display text-3xl">{topic.title}</h2>

        {live.step === "declare" && (
          <div className="mt-6">
            {live.isBoss && live.bossNotes[topic.id] && <p className="mb-4 border-l-2 border-brass pl-4 font-display text-lg italic">«{live.bossNotes[topic.id]}»</p>}
            <p className="text-muted-foreground">Prima di ascoltare la domanda, dichiari il suo livello di sicurezza su questo argomento.</p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {(Object.keys(CONFIDENCE) as Confidence[]).map((c) => (
                <button key={c} onClick={() => declare(c)} className="panel p-4 text-left transition hover:border-brass hover:-translate-y-0.5">
                  <div className="font-display text-xl text-brass">{CONFIDENCE[c].label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{CONFIDENCE[c].desc}</div>
                  <div className="mt-3 text-xs">×{CONFIDENCE[c].mult} crediti · −{CONFIDENCE[c].penalty} se insufficiente · {CONFIDENCE[c].followUps} follow-up</div>
                </button>))}
            </div>
            <button onClick={() => declare("lacuna")} className="btn-ghost mt-4 w-full">Rinvio a giudizio · Lacuna riconosciuta (−2, registrata come debito formativo)</button>
          </div>)}

        {live.step !== "declare" && (
          <>
            <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
              {live.transcript.map((m, i) => (
                <div key={i} className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed ${m.role === "prof" ? "bg-secondary" : "ml-auto bg-brass/15 border border-brass/30"}`}>
                  <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{m.role === "prof" ? profName : "Studente"}</div>{m.text}
                </div>))}
              <div ref={endRef} />
            </div>
            {live.step === "dialog" && (
              <div className="mt-4">
                <div className="mb-2 text-xs text-muted-foreground">Sicurezza: {CONFIDENCE[live.conf as Confidence].label} · approfondimento {live.asked}/{maxFU}</div>
                <div className="flex gap-2">
                  <textarea className="field min-h-20 flex-1" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Risponda all'esaminatore…" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
                  <button className="btn-brass self-end" onClick={send}>Rispondi</button>
                </div>
              </div>)}
            {live.step === "result" && last && (
              <div className="mt-4 border-t border-brass/20 pt-4">
                <div className="flex flex-wrap items-end gap-6">
                  <ScoreBars s={last.score} />
                  <div className={`font-display text-4xl ${last.delta >= 0 ? "text-brass" : "text-destructive"}`}>{last.delta >= 0 ? "+" : ""}{last.delta}</div>
                  <button className="btn-brass ml-auto" onClick={next}>{live.idx + 1 >= live.topics.length ? "Chiudi la seduta" : "Prossimo argomento"}</button>
                </div>
              </div>)}
          </>)}
      </div>
    </section>
  );
}

function ScoreBars({ s }: { s: QuestionRecord["score"] }) {
  return (
    <div className="grid min-w-56 gap-1 text-xs">
      {([["Accuratezza", s.accuracy], ["Completezza", s.completeness], ["Tenuta logica", s.logic]] as const).map(([l, v]) => (
        <div key={l} className="flex items-center gap-2"><span className="w-24 text-muted-foreground">{l}</span><div className="h-1.5 flex-1 rounded bg-muted"><div className="h-full rounded bg-brass" style={{ width: `${v * 10}%` }} /></div><span className="w-6 text-right">{v}</span></div>))}
      <div className="mt-1 font-semibold">Totale {s.total}/10</div>
    </div>
  );
}

function Report({ sessions, onBack }: { sessions: SessionRecord[]; onBack: () => void }) {
  const qs = sessions.flatMap((s) => s.questions);
  const { grade, avg } = finalGrade(sessions);
  const cal = calibration(qs);
  const debts = qs.filter((q) => q.confidence === "lacuna");
  const final = sessions.some((s) => s.examiner === "presidente" && s.passed);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section>
      <button className="btn-ghost" onClick={onBack}>← Torna al percorso</button>
      <div className="mt-6 text-xs uppercase tracking-[0.3em] text-brass">{final ? "Verbale d'esame" : "Fascicolo provvisorio"}</div>
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <Stat label={final ? "Voto finale" : "Voto stimato"} value={grade} big />
        <Stat label="Calibrazione sicurezza" value={`${cal}%`} />
        <Stat label="Media argomenti" value={`${avg}/10`} />
        <Stat label="Debiti formativi" value={String(debts.length)} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">La calibrazione misura quanto la sicurezza dichiarata ha corrisposto alla resa reale: 100% significa sapere esattamente quanto si sa.</p>
      <h3 className="mt-10 font-display text-3xl">Cronologia</h3>
      <ol className="mt-4 space-y-6 border-l border-brass/30 pl-6">
        {sessions.map((s, si) => (
          <li key={s.id}>
            <div className="font-display text-xl">{s.examiner === "presidente" ? "Commissione Plenaria" : `Seduta ${si + 1}`} · {s.examinerName} <span className={`text-sm ${s.passed ? "text-brass" : "text-destructive"}`}>({s.passed ? "convalidata" : "non convalidata"}, {s.credits} crediti)</span></div>
            <div className="mt-2 space-y-2">
              {s.questions.map((q, qi) => { const k = `${s.id}-${qi}`; return (
                <div key={k} className="panel">
                  <button className="flex w-full items-center justify-between p-4 text-left" onClick={() => setOpen(open === k ? null : k)}>
                    <span><b>{q.topicTitle}</b> <span className="text-xs text-muted-foreground">· {q.confidence === "lacuna" ? "Lacuna riconosciuta" : CONFIDENCE[q.confidence].label}</span></span>
                    <span className={q.delta >= 0 ? "text-brass" : "text-destructive"}>{q.score.total}/10 · {q.delta >= 0 ? "+" : ""}{q.delta}</span>
                  </button>
                  {open === k && (
                    <div className="space-y-4 border-t border-brass/20 p-4 text-sm">
                      <ScoreBars s={q.score} />
                      <div className="space-y-2">{q.transcript.map((m, i) => <p key={i}><span className={`text-xs uppercase tracking-widest ${m.role === "prof" ? "text-brass" : "text-muted-foreground"}`}>{m.role === "prof" ? q.examiner : "Studente"}</span><br />{m.text}</p>)}</div>
                      <div className="rounded-md bg-secondary p-4"><div className="text-xs uppercase tracking-widest text-brass">Spiegazione modello</div><p className="mt-1">{q.model}</p></div>
                    </div>)}
                </div>); })}
            </div>
          </li>))}
      </ol>
    </section>
  );
}
const Stat = ({ label, value, big }: { label: string; value: string; big?: boolean }) => (
  <div className={`panel p-5 ${big ? "border-brass glow" : ""}`}><div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</div><div className="mt-2 font-display text-4xl text-brass">{value}</div></div>
);
