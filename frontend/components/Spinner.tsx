export default function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10" role="status">
      <span
        className="size-10 animate-spin rounded-full border-2 border-accent/25 border-t-accent"
        style={{ borderTopColor: '#FF6B00' }}
        aria-hidden
      />
      {label ? <p className="text-sm font-medium text-brown">{label}</p> : null}
      <span className="sr-only">{label ?? 'Loading'}</span>
    </div>
  )
}
