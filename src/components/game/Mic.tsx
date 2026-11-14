import { useEffect, useRef, useState } from "react";
import { MAX_ANSWER_SECONDS, transcribeAnswer } from "@/lib/game/voice";

/**
 * Recording of the spoken answer. The microphone turns on only when the student presses the
 * button and turns off when recording ends; the audio is converted here to 16 kHz mono WAV
 * before being sent.
 */
const RATE = 16000;

/** Converts a browser recording to 16 kHz mono WAV, base64-encoded. */
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
 * Microphone button: one tap starts recording, a second one stops and transcribes it. The
 * transcribed text is handed to `onText`, so the student can reread it before answering.
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
      return setError("This browser cannot record: please answer in writing.");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return setError("Microphone unavailable or permission denied: please answer in writing.");
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
        else setError("Could not understand the recording: try again or answer in writing.");
      } catch {
        if (alive.current) setError("Recording unreadable: try again or answer in writing.");
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
        {recording ? `■ Stop · ${seconds}s` : state === "working" ? "Transcribing…" : "● Speak"}
      </button>
      <span role="status" className="max-w-40 text-xs text-destructive">
        {error}
      </span>
    </div>
  );
}
