'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'

type Props = {
  level: number
  direction?: 'up' | 'down' | 'none'
}

export default function LevelDisplay({ level, direction = 'none' }: Props) {
  const reduced = useReducedMotion()
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    if (direction === 'none' || reduced) return
    setFlash(direction)
    const id = window.setTimeout(() => setFlash(null), 520)
    return () => window.clearTimeout(id)
  }, [direction, level, reduced])

  const textShadow =
    flash === 'up'
      ? '0 0 28px rgba(46, 125, 50, 0.55), 0 0 56px rgba(255, 179, 0, 0.35)'
      : flash === 'down'
        ? '0 0 28px rgba(198, 40, 40, 0.55), 0 0 48px rgba(230, 81, 0, 0.35)'
        : 'none'

  return (
    <motion.div
      key={level}
      initial={reduced ? false : { scale: 0.94, opacity: 0 }}
      animate={
        reduced
          ? {}
          : {
              scale: flash ? 1.06 : 1,
              opacity: 1,
              textShadow,
            }
      }
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      className="tabular-nums text-5xl font-bold leading-none text-ink md:text-[3rem]"
    >
      {level}
    </motion.div>
  )
}
