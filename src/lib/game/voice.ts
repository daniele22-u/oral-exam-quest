import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { geminiSpeech, geminiTranscribe } from "./server/gemini";

/**
 * Variante vocale dell'esame: l'esaminatore parla (sintesi) e lo studente risponde a voce
 * (trascrizione). Come per l'esaminatore AI, ogni funzione restituisce `{ ok: false }` invece di
 * lanciare: se la voce non è disponibile l'esame prosegue per iscritto.
 *
 * L'audio dello studente viene inviato a Gemini solo per essere trascritto e non è salvato qui.
 */

// Un timbro per esaminatore, e un tono che segue l'espressione del ritratto.
const VOICES = {
  severo: { voice: "Kore", style: "tono fermo e asciutto" },
  empatico: { voice: "Puck", style: "tono caldo e incoraggiante" },
  distratto: { voice: "Charon", style: "tono svagato, soprappensiero" },
  presidente: {
    voice: "Orus",
    style: "tono solenne e autorevole",
  },
} as const;
const MOODS = {
  neutral: "",
  stern: ", insoddisfatto e incalzante",
  pleased: ", con approvazione",
} as const;

const speakInput = z.object({
  text: z.string().min(1).max(1200),
  who: z.enum(["severo", "empatico", "distratto", "presidente"]),
  mood: z.enum(["neutral", "stern", "pleased"]),
});

export const speakLine = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => speakInput.parse(d))
  .handler(async ({ data }) => {
    const v = VOICES[data.who];
    try {
      const wav = await geminiSpeech({
        text: data.text,
        voice: v.voice,
        style: v.style + MOODS[data.mood],
      });
      return { ok: true as const, wav };
    } catch (e) {
      console.error("[speakLine]", e instanceof Error ? e.message : e);
      return { ok: false as const };
    }
  });

/** Durata massima di una risposta a voce: 90 secondi di WAV mono a 16 kHz, in base64. */
export const MAX_ANSWER_SECONDS = 90;
const MAX_WAV_BASE64 = Math.ceil(((MAX_ANSWER_SECONDS * 16000 * 2 + 44) * 4) / 3) + 16;

const listenInput = z.object({
  wav: z
    .string()
    .min(64)
    .max(MAX_WAV_BASE64)
    .regex(/^[A-Za-z0-9+/]+=*$/),
});

export const transcribeAnswer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => listenInput.parse(d))
  .handler(async ({ data }) => {
    try {
      const text = await geminiTranscribe(data.wav);
      return { ok: true as const, text: text.slice(0, 2000) };
    } catch (e) {
      console.error("[transcribeAnswer]", e instanceof Error ? e.message : e);
      return { ok: false as const };
    }
  });
