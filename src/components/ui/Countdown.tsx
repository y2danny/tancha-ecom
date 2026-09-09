import { useEffect, useState } from 'react'
import { countdownTo, pad } from '@/lib/format'
import { cn } from '@/lib/cn'

export function Countdown({
  endsAt,
  tone = 'light',
  className,
}: {
  endsAt: string
  tone?: 'light' | 'dark'
  className?: string
}) {
  const [parts, setParts] = useState(() => countdownTo(endsAt))

  useEffect(() => {
    const id = window.setInterval(() => setParts(countdownTo(endsAt)), 1000)
    return () => window.clearInterval(id)
  }, [endsAt])

  const cell = cn(
    'rounded px-1.5 py-0.5 text-sm font-bold tabular',
    tone === 'dark' ? 'bg-white/15 text-white' : 'bg-navy-900 text-white',
  )

  if (parts.expired) {
    return <span className={cn('text-xs font-semibold uppercase tracking-wide', className)}>Deal closed</span>
  }

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {parts.days > 0 && (
        <>
          <span className={cell}>{pad(parts.days)}d</span>
          <span className="opacity-60">:</span>
        </>
      )}
      <span className={cell}>{pad(parts.hours)}</span>
      <span className="opacity-60">:</span>
      <span className={cell}>{pad(parts.minutes)}</span>
      <span className="opacity-60">:</span>
      <span className={cell}>{pad(parts.seconds)}</span>
    </span>
  )
}
