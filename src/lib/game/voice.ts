import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { geminiSpeech, geminiTranscribe } from "./server/gemini";

/**
 * Voice variant of the exam: the examiner speaks (synthesis) and the student answers by voice
 * (transcription). As with the AI examiner, each function returns `{ ok: false }` instead of
 * throwing: if voice is unavailable the exam continues in writing.
 *
 * The student's audio is sent to Gemini only to be transcribed and is not stored here.
 */

// One voice per examiner, and a tone that follows the portrait's expression.
const VOICES = {
  severo: { voice: "Kore", style: "firm, dry tone" },
  empatico: { voice: "Puck", style: "warm, encouraging tone" },
  distratto: { voice: "Charon", style: "absent-minded, distracted tone" },
  presidente: {
    voice: "Orus",
    style: "solemn, authoritative tone",
  },
} as const;
const MOODS = {
  neutral: "",
  stern: ", dissatisfied and pressing",
  pleased: ", approving",
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

/** Maximum length of a spoken answer: 90 seconds of 16 kHz mono WAV, in base64. */
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
