# Oral Exam Quest — "Commissione"

Simulatore gamificato di esame orale universitario: un serious game accademico in cui non basta sapere, bisogna sapere _quanto_ si sa.

## Come si gioca

1. **Scegli il programma**: Signal Processing, Neuroengineering o una materia personalizzata (nome del corso + almeno 3 argomenti).
2. **Sedute preliminari**: ogni seduta estrae a sorte un esaminatore (Severa, Empatico, Distratto) e 3 argomenti. Si parte da 30 Crediti Fiducia; la seduta è convalidata con almeno 40.
3. **Dichiarazione di sicurezza** prima di ogni domanda:

   | Dichiarazione | Crediti se sufficiente | Penalità | Approfondimenti                          |
   | ------------- | ---------------------- | -------- | ---------------------------------------- |
   | Prudente      | ×1                     | −4       | 2                                        |
   | Solido        | ×2                     | −10      | 3                                        |
   | Senza Rete    | ×3                     | −20      | 4                                        |
   | Lacuna        | —                      | −2       | nessuno (debito formativo nel fascicolo) |

4. **Commissione Plenaria**: dopo 3 sedute convalidate il Presidente ripropone gli argomenti peggiori di _tutto_ lo storico, sedute fallite comprese, e ricorda perché.
5. **Verbale**: voto in trentesimi, indice di calibrazione della sicurezza, debiti formativi ancora aperti e cronologia espandibile con trascrizione, punteggi e spiegazione modello.

Il fascicolo e la seduta in corso sono salvati nel browser (`localStorage`): ricaricando la pagina si riprende da dove si era rimasti.

## Valutazione

La modalità demo funziona senza chiavi API. Il punteggio (0–10) combina accuratezza (concetti chiave del programma toccati, 50%), completezza (ampiezza della risposta, 25%) e tenuta logica (connettivi argomentativi, 25%); la sufficienza è 6. È un'euristica a parole chiave, non una correzione di merito: `scoreAnswers` in `src/lib/game/engine.ts` è il punto in cui agganciare un valutatore AI.

## Esaminatore AI (facoltativo)

Con una chiave Google Gemini le domande d'apertura, gli approfondimenti e la valutazione finale sono generati in tempo reale: l'esaminatore reagisce a ciò che lo studente ha detto e il referto riporta un giudizio scritto. Senza chiave, o se il servizio non risponde, il gioco ripiega da solo sulla modalità demo.

- In locale: file `.env.local` (ignorato da git) con `GEMINI_API_KEY=...`.
- Su Lovable: stesso nome nei Secrets del progetto.
- Facoltativi: `GEMINI_MODEL` (predefinito `gemini-flash-lite-latest`, scelto perché risponde in circa un secondo) e `GEMINI_EVAL_MODEL` per usare un modello più capace solo nel giudizio finale.

La chiave resta sul server (`src/lib/game/server/gemini.ts`): non usare mai il prefisso `VITE_`, che la esporrebbe al browser. Le funzioni server in `src/lib/game/ai.ts` sono raggiungibili da chiunque apra il sito e non hanno limite di frequenza: prima di pubblicare, impostare un tetto di spesa sulla chiave.

## Struttura

- `src/lib/game/data.ts` — esaminatori, livelli di sicurezza, argomenti e domande.
- `src/lib/game/engine.ts` — regole come funzioni pure (punteggio, crediti, calibrazione, voto, scelta degli argomenti del Presidente), con test in `engine.test.ts`.
- `src/components/game/Game.tsx` — interfaccia e flusso di gioco.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
npm test        # test delle regole di gioco
npm run lint
```
