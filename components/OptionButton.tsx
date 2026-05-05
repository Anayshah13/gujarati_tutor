'use client'

import { motion } from 'framer-motion'

type Props = {
  label: string
  onClick: () => void
  disabled?: boolean
  highlight?: 'none' | 'correct' | 'wrong' | 'neutral'
}

const ring: Record<NonNullable<Props['highlight']>, string> = {
  none: 'border-card-border hover:border-accent hover:bg-cream/80',
  correct: 'border-success ring-2 ring-success shadow-[0_0_24px_-8px_rgba(46,125,50,0.55)]',
  wrong: 'border-error opacity-90 ring-2 ring-error/70',
  neutral: 'border-card-border opacity-95',
}

export default function OptionButton({ label, onClick, disabled, highlight = 'none' }: Props) {
  return (
    <motion.button
      type="button"
      aria-label={`Option ${label}`}
      whileHover={disabled ? undefined : { scale: 1.05 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      className={`rounded-xl border-2 bg-card px-5 py-3 text-left text-sm font-semibold text-ink shadow-card transition-all duration-200 hover:shadow-card-hover sm:px-6 sm:text-base ${ring[highlight]} ${
        disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer'
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </motion.button>
  )
}
