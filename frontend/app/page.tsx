'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'

function FloatingQuestionMockup({ reduced }: { reduced: boolean | null }) {
  const opts = ['A. Kem cho?', 'B. Namaste', 'C. Shu naam?', 'D. Maja ma']
  return (
    <motion.div
      initial={reduced ? false : { y: 0 }}
      animate={reduced ? {} : { y: [0, -10, 0] }}
      transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
      className="mx-auto w-full max-w-md"
      style={{ rotate: '-2deg' }}
    >
      <div className="rounded-2xl border border-card-border bg-card p-6 shadow-[0_28px_80px_-28px_rgba(26,10,0,0.35)]">
        <span className="inline-block rounded-full bg-cream px-3 py-1 text-xs font-semibold text-accent">
          Greetings
        </span>
        <p className="mt-4 text-lg font-semibold text-ink">How do you say Hello?</p>
        <p className="gujarati-text mt-2 text-4xl font-bold text-ink">નમસ્તે</p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          {opts.map((o) => (
            <span
              key={o}
              className="rounded-xl border border-card-border bg-cream/90 px-3 py-2 text-center text-xs font-semibold text-brown"
            >
              {o}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

const bands = [
  { name: 'Band 1 — Beginner', desc: 'Greetings, numbers, basic words', border: '#FFB300' },
  { name: 'Band 2 — Elementary', desc: 'Gender, pronouns, simple sentences', border: '#FF8F00' },
  { name: 'Band 3 — Intermediate', desc: 'Postpositions, verb forms', border: '#FF6B00' },
  { name: 'Band 4 — Advanced', desc: 'SOV structure, complex sentences', border: '#E65100' },
  { name: 'Band 5 — Expert', desc: 'Full Gujarati, idioms, paragraphs', border: '#C62828' },
]

export default function LandingPage() {
  const reduced = useReducedMotion()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToFeatures = useMemo(
    () => () => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }),
    []
  )

  return (
    <div className="min-h-dvh bg-surface text-ink">
      <header
        className={`sticky top-0 z-50 border-b transition-colors duration-200 ${
          scrolled ? 'border-card-border bg-surface/85 backdrop-blur-md' : 'border-transparent bg-surface'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-8">
          <Link href="/" className="flex items-baseline gap-1 font-bold">
            <span className="gujarati-text text-xl text-accent">ગ</span>
            <span className="text-lg font-extrabold text-accent md:text-xl">Guj-Gyani</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-3 md:gap-5">
            <button
              type="button"
              onClick={scrollToFeatures}
              className="text-sm font-semibold text-brown hover:text-accent-burnt"
            >
              How it works
            </button>
            <Link href="/admin" className="text-sm font-semibold text-brown hover:text-accent-burnt">
              Admin
            </Link>
            <Link
              href="/placement"
              className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:scale-105 hover:bg-accent-burnt"
            >
              Start Learning
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-5 pb-20 pt-14 md:px-8 md:pb-28 md:pt-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,179,0,0.15),_transparent_55%)]" />
          <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduced ? 0 : 0.65 }}
              className="inline-flex items-center rounded-full border border-accent-gold bg-cream px-4 py-2 text-xs font-semibold text-accent md:text-sm"
            >
              ✦ Adaptive · Offline-First · Gujarati
            </motion.div>

            <motion.h1
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduced ? 0 : 0.06, duration: reduced ? 0 : 0.65 }}
              className="mt-8 text-[clamp(2.25rem,6vw,4rem)] font-extrabold leading-[1.08] tracking-tight text-ink"
              style={{ fontWeight: 800 }}
            >
              Learn Gujarati.
              <br />
              <span className="hero-gradient-text">The smart way.</span>
            </motion.h1>

            <motion.p
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduced ? 0 : 0.12 }}
              className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-brown"
            >
              Guj-Gyani adapts to your exact level. Answer questions, speak Gujarati, and watch the system learn you.
            </motion.p>

            <motion.div
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduced ? 0 : 0.18 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-4"
            >
              <Link
                href="/placement"
                className="rounded-xl bg-accent px-6 py-3 text-base font-semibold text-white shadow-md transition-all duration-200 hover:scale-105 hover:bg-accent-burnt"
              >
                Begin Journey →
              </Link>
              <button
                type="button"
                onClick={scrollToFeatures}
                className="rounded-xl border-2 border-accent bg-transparent px-6 py-3 text-base font-semibold text-accent transition-all duration-200 hover:scale-105 hover:bg-cream"
              >
                See how it works ↓
              </button>
            </motion.div>

            <motion.div
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduced ? 0 : 0.28 }}
              className="mt-12 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-muted md:text-sm"
            >
              <span>100+ Questions</span>
              <span className="hidden h-4 w-px bg-card-border sm:block" aria-hidden />
              <span>5 Skill Bands</span>
              <span className="hidden h-4 w-px bg-card-border sm:block" aria-hidden />
              <span>AI-Powered</span>
            </motion.div>

            <div className="mt-16 w-full">
              <FloatingQuestionMockup reduced={reduced} />
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-card-border bg-cream/40 px-5 py-20 md:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-bold text-ink md:text-4xl">How Guj-Gyani Works</h2>
              <p className="mt-3 text-lg text-brown">Three things that make it different</p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: '🎯',
                  title: 'Knows Your Level',
                  body: '10-question placement test maps you to one of 100 levels. No guessing. No one-size-fits-all.',
                },
                {
                  icon: '🔤',
                  title: 'Script Fade System',
                  body: 'As your level rises, English fades out. By Level 60, you\'re reading pure Gujarati. The app forces you to actually learn.',
                },
                {
                  icon: '🎤',
                  title: 'Speak & Be Heard',
                  body: 'Pronunciation questions use your mic. Speak Gujarati, get scored instantly. Text-to-speech reads every question aloud.',
                },
              ].map((card) => (
                <motion.article
                  key={card.title}
                  initial={reduced ? false : { opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: reduced ? 0 : 0.45 }}
                  className="rounded-2xl border border-card-border bg-card p-7 shadow-card transition-shadow hover:shadow-card-hover"
                >
                  <div className="flex size-14 items-center justify-center rounded-full bg-cream text-3xl">{card.icon}</div>
                  <h3 className="mt-5 text-xl font-bold text-ink">{card.title}</h3>
                  <p className="mt-3 leading-relaxed text-brown">{card.body}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-card-border px-5 py-20 md:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold text-ink md:text-left md:text-4xl">
              5 Levels of Mastery
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {bands.map((b) => (
                <div
                  key={b.name}
                  className="rounded-2xl border border-card-border bg-card py-4 pl-6 pr-5 shadow-card transition-shadow hover:shadow-card-hover"
                  style={{ borderLeftWidth: 4, borderLeftColor: b.border }}
                >
                  <p className="font-bold text-ink">{b.name}</p>
                  <p className="mt-2 text-sm leading-relaxed text-brown">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="border-t border-card-border bg-surface px-5 py-14 text-center md:px-8">
          <p className="gujarati-text text-2xl font-semibold text-accent">ગુજ-જ્ઞાની</p>
          <p className="mt-4 text-sm text-muted">
            Guj-Gyani · Built at DJ Sanghvi COE · IPD 2025-26
          </p>
        </footer>
      </main>
    </div>
  )
}
