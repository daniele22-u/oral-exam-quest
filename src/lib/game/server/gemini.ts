/**
 * Chiamata minima a Gemini con risposta JSON vincolata da schema. Solo lato server: la chiave
 * viaggia nell'header e non compare mai in URL, log o codice del browser.
 */
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 20_000;

/**
 * Modello facoltativo per il solo giudizio finale (GEMINI_EVAL_MODEL): utile se si dispone di un
 * modello più capace. Di norma è più lento: se non risponde in tempo si ripiega su quello rapido.
 */
export const evalModel = () => process.env["GEMINI_EVAL_MODEL"]?.trim() || undefined;

export const geminiKey = () => process.env["GEMINI_API_KEY"]?.trim() || undefined;

export async function geminiJson<T>(opts: {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  temperature: number;
  /** Modello da usare al posto di quello predefinito. */
  model?: string;
}): Promise<T> {
  const key = geminiKey();
  if (!key) throw new Error("GEMINI_API_KEY non configurata");
  // Il modello "lite" risponde in circa un secondo, adatto a un dialogo d'esame; GEMINI_MODEL
  // permette di sceglierne uno più capace senza toccare il codice.
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
    throw new Error(`Gemini ha risposto ${res.status}: ${detail}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
  if (!text) throw new Error("Gemini ha restituito una risposta vuota");
  return JSON.parse(text) as T;
}

/**
 * Modelli vocali. Voce: variante "lite" del modello di sintesi, che risponde in un paio di secondi.
 * Ascolto: modello dedicato alla trascrizione, più fedele di un modello generico. Entrambi si
 * possono cambiare con GEMINI_TTS_MODEL e GEMINI_STT_MODEL.
 */
const ttsModel = () => process.env["GEMINI_TTS_MODEL"]?.trim() || "gemini-3.8-flash-lite-tts";
const TTS_FALLBACK = "gemini-3.8-flash-tts";
const sttModel = () => process.env["GEMINI_STT_MODEL"]?.trim() || "gemini-3.5-transcribe";

async function geminiCall(model: string, body: unknown, timeoutMs: number): Promise<unknown> {
  const key = geminiKey();
  if (!key) throw new Error("GEMINI_API_KEY non configurata");
  const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`Gemini ha risposto ${res.status}: ${detail}`);
  }
  return res.json();
}

/** Intestazione WAV per audio PCM a 16 bit mono: alcuni modelli restituiscono solo i campioni. */
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

/** Sintesi vocale: restituisce un file WAV in base64. `style` descrive il tono, `voice` il timbro. */
export async function geminiSpeech(opts: {
  text: string;
  voice: string;
  style: string;
}): Promise<string> {
  const body = {
    // Il tono va tra parentesi quadre: scritto come frase ("Leggi con tono…: …") il modello
    // lo pronuncia insieme alla battuta.
    contents: [{ parts: [{ text: `[${opts.style}] ${opts.text}` }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: opts.voice } } },
    },
  };
  // Il piano gratuito concede poche richieste al minuto per modello vocale: se il primo è saturo
  // o non risponde si prova il secondo prima di rinunciare alla voce.
  const data = (await geminiCall(ttsModel(), body, 15_000).catch(() =>
    geminiCall(TTS_FALLBACK, body, 20_000),
  )) as {
    candidates?: {
      content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] };
    }[];
  };
  const audio = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
  if (!audio?.data) throw new Error("Gemini non ha restituito audio");
  const mime = (audio.mimeType ?? "").toLowerCase();
  if (mime.includes("wav")) return audio.data;
  const rate = Number(/rate=(\d+)/.exec(mime)?.[1] ?? 24000);
  return toBase64(wavFromPcm(fromBase64(audio.data), rate));
}

/** Trascrizione di un file WAV in base64. */
export async function geminiTranscribe(wavBase64: string): Promise<string> {
  const data = (await geminiCall(
    sttModel(),
    { contents: [{ parts: [{ inlineData: { mimeType: "audio/wav", data: wavBase64 } }] }] },
    25_000,
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
