import { describe, it, expect } from "vitest";
import {
  calibration,
  creditDelta,
  diagnose,
  missedConcepts,
  sessionReportMarkdown,
  finalGrade,
  keywordCoverage,
  scoreAnswers,
  weakestTopics,
  type QuestionRecord,
  type SessionRecord,
} from "./engine";
import { TOPICS } from "./data";
const s = (t: number) => ({ accuracy: t, completeness: t, logic: t, total: t });
describe("rules", () => {
  it("No Safety Net triples credits on a good answer", () => {
    expect(creditDelta(s(8), "senzarete")).toBe(24);
    expect(creditDelta(s(8), "prudente")).toBe(8);
  });
  it("No Safety Net penalises hard, a declared gap only a little", () => {
    expect(creditDelta(s(3), "senzarete")).toBe(-20);
    expect(creditDelta(s(0), "lacuna")).toBe(-2);
  });
  it("the President brings back gaps and worst scores", () => {
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
  it("one-letter keywords only count as a word of their own", () => {
    const hh = TOPICS.find((t) => t.id === "ne-hh")!;
    // "m", "h", "n" appear inside nearly every word: off-topic text must not hit them.
    expect(keywordCoverage(["I have nothing to say about this, I am sorry."], hh).hit).toBe(0);
    expect(
      keywordCoverage(
        ["The variables m, h and n control the sodium and potassium conductances."],
        hh,
      ).hit,
    ).toBe(6);
  });
  it("a relevant, reasoned answer beats an off-topic one", () => {
    const ny = TOPICS.find((t) => t.id === "sp-nyquist")!;
    const good = scoreAnswers(
      [
        "The sampling frequency must be at least twice the bandwidth of the signal, because otherwise the spectral replicas overlap and you get aliasing; therefore an anti-aliasing filter is used before reconstruction.",
      ],
      ny,
    );
    const bad = scoreAnswers(["I could not say."], ny);
    expect(good.total).toBeGreaterThanOrEqual(6);
    expect(bad.total).toBeLessThan(6);
    expect(good.accuracy).toBeGreaterThan(bad.accuracy);
  });
  it("calibration rewards declaring what you then deliver, gaps included", () => {
    expect(calibration([q("a", 8.5, "senzarete"), q("b", 0, "lacuna")])).toBe(100);
    expect(calibration([q("a", 2, "senzarete")])).toBeLessThan(
      calibration([q("a", 2, "prudente")]),
    );
    expect(calibration([])).toBe(0);
  });
  it("the grade stays between 18 and 30 cum laude", () => {
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
    expect(finalGrade(sess(10, "senzarete")).grade).toBe("30 cum laude");
    expect(finalGrade([]).grade).toBe("18/30");
  });
  it("short acronyms are not found inside other words", () => {
    const eeg = TOPICS.find((t) => t.id === "ne-eeg")!;
    // "typical" and "technical" contain "ica" but are not about ICA.
    expect(missedConcepts(["The typical technical one."], eeg)).toContain("ICA");
    expect(missedConcepts(["I use ICA."], eeg)).not.toContain("ICA");
    const fft = TOPICS.find((t) => t.id === "sp-fft")!;
    expect(missedConcepts(["It costs N log N instead of n^2."], fft)).not.toEqual(
      expect.arrayContaining(["O(N log N) cost", "O(N²) cost"]),
    );
  });
  it("the report lists weak points derived from the answers", () => {
    const bad = {
      ...q("a", 2, "senzarete"),
      topicTitle: "Filters",
      model: "Model.",
      missed: ["stability"],
    };
    const gap = { ...q("b", 0, "lacuna"), topicTitle: "Zeta" };
    const good = { ...q("c", 9, "solido"), topicTitle: "FFT" };
    expect(diagnose(bad).join(" ")).toMatch(/Overconfident/);
    expect(diagnose(good)).toEqual([]);
    expect(diagnose({ ...q("d", 9, "prudente") }).join(" ")).toMatch(/Underconfident/);
    const md = sessionReportMarkdown(
      {
        id: "1",
        examiner: "severo",
        examinerName: "Prof. X",
        credits: 12,
        passed: false,
        questions: [bad, gap, good],
      },
      "Session 1",
      "14/11/2026",
    );
    const weak = md.slice(md.indexOf("## Weak points"), md.indexOf("## Question details"));
    expect(weak).toContain("### Filters");
    expect(weak).toContain("Concepts not covered: stability.");
    expect(weak).toContain("### Zeta");
    expect(weak).not.toContain("### FFT");
    expect(md).toContain("not passed with 12 credits");
  });
});
