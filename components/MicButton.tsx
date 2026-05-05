'use client'

import { motion } from 'framer-motion'

type Props = {
  busy: boolean
  onPress: () => void
}

function MicGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm7-4a7 7 0 1 1-14 0H3a9 9 0 1 0 18 0h-2Zm-4 10H9v2h6v-2Z"
      />
    </svg>
  )
}

export default function MicButton({ busy, onPress }: Props) {
  return (
    <motion.button
      type="button"
      aria-label="Speak your answer — tap to record"
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.95 }}
      disabled={busy}
      onClick={onPress}
      className="relative isolate flex min-h-[88px] min-w-[88px] items-center justify-center rounded-full bg-gradient-to-br from-accent via-accent-gold to-accent-soft p-px text-white shadow-[0_18px_40px_-18px_rgba(255,107,0,0.65)] ring-4 ring-accent/35 transition disabled:opacity-65"
    >
      <span className="relative flex size-24 items-center justify-center rounded-full bg-card text-accent backdrop-blur">
        <MicGlyph className="size-11" />
      </span>
      {busy ? (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-[-10px] rounded-full border border-accent-gold/80"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.05, ease: 'linear' }}
        />
      ) : null}
    </motion.button>
  )
}
