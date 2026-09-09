import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'flash' | 'gold' | 'navy' | 'green' | 'muted'

const TONES: Record<Tone, string> = {
  flash: 'bg-flash text-white',
  gold: 'bg-gold-100 text-gold-800',
  navy: 'bg-navy-700 text-white',
  green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  muted: 'bg-canvas text-muted ring-1 ring-hairline',
}

export function Badge({
  tone = 'muted',
  className,
  children,
}: {
  tone?: Tone
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
