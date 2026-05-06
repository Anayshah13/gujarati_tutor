'use client'

type Props = {
  value: number
  max?: number
  label?: string
  className?: string
}

export default function ProgressBar({ value, max = 10, label, className = '' }: Props) {
  const pct = Math.max(0, Math.min(100, (Math.min(value, max) / max) * 100))
  return (
    <div className={`space-y-1 ${className}`}>
      {label ? <p className="text-xs text-muted">{label}</p> : null}
      <div className="h-2 overflow-hidden rounded-full bg-cream ring-1 ring-card-border">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent via-accent-gold to-accent-soft transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
