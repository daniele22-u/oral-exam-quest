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
