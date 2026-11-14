import { describe, it, expect } from "vitest";
import {
  calibration,
  creditDelta,
  finalGrade,
  keywordCoverage,
  scoreAnswers,
  weakestTopics,
  type QuestionRecord,
  type SessionRecord,
} from "./engine";
import { TOPICS } from "./data";
const s = (t: number) => ({ accuracy: t, completeness: t, logic: t, total: t });
describe("regole", () => {
  it("Senza Rete triplica i crediti su risposta buona", () => {
    expect(creditDelta(s(8), "senzarete")).toBe(24);
    expect(creditDelta(s(8), "prudente")).toBe(8);
  });
  it("Senza Rete penalizza duramente, la lacuna poco", () => {
    expect(creditDelta(s(3), "senzarete")).toBe(-20);
    expect(creditDelta(s(0), "lacuna")).toBe(-2);
  });
  it("il Presidente ripropone lacune e punteggi peggiori", () => {
    const q = (id: string, total: number, conf: QuestionRecord["confidence"] = "solido") => ({
      topicId: id,
      topicTitle: id,
      course: "",
      confidence: conf,
      transcript: [],
      score: s(total),
      delta: 0,
      model: "",
      examiner: "",
    });
    const sess: SessionRecord[] = [
      {
        id: "1",
        examiner: "severo",
        examinerName: "",
        credits: 0,
        passed: true,
        questions: [q("a", 9), q("b", 4), q("c", 0, "lacuna"), q("d", 7)],
      },
    ];
    expect(weakestTopics(sess, 2).map((x) => x.topicId)).toEqual(["c", "b"]);
  });
  const q = (id: string, total: number, conf: QuestionRecord["confidence"] = "solido") => ({
    topicId: id,
    topicTitle: id,
    course: "",
    confidence: conf,
    transcript: [],
    score: s(total),
    delta: 0,
    model: "",
    examiner: "",
  });
  it("le parole chiave di una lettera valgono solo come parola a sé", () => {
    const hh = TOPICS.find((t) => t.id === "ne-hh")!;
    // "m", "h", "n" compaiono dentro quasi ogni parola: un testo fuori tema non deve centrarle.
    expect(keywordCoverage(["Non ho nulla da dichiarare in merito, mi dispiace."], hh).hit).toBe(0);
    expect(
      keywordCoverage(["Le variabili m, h e n regolano le conduttanze di sodio e potassio."], hh)
        .hit,
    ).toBe(6);
  });
  it("una risposta pertinente e argomentata batte una fuori tema", () => {
    const ny = TOPICS.find((t) => t.id === "sp-nyquist")!;
    const good = scoreAnswers(
      [
        "La frequenza di campionamento deve essere almeno il doppio della banda del segnale, perché altrimenti le repliche spettrali si sovrappongono e si ha aliasing; quindi si usa un filtro anti-aliasing prima della ricostruzione.",
      ],
      ny,
    );
    const bad = scoreAnswers(["Non saprei dire."], ny);
    expect(good.total).toBeGreaterThanOrEqual(6);
    expect(bad.total).toBeLessThan(6);
    expect(good.accuracy).toBeGreaterThan(bad.accuracy);
  });
  it("la calibrazione premia chi dichiara ciò che poi rende, lacune comprese", () => {
    expect(calibration([q("a", 8.5, "senzarete"), q("b", 0, "lacuna")])).toBe(100);
    expect(calibration([q("a", 2, "senzarete")])).toBeLessThan(
      calibration([q("a", 2, "prudente")]),
    );
    expect(calibration([])).toBe(0);
  });
  it("il voto resta tra 18 e 30 e lode", () => {
    const sess = (total: number, conf: QuestionRecord["confidence"]): SessionRecord[] => [
      {
        id: "1",
        examiner: "severo",
        examinerName: "",
        credits: 0,
        passed: true,
        questions: [q("a", total, conf)],
      },
    ];
    expect(finalGrade(sess(0, "senzarete")).grade).toBe("18/30");
    expect(finalGrade(sess(10, "senzarete")).grade).toBe("30 e lode");
    expect(finalGrade([]).grade).toBe("18/30");
  });
});
