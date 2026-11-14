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

## Struttura

- `src/lib/game/data.ts` — esaminatori, livelli di sicurezza, argomenti e domande.
- `src/lib/game/engine.ts` — regole come funzioni pure (punteggio, crediti, calibrazione, voto, scelta degli argomenti del Presidente), con test in `engine.test.ts`.
- `src/components/game/Game.tsx` — interfaccia e flusso di gioco.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7355886e-65bd-4b79-a131-73a5ae740963).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

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
