import { useEffect, useRef, useState } from "react";
import { speakLine } from "@/lib/game/voice";
import type { Mood, Who } from "./Portrait";

/** Riproduce le battute dell'esaminatore, una alla volta: una nuova interrompe la precedente. */
export function useSpeaker() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const ticket = useRef(0);
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  // La voce non è arrivata (quota esaurita, rete): va detto, altrimenti sembra un guasto muto.
  const [failed, setFailed] = useState(false);
  const stop = () => {
    ticket.current++;
    audio.current?.pause();
    audio.current = null;
    setState("idle");
  };
  useEffect(() => stop, []);
  async function speak(text: string, who: Who, mood: Mood) {
    stop();
    const mine = ticket.current;
    setState("loading");
    setFailed(false);
    const r = await speakLine({ data: { text: text.slice(0, 1200), who, mood } }).catch(() => null);
    if (mine !== ticket.current) return;
    if (!r?.ok) {
      setFailed(true);
      return setState("idle");
    }
    const a = new Audio(`data:audio/wav;base64,${r.wav}`);
    audio.current = a;
    a.onended = () => mine === ticket.current && setState("idle");
    setState("playing");
    // Il browser può bloccare l'avvio automatico: resta il pulsante "Riascolta".
    a.play().catch(() => mine === ticket.current && setState("idle"));
  }
  return { speak, stop, state, failed };
}
