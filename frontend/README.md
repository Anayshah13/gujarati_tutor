# Gujarati Tutor

Web app for practicing Gujarati through multiple-choice questions. It adapts what you see next using **Bayesian Knowledge Tracing (BKT)** so weaker skills get more attention.

Built with **React 19** and **Vite**.

## Features

- **Level choice** — Primary School (standard priors) or High School (boosted starting mastery so questions skew toward medium difficulty sooner).
- **Adaptive quiz** — After each answer, BKT updates per-skill mastery. The next question targets the **weakest non-mastered skill**, with easy vs medium pools based on current mastery.
- **Skill progress** — Live bars for estimated mastery (target **95%**) across: vowels, numbers, greetings, basic vocabulary, and simple sentences.
- **Question bank** — Items live in `src/gujarati_questions.json` (skill, difficulty, prompt, options, answer, English helper text).

The **More Features** tab is a placeholder for future work.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

Other scripts:

- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build locally
- `npm run lint` — ESLint

## Project layout

| Path | Role |
|------|------|
| `src/App.jsx` | UI: onboarding, quiz, navigation, progress panel |
| `src/bkt.js` | BKT parameters, state init/update, weakest-skill and question selection |
| `src/gujarati_questions.json` | Question bank |

The BKT module also exposes `saveBKTState` / `loadBKTState` / `clearBKTState` for `localStorage`; the current UI does not persist sessions yet.

## References

BKT follows the classic Corbett & Anderson (1994) formulation; see comments in `src/bkt.js` for parameters and update steps.
