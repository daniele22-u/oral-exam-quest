# Oral Exam Quest

A gamified simulator of the university oral exam: an academic serious game where knowing is not enough, you have to know _how much_ you know.

## Experience

- **Splash and onboarding**: the app opens on the beating pixel heart, then one step per screen. You "connect" the Politecnico Online Services and WeBeep, pick a course, and the app shows the lectures, recordings, transcripts and notes that become exam topics. **It is a simulation**: no credentials are asked for and no request is sent to those services; every step can be skipped ("Skip · demo").
- **Three tabs**: Path, Materials, Record. On phones they sit in a bottom bar, on wide screens in a left column. The profile is top right (connected services, Text/Voice, reset).
- **Full-screen session**: during the exam tabs and profile disappear; only progress, credits and the ✕ to leave remain.
- Guidelines followed: touch targets of at least 44 px, 16 px field text, state never conveyed by colour alone, "reduce motion" and phone safe areas respected.

## How to play

1. **Choose the syllabus**: Signal Processing, Neuroengineering or a custom course (course name + at least 3 topics).
2. **Preliminary sessions**: each session draws a random examiner (Strict, Supportive, Absent-Minded) and 3 topics. You start with 30 Trust Credits; the session is passed with at least 40.
3. **Confidence declaration** before every question:

   | Declaration   | Credits if sufficient | Penalty | Follow-ups                              |
   | ------------- | --------------------- | ------- | --------------------------------------- |
   | Cautious      | ×1                    | −4      | 2                                       |
   | Solid         | ×2                    | −10     | 3                                       |
   | No Safety Net | ×3                    | −20     | 4                                       |
   | Gap           | —                     | −2      | none (learning debt kept in the record) |

4. **Plenary Board**: after 3 passed sessions the President brings back the worst topics from the _whole_ history, failed sessions included, and reminds you why. Declaring a gap is not allowed here: you answer every question.
5. **Report**: grade out of 30, confidence calibration index, learning debts still open and an expandable history with transcript, scores and model answer.

The record and the session in progress are saved in the browser (`localStorage`): reloading the page resumes where you left off.

## Scoring

Demo mode works without API keys. The score (0–10) combines accuracy (key syllabus concepts covered, 50%), completeness (breadth of the answer, 25%) and logic (argumentative connectives, 25%); the pass mark is 6. It is a keyword heuristic, not a real assessment: `scoreAnswers` in `src/lib/game/engine.ts` is where an AI evaluator plugs in.

## AI examiner (optional)

With a Google Gemini key the opening questions, the follow-ups and the final evaluation are generated in real time: the examiner reacts to what the student said and the report includes a written assessment. Without a key, or if the service does not answer, the game falls back to demo mode on its own.

- Locally: a `.env.local` file (git-ignored) with `GEMINI_API_KEY=...`.
- On Lovable: the same name in the project Secrets.
- Optional: `GEMINI_MODEL` (default `gemini-flash-lite-latest`, chosen because it answers in about a second) and `GEMINI_EVAL_MODEL` to use a more capable model for the final assessment only.

The key stays on the server (`src/lib/game/server/gemini.ts`): never use the `VITE_` prefix, which would expose it to the browser. The server functions in `src/lib/game/ai.ts` are reachable by anyone who opens the site and have no rate limit: set a spending cap on the key before publishing.

### Voice variant (Text / Voice)

With the key configured, the profile shows the **Text / Voice** switch. In Voice mode the examiner reads every line aloud and you can answer by microphone: the recording is transcribed into the answer field, to reread before sending. Everything goes through the same Gemini key, server-side.

- Speech: `gemini-3.8-flash-lite-tts`, falling back to `gemini-3.8-flash-tts` and older TTS models (`GEMINI_TTS_MODEL` to change it).
- Listening: `gemini-3.5-transcribe` (`GEMINI_STT_MODEL` to change it).
- The free tier gives voice models only a few requests per minute: if voice is unavailable the exam continues in writing.
- The student's audio is sent to Google only for transcription and is not stored by the app; answers up to 90 seconds.

## Structure

- `src/lib/game/data.ts` — examiners, confidence levels, topics and questions.
- `src/lib/game/engine.ts` — rules as pure functions (score, credits, calibration, grade, the President's topic selection), with tests in `engine.test.ts`.
- `src/components/game/Game.tsx` — interface and game flow.

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
npm test        # game rule tests
npm run lint
```
