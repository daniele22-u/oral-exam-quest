import { describe, it, expect } from "vitest";
import { creditDelta, weakestTopics, type SessionRecord } from "./engine";
const s = (t: number) => ({ accuracy: t, completeness: t, logic: t, total: t });
describe("regole", () => {
  it("Senza Rete triplica i crediti su risposta buona", () => { expect(creditDelta(s(8), "senzarete")).toBe(24); expect(creditDelta(s(8), "prudente")).toBe(8); });
  it("Senza Rete penalizza duramente, la lacuna poco", () => { expect(creditDelta(s(3), "senzarete")).toBe(-20); expect(creditDelta(s(0), "lacuna")).toBe(-2); });
  it("il Presidente ripropone lacune e punteggi peggiori", () => {
    const q = (id: string, total: number, conf: any = "solido") => ({ topicId: id, topicTitle: id, course: "", confidence: conf, transcript: [], score: s(total), delta: 0, model: "", examiner: "" });
    const sess: SessionRecord[] = [{ id: "1", examiner: "severo", examinerName: "", credits: 0, passed: true, questions: [q("a", 9), q("b", 4), q("c", 0, "lacuna"), q("d", 7)] }];
    expect(weakestTopics(sess, 2).map((x) => x.topicId)).toEqual(["c", "b"]);
  });
});
