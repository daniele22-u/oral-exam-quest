/**
 * Minimal Gemini call with a schema-constrained JSON response. Server-side only: the key
 * travels in the header and never appears in URLs, logs or browser code.
 */
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 20_000;

/**
 * Optional model for the final assessment only (GEMINI_EVAL_MODEL): useful when a more capable
 * model is available. It is usually slower: if it does not answer in time, fall back to the fast one.
 */
export const evalModel = () => process.env["GEMINI_EVAL_MODEL"]?.trim() || undefined;

export const geminiKey = () => process.env["GEMINI_API_KEY"]?.trim() || undefined;

export async function geminiJson<T>(opts: {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  temperature: number;
  /** Model to use instead of the default. */
  model?: string;
}): Promise<T> {
  const key = geminiKey();
  if (!key) throw new Error("GEMINI_API_KEY not configured");
  // The "lite" model answers in about a second, suited to an exam dialogue; GEMINI_MODEL
  // lets you choose a more capable one without touching the code.
  const model = opts.model || process.env["GEMINI_MODEL"]?.trim() || "gemini-flash-lite-latest";
  const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [{ role: "user", parts: [{ text: opts.user }] }],
      generationConfig: {
        temperature: opts.temperature,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseSchema: opts.schema,
      },
    }),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`Gemini answered ${res.status}: ${detail}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
  if (!text) throw new Error("Gemini returned an empty response");
  return JSON.parse(text) as T;
}

/**
 * Voice models. Speech: the "lite" variant of the synthesis model, which answers in a couple
 * of seconds. Listening: a dedicated transcription model, more faithful than a generic one.
 * Both can be changed with GEMINI_TTS_MODEL and GEMINI_STT_MODEL.
 */
const ttsModel = () => process.env["GEMINI_TTS_MODEL"]?.trim() || "gemini-3.8-flash-lite-tts";
// Fallbacks in order of speed: the free tier gives each voice model a few requests per minute
// and about ten per day, so move on to the next one when one is exhausted.
const TTS_FALLBACKS = [
  "gemini-3.8-flash-tts",
  "gemini-3.1-flash-tts-preview",
  "gemini-2.5-flash-preview-tts",
];
// A model that has just refused for quota is skipped for a while instead of being asked in vain.
const exhausted = new Map<string, number>();
const SKIP_MS = 60_000;
const sttModel = () => process.env["GEMINI_STT_MODEL"]?.trim() || "gemini-3.5-transcribe";

async function geminiCall(model: string, body: unknown, timeoutMs: number): Promise<unknown> {
  const key = geminiKey();
  if (!key) throw new Error("GEMINI_API_KEY not configured");
  const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`Gemini answered ${res.status}: ${detail}`);
  }
  return res.json();
}

/** WAV header for 16-bit mono PCM audio: some models return only the samples. */
function wavFromPcm(pcm: Uint8Array, rate: number): Uint8Array {
  const out = new Uint8Array(44 + pcm.length);
  const v = new DataView(out.buffer);
  const tag = (at: number, s: string) =>
    [...s].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)));
  tag(0, "RIFF");
  v.setUint32(4, 36 + pcm.length, true);
  tag(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  tag(36, "data");
  v.setUint32(40, pcm.length, true);
  out.set(pcm, 44);
  return out;
}

const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Speech synthesis: returns a base64 WAV file. `style` describes the tone, `voice` the timbre. */
export async function geminiSpeech(opts: {
  text: string;
  voice: string;
  style: string;
}): Promise<string> {
  const body = {
    // The tone goes in square brackets: written as a sentence ("Read in a … tone: …") the model
    // speaks it along with the line.
    contents: [{ parts: [{ text: `[${opts.style}] ${opts.text}` }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: opts.voice } } },
    },
  };
  const models = [...new Set([ttsModel(), ...TTS_FALLBACKS])];
  const now = Date.now();
  const ready = models.filter((m) => (exhausted.get(m) ?? 0) <= now);
  let data: unknown;
  let failure: unknown = new Error("Voice unavailable: quota exhausted on all models");
  for (const model of ready.length ? ready : models) {
    try {
      data = await geminiCall(model, body, 15_000);
      break;
    } catch (e) {
      failure = e;
      if (e instanceof Error && e.message.includes("429")) exhausted.set(model, now + SKIP_MS);
    }
  }
  if (data === undefined) throw failure;
  const out = data as {
    candidates?: {
      content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] };
    }[];
  };
  const audio = out.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
  if (!audio?.data) throw new Error("Gemini returned no audio");
  const mime = (audio.mimeType ?? "").toLowerCase();
  if (mime.includes("wav")) return audio.data;
  const rate = Number(/rate=(\d+)/.exec(mime)?.[1] ?? 24000);
  return toBase64(wavFromPcm(fromBase64(audio.data), rate));
}

/**
 * Transcription of a base64 WAV file. If the dedicated model is overloaded or slow, fall back
 * to the text model, which accepts audio and transcribes on request.
 */
export async function geminiTranscribe(wavBase64: string): Promise<string> {
  const audio = { inlineData: { mimeType: "audio/wav", data: wavBase64 } };
  const data = (await geminiCall(sttModel(), { contents: [{ parts: [audio] }] }, 10_000).catch(() =>
    geminiCall(
      process.env["GEMINI_MODEL"]?.trim() || "gemini-flash-lite-latest",
      {
        contents: [
          {
            parts: [
              {
                text: "Transcribe this audio faithfully in English. Return only the transcript, with no comments or corrections.",
              },
              audio,
            ],
          },
        ],
        generationConfig: { temperature: 0 },
      },
      15_000,
    ),
  )) as {
    candidates?: {
      content?: { parts?: { text?: string; audioTranscription?: { text?: string } }[] };
    }[];
  };
  return (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.audioTranscription?.text ?? p.text ?? "")
    .join(" ")
    .trim();
}
