import { useEffect, useRef, useState } from "react";
import { MAX_ANSWER_SECONDS, transcribeAnswer } from "@/lib/game/voice";

/**
 * Registrazione della risposta a voce. Il microfono si accende solo quando lo studente preme il
 * pulsante e si spegne a fine registrazione; l'audio viene convertito qui in WAV mono a 16 kHz
 * prima dell'invio.
 */
const RATE = 16000;

/** Converte una registrazione del browser in WAV mono a 16 kHz, codificato in base64. */
async function toWavBase64(blob: Blob): Promise<string> {
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const frames = Math.min(Math.ceil(decoded.duration * RATE), MAX_ANSWER_SECONDS * RATE);
    const off = new OfflineAudioContext(1, Math.max(1, frames), RATE);
    const src = off.createBufferSource();
    src.buffer = decoded;
    src.connect(off.destination);
    src.start();
    const pcm = (await off.startRendering()).getChannelData(0);
    const out = new Uint8Array(44 + pcm.length * 2);
    const v = new DataView(out.buffer);
    const tag = (at: number, s: string) =>
      [...s].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)));
    tag(0, "RIFF");
    v.setUint32(4, 36 + pcm.length * 2, true);
    tag(8, "WAVEfmt ");
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 1, true);
    v.setUint32(24, RATE, true);
    v.setUint32(28, RATE * 2, true);
    v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);
    tag(36, "data");
    v.setUint32(40, pcm.length * 2, true);
    for (let i = 0; i < pcm.length; i++) {
      const s = Math.max(-1, Math.min(1, pcm[i] ?? 0));
      v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    let bin = "";
    for (let i = 0; i < out.length; i += 0x8000)
      bin += String.fromCharCode(...out.subarray(i, i + 0x8000));
    return btoa(bin);
  } finally {
    void ctx.close();
  }
}

/**
 * Pulsante del microfono: un tocco avvia la registrazione, un secondo la chiude e la trascrive.
 * Il testo trascritto viene consegnato a `onText`, così lo studente può rileggerlo prima di
 * rispondere.
 */
export function Mic({ disabled, onText }: { disabled: boolean; onText: (text: string) => void }) {
  const [state, setState] = useState<"idle" | "recording" | "working">("idle");
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (rec.current?.state === "recording") rec.current.stop();
    };
  }, []);
  useEffect(() => {
    if (state !== "recording") return;
    setSeconds(0);
    const id = window.setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_ANSWER_SECONDS) rec.current?.stop();
        return s + 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [state]);

  async function start() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined")
      return setError("Questo browser non permette di registrare: risponda per iscritto.");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return setError("Microfono non disponibile o permesso negato: risponda per iscritto.");
    }
    const chunks: Blob[] = [];
    const r = new MediaRecorder(stream);
    rec.current = r;
    r.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    r.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      if (!alive.current) return;
      setState("working");
      try {
        const wav = await toWavBase64(new Blob(chunks, { type: r.mimeType }));
        const out = await transcribeAnswer({ data: { wav } });
        if (!alive.current) return;
        if (out.ok && out.text) onText(out.text);
        else setError("Non ho capito la registrazione: riprovi o risponda per iscritto.");
      } catch {
        if (alive.current)
          setError("Registrazione non leggibile: riprovi o risponda per iscritto.");
      }
      if (alive.current) setState("idle");
    };
    r.start();
    setState("recording");
  }

  const recording = state === "recording";
  return (
    <div className="flex flex-col items-stretch gap-1">
      <button
        type="button"
        className={recording ? "btn-main" : "btn-ghost"}
        disabled={disabled || state === "working"}
        aria-pressed={recording}
        onClick={() => (recording ? rec.current?.stop() : void start())}
      >
        {recording ? `■ Ferma · ${seconds}s` : state === "working" ? "Trascrivo…" : "● Parla"}
      </button>
      <span role="status" className="max-w-40 text-xs text-destructive">
        {error}
      </span>
    </div>
  );
}
