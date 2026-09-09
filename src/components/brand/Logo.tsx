import { cn } from '@/lib/cn'

/**
 * The client's supplied mark, background keyed out and trimmed.
 *
 * Two variants exist because the mark is mid-blue line art: it disappears
 * against the navy header. So the primary lockup sits the real brand-blue mark
 * in a white chip (reads like an app icon, keeps the actual brand colour), and
 * secondary surfaces get the monochrome white mark.
 *
 * Sizing is an inline style, not a Tailwind class, so a caller can always
 * override it — two competing `h-*` classes are decided by stylesheet order,
 * not by the order you wrote them.
 */

const SRC = {
  blue: '/logo-mark.png',
  white: '/logo-mark-white.png',
} as const

export type LogoVariant = 'chip' | 'white' | 'blue'

export function LogoMark({
  variant = 'chip',
  size = 36,
  className,
}: {
  variant?: LogoVariant
  size?: number
  className?: string
}) {
  if (variant === 'chip') {
    return (
      <span
        className={cn('grid shrink-0 place-items-center rounded-xl bg-white shadow-card', className)}
        style={{ height: size, width: size, padding: Math.round(size * 0.07) }}
      >
        <img
          src={SRC.blue}
          alt="Tancha"
          className="h-full w-full object-contain"
          decoding="async"
        />
      </span>
    )
  }

  return (
    <img
      src={variant === 'white' ? SRC.white : SRC.blue}
      alt="Tancha"
      className={cn('shrink-0 object-contain', className)}
      style={{ height: size, width: size }}
      decoding="async"
    />
  )
}

export function Logo({
  variant = 'chip',
  size = 44,
  className,
  markClassName,
  showWordmark = true,
}: {
  variant?: LogoVariant
  size?: number
  className?: string
  markClassName?: string
  showWordmark?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark variant={variant} size={size} className={markClassName} />
      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span className="text-[1.35rem] font-extrabold tracking-tight">Tancha</span>
          <span className="text-[0.55rem] font-semibold uppercase tracking-[0.22em] opacity-70">
            Producer direct
          </span>
        </span>
      )}
    </span>
  )
}
