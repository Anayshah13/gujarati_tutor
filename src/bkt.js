// ============================================================
// BKT Engine — Gujarati Adaptive Quiz
// Based on Corbett & Anderson (1994)
// ============================================================
//
// Four parameters per skill (cold-start defaults, tunable later):
//   pL0  — prior probability student already knows the skill
//   pT   — probability of learning on each attempt (transition)
//   pG   — probability of guessing correctly without knowing
//   pS   — probability of slipping (knows but answers wrong)
//
// These defaults are standard values from BKT literature.
// Once you have real user data, you can fit these using pyBKT.
// ============================================================

const BKT_PARAMS = {
  vowels:           { pL0: 0.10, pT: 0.10, pG: 0.20, pS: 0.10 },
  numbers:          { pL0: 0.15, pT: 0.12, pG: 0.20, pS: 0.08 },
  greetings:        { pL0: 0.20, pT: 0.15, pG: 0.25, pS: 0.08 },
  basic_vocab:      { pL0: 0.10, pT: 0.10, pG: 0.20, pS: 0.10 },
  simple_sentences: { pL0: 0.05, pT: 0.08, pG: 0.15, pS: 0.12 },
};

const MASTERY_THRESHOLD = 0.95;
const DIFFICULTY_THRESHOLD = 0.40;

// ============================================================
// State — one pL value per skill, initialized from pL0
// ============================================================

function initBKTState(level = "primary") {
  // 'level' comes from onboarding: "primary" | "highschool"
  // High school students start in the medium pool (pL >= 0.40).
  const priorBoost = level === "highschool" ? 0.40 : 0.0;

  const state = {};
  for (const skill in BKT_PARAMS) {
    state[skill] = {
      pL: Math.min(BKT_PARAMS[skill].pL0 + priorBoost, 0.99),
      attempts: 0,
      correct: 0,
      mastered: false,
    };
  }
  return state;
}

// ============================================================
// Core BKT update — call this after every question attempt
//
// @param {object} state     — the full BKT state object
// @param {string} skill     — e.g. "vowels"
// @param {boolean} correct  — whether the student answered correctly
// @returns {object}         — updated state (mutates and returns)
// ============================================================

function updateBKT(state, skill, correct) {
  const { pT, pG, pS } = BKT_PARAMS[skill];
  const pL = state[skill].pL;

  // Step 1 — Bayesian update given observation
  // P(correct) = P(L)*P(not slip) + P(not L)*P(guess)
  const pCorrect = pL * (1 - pS) + (1 - pL) * pG;
  const pWrong   = pL * pS       + (1 - pL) * (1 - pG);

  let pLgivenObs;
  if (correct) {
    // P(L | correct) = P(L) * P(not slip) / P(correct)
    pLgivenObs = (pL * (1 - pS)) / pCorrect;
  } else {
    // P(L | wrong) = P(L) * P(slip) / P(wrong)
    pLgivenObs = (pL * pS) / pWrong;
  }

  // Step 2 — Apply learning transition
  // Even after a wrong answer, there is a pT chance of learning
  const pLnext = pLgivenObs + (1 - pLgivenObs) * pT;

  // Clamp to valid probability range
  state[skill].pL       = Math.min(Math.max(pLnext, 0.001), 0.999);
  state[skill].attempts += 1;
  state[skill].correct  += correct ? 1 : 0;
  state[skill].mastered  = state[skill].pL >= MASTERY_THRESHOLD;

  return state;
}

// ============================================================
// Difficulty selector — decides which difficulty pool to serve
//
// @param {object} state  — full BKT state
// @param {string} skill  — skill to check
// @returns {string}      — "easy" | "medium"
// ============================================================

function getDifficulty(state, skill) {
  return state[skill].pL < DIFFICULTY_THRESHOLD ? "easy" : "medium";
}

// ============================================================
// Next skill selector — picks the skill that needs most work
// (lowest pL among non-mastered skills)
//
// @param {object} state  — full BKT state
// @returns {string}      — skill name
// ============================================================

function getWeakestSkill(state) {
  let weakest = null;
  let lowestPL = Infinity;

  for (const skill in state) {
    if (!state[skill].mastered && state[skill].pL < lowestPL) {
      lowestPL = state[skill].pL;
      weakest = skill;
    }
  }

  // If all skills are mastered, return the one with highest pL
  // (shouldn't happen in normal flow, but safe fallback)
  if (!weakest) {
    weakest = Object.keys(state).reduce((a, b) =>
      state[a].pL > state[b].pL ? a : b
    );
  }

  return weakest;
}

// ============================================================
// Question selector — picks a question from the bank
// matching the skill and appropriate difficulty
//
// @param {Array}  questionBank  — full array of question objects
// @param {object} state         — full BKT state
// @param {string} skill         — target skill
// @param {Array}  usedIds       — question IDs already shown
// @returns {object|null}        — question object or null if exhausted
// ============================================================

function selectQuestion(questionBank, state, skill, usedIds = []) {
  const difficulty = getDifficulty(state, skill);

  // Filter by skill + difficulty, exclude already-used questions
  let pool = questionBank.filter(
    (q) => q.skill === skill && q.difficulty === difficulty && !usedIds.includes(q.id)
  );

  // If the target difficulty pool is exhausted, try the other difficulty
  if (pool.length === 0) {
    pool = questionBank.filter(
      (q) => q.skill === skill && !usedIds.includes(q.id)
    );
  }

  // If the whole skill is exhausted, return null
  if (pool.length === 0) return null;

  // Pick a random question from the filtered pool
  return pool[Math.floor(Math.random() * pool.length)];
}

// ============================================================
// Summary helper — returns a readable snapshot of BKT state
// Useful for displaying in UI or logging
//
// @param {object} state  — full BKT state
// @returns {Array}       — array of { skill, pL, mastered, accuracy }
// ============================================================

function getBKTSummary(state) {
  return Object.entries(state).map(([skill, data]) => ({
    skill,
    pL:       parseFloat(data.pL.toFixed(3)),
    percent:  Math.round(data.pL * 100),
    mastered: data.mastered,
    attempts: data.attempts,
    accuracy: data.attempts > 0
      ? Math.round((data.correct / data.attempts) * 100)
      : 0,
  }));
}

// ============================================================
// Persist / restore state (localStorage for frontend use)
// ============================================================

function saveBKTState(state) {
  localStorage.setItem("bkt_state", JSON.stringify(state));
}

function loadBKTState() {
  const saved = localStorage.getItem("bkt_state");
  return saved ? JSON.parse(saved) : null;
}

function clearBKTState() {
  localStorage.removeItem("bkt_state");
}

// ============================================================
// Exports (works with both ES modules and CommonJS)
// ============================================================

const BKT = {
  initBKTState,
  updateBKT,
  getDifficulty,
  getWeakestSkill,
  selectQuestion,
  getBKTSummary,
  saveBKTState,
  loadBKTState,
  clearBKTState,
  MASTERY_THRESHOLD,
  DIFFICULTY_THRESHOLD,
  BKT_PARAMS,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = BKT;
} else if (typeof window !== "undefined") {
  window.BKT = BKT;
}

export default BKT;
