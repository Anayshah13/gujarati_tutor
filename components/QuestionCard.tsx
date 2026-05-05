'use client'

import SpeakButton from '@/components/SpeakButton'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import MicButton from '@/components/MicButton'
import OptionButton from '@/components/OptionButton'
import type { QuizQuestion } from '@/types/question'

type Feedback = null | 'correct' | 'wrong' | 'almost'

type Props = {
  question: QuizQuestion
  mode: 'quiz' | 'placement'
  loading?: boolean
  feedback?: Feedback
  transcript: string
  listening: boolean
  onMic: () => void
  onMcqPick: (opt: string) => void
  onPronSubmit: () => void
  selectedOption?: string | null
}

export default function QuestionCard({
  question,
  mode: _mode,
  loading,
  feedback,
  transcript,
  listening,
  onMic,
  onMcqPick,
  onPronSubmit,
  selectedOption,
}: Props) {
  const reduced = useReducedMotion()
  const showOverlay =
    !!feedback && (feedback === 'correct' || feedback === 'wrong' || feedback === 'almost')
  const locked = Boolean(feedback)
  const pronRoman =
    question.type === 'pronunciation' ? question.pronunciationTarget?.trim() ?? '' : ''

  function optionHighlight(option: string): 'none' | 'correct' | 'wrong' | 'neutral' {
    if (!locked || question.type !== 'mcq') return 'none'
    const isCorrect = option === question.answer
    const pickedThis = selectedOption === option
    if (isCorrect) return 'correct'
    if (pickedThis) return 'wrong'
    return 'neutral'
  }

  const pronSubmitDisabled = listening || locked

  return (
    <motion.article
      layout
      initial={reduced ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full overflow-hidden rounded-2xl border border-card-border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hover md:p-8"
    >
      <AnimatePresence>
        {showOverlay ? (
          <motion.div
            aria-hidden
            key={feedback ?? 'none'}
            initial={{ opacity: 0 }}
            animate={{
              opacity: feedback === 'correct' ? 0.12 : feedback === 'almost' ? 0.1 : 0.14,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-none absolute inset-0 ${
              feedback === 'correct' ? 'bg-success' : feedback === 'almost' ? 'bg-warn' : 'bg-error'
            }`}
          />
        ) : null}
      </AnimatePresence>

      <div className="relative space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-cream px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brown">
            {question.skill}
          </span>
          <span className="rounded-full border border-accent-gold/80 px-2 py-1 text-[11px] font-semibold text-accent">
            Band {question.band}
          </span>
          {loading ? (
            <span className="ml-auto inline-flex items-center gap-2 text-xs text-muted">
              <span className="size-4 animate-spin rounded-full border border-accent/30 border-t-accent" />{' '}
              Generating...
            </span>
          ) : null}
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold leading-snug text-ink md:text-xl">{question.question}</h2>
          <p className="gujarati-text text-[clamp(22px,3.4vw,32px)] font-semibold leading-relaxed tracking-tight text-ink">
            {question.gujaratiText}
          </p>
          {pronRoman ? (
            <p className="text-base font-medium leading-snug text-brown">
              <span className="sr-only">Transliteration: </span>
              <span aria-hidden>(</span>
              {pronRoman}
              <span aria-hidden>)</span>
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <SpeakButton text={question.question} lang="en" label="Hear Question" size="sm" />
          <SpeakButton
            text={question.gujaratiText}
            lang="gu"
            romanAfterGu={pronRoman || undefined}
            label="Hear Gujarati"
            size="sm"
          />
        </div>

        {question.type === 'mcq' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {question.options.map((opt) => (
              <OptionButton
                key={opt}
                highlight={optionHighlight(opt)}
                disabled={locked}
                label={opt}
                onClick={() => onMcqPick(opt)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center">
              <MicButton busy={listening} onPress={onMic} />
              <div className="w-full max-w-md rounded-xl border border-card-border bg-cream/60 p-4 text-sm shadow-sm">
                <p className="text-muted">
                  Tap mic and say it out loud (English transliteration is ok). If nothing is captured, tap again or
                  submit anyway — blank counts as a miss.
                </p>
                <p className="mt-2 min-h-[40px] text-base text-ink">
                  <span className="text-muted">Transcript:&nbsp;</span>
                  <span>{transcript || '—'}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                disabled={listening || locked}
                onClick={onMic}
                className="rounded-xl border-2 border-accent px-4 py-2 text-sm font-semibold text-accent transition-all duration-200 hover:bg-cream disabled:opacity-45"
              >
                Try mic again
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                disabled={pronSubmitDisabled}
                onClick={onPronSubmit}
                className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-md ring-1 ring-accent-gold/40 transition-all duration-200 hover:bg-accent-burnt disabled:cursor-not-allowed disabled:opacity-50"
              >
                Submit pronunciation
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </motion.article>
  )
}
