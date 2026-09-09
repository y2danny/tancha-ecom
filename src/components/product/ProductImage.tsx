import type { CSSProperties, ReactNode } from 'react'
import type { ImageKey } from '@/types/catalog'
import { cn } from '@/lib/cn'

/**
 * Placeholder art, not decoration-for-its-own-sake: every product needs a
 * distinct silhouette so a dense grid is still scannable. When the client
 * supplies real photography, `product.imageUrl` wins and this is the fallback.
 */

type Art = { bg: string; body: string; accent: string; draw: () => ReactNode }

const P = {
  blue: { bg: '#e7effb', body: '#17406e', accent: '#4a85c9' },
  gold: { bg: '#fff4dd', body: '#8a5a09', accent: '#fdb51f' },
  green: { bg: '#e6f5ec', body: '#1c5c3a', accent: '#4caf7d' },
  rose: { bg: '#fdeaea', body: '#8c2724', accent: '#e0332f' },
  slate: { bg: '#eceff4', body: '#2c3a4d', accent: '#7c8da0' },
  violet: { bg: '#f0ebfa', body: '#432c7a', accent: '#8c6fd6' },
  teal: { bg: '#e3f4f5', body: '#125b62', accent: '#3ba7b0' },
}

const ART: Record<ImageKey, Art> = {
  backpack: {
    ...P.blue,
    draw: () => (
      <>
        <path d="M22 34c0-8 5-13 14-13s14 5 14 13v24a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4z" fill="var(--b)" />
        <path d="M28 21c0-5 3.5-8 8-8s8 3 8 8" fill="none" stroke="var(--b)" strokeWidth="3" />
        <rect x="28" y="38" width="16" height="13" rx="3" fill="var(--a)" />
        <rect x="33" y="43" width="6" height="3" rx="1.5" fill="var(--b)" />
      </>
    ),
  },
  notebook: {
    ...P.gold,
    draw: () => (
      <>
        <rect x="20" y="16" width="32" height="42" rx="3" fill="var(--b)" />
        <rect x="26" y="16" width="26" height="42" rx="3" fill="#fff" />
        <path d="M31 27h16M31 34h16M31 41h11" stroke="var(--a)" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="23" cy="24" r="2" fill="var(--a)" />
        <circle cx="23" cy="37" r="2" fill="var(--a)" />
        <circle cx="23" cy="50" r="2" fill="var(--a)" />
      </>
    ),
  },
  calculator: {
    ...P.slate,
    draw: () => (
      <>
        <rect x="22" y="14" width="28" height="46" rx="4" fill="var(--b)" />
        <rect x="27" y="20" width="18" height="10" rx="2" fill="var(--a)" />
        <g fill="#fff">
          <rect x="27" y="35" width="6" height="5" rx="1.5" />
          <rect x="36" y="35" width="6" height="5" rx="1.5" />
          <rect x="27" y="43" width="6" height="5" rx="1.5" />
          <rect x="36" y="43" width="6" height="5" rx="1.5" />
          <rect x="27" y="51" width="15" height="5" rx="1.5" />
        </g>
      </>
    ),
  },
  earbuds: {
    ...P.violet,
    draw: () => (
      <>
        <rect x="20" y="30" width="32" height="26" rx="8" fill="var(--b)" />
        <path d="M20 42h32" stroke="var(--a)" strokeWidth="2.5" />
        <circle cx="28" cy="20" r="7" fill="var(--a)" />
        <circle cx="44" cy="20" r="7" fill="var(--a)" />
        <path d="M28 26v6M44 26v6" stroke="var(--b)" strokeWidth="3.5" strokeLinecap="round" />
      </>
    ),
  },
  powerbank: {
    ...P.green,
    draw: () => (
      <>
        <rect x="24" y="14" width="24" height="46" rx="5" fill="var(--b)" />
        <path d="M37 24l-7 13h6l-2 10 8-14h-6z" fill="var(--a)" />
        <rect x="29" y="52" width="14" height="3" rx="1.5" fill="var(--a)" />
      </>
    ),
  },
  lunchbox: {
    ...P.rose,
    draw: () => (
      <>
        <rect x="18" y="26" width="36" height="30" rx="5" fill="var(--b)" />
        <rect x="18" y="26" width="36" height="8" rx="4" fill="var(--a)" />
        <path d="M30 22h12" stroke="var(--b)" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M30 18a6 6 0 0 1 12 0" fill="none" stroke="var(--b)" strokeWidth="3" />
        <rect x="32" y="40" width="8" height="7" rx="2" fill="var(--a)" />
      </>
    ),
  },
  shoes: {
    ...P.slate,
    draw: () => (
      <>
        <path d="M16 44c6-2 10-6 13-12 5 5 12 7 19 8 4 .6 6 3 6 7v3H16z" fill="var(--b)" />
        <path d="M14 50h44v5a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3z" fill="var(--a)" />
        <path d="M31 34l5 4M35 30l5 4" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      </>
    ),
  },
  uniform: {
    ...P.teal,
    draw: () => (
      <>
        <path d="M26 16l6 4 6-4 12 6-4 10-4-2v28H22V30l-4 2-4-10z" fill="var(--b)" />
        <path d="M32 20l4 8 4-8" fill="none" stroke="var(--a)" strokeWidth="2.6" />
        <path d="M36 32v18" stroke="var(--a)" strokeWidth="2.2" strokeDasharray="3 3" />
      </>
    ),
  },
  trousers: {
    ...P.slate,
    draw: () => (
      <>
        <path d="M22 14h28l-2 12-2 32h-8l-2-24-2 24h-8l-2-32z" fill="var(--b)" />
        <rect x="21" y="14" width="30" height="6" rx="2" fill="var(--a)" />
        <path d="M36 24v10" stroke="var(--a)" strokeWidth="2.4" strokeLinecap="round" />
      </>
    ),
  },
  skirt: {
    ...P.teal,
    draw: () => (
      <>
        <path d="M25 20h22l9 34H16z" fill="var(--b)" />
        <rect x="24" y="14" width="24" height="7" rx="2.5" fill="var(--a)" />
        <path d="M28 24l-4 30M36 24v30M44 24l4 30" stroke="var(--a)" strokeWidth="2" strokeOpacity=".75" />
      </>
    ),
  },
  sweater: {
    ...P.violet,
    draw: () => (
      <>
        <path d="M26 18h20l12 8-5 11-5-3v22H24V34l-5 3-5-11z" fill="var(--b)" />
        <rect x="24" y="50" width="24" height="6" rx="3" fill="var(--a)" />
        <path d="M30 18a6 6 0 0 0 12 0" fill="none" stroke="var(--a)" strokeWidth="2.6" />
      </>
    ),
  },
  pens: {
    ...P.blue,
    draw: () => (
      <>
        <path d="M24 12h8v34l-4 10-4-10z" fill="var(--b)" />
        <path d="M24 12h8v8h-8z" fill="var(--a)" />
        <path d="M40 18h8v28l-4 10-4-10z" fill="var(--a)" />
        <path d="M40 18h8v7h-8z" fill="var(--b)" />
      </>
    ),
  },
  bottle: {
    ...P.teal,
    draw: () => (
      <>
        <rect x="29" y="10" width="12" height="8" rx="2" fill="var(--a)" />
        <path d="M27 20h16a4 4 0 0 1 4 4v30a6 6 0 0 1-6 6H29a6 6 0 0 1-6-6V24a4 4 0 0 1 4-4z" fill="var(--b)" />
        <rect x="27" y="32" width="20" height="10" rx="2" fill="#fff" fillOpacity=".85" />
      </>
    ),
  },
  tablet: {
    ...P.slate,
    draw: () => (
      <>
        <rect x="18" y="14" width="36" height="46" rx="5" fill="var(--b)" />
        <rect x="23" y="20" width="26" height="32" rx="2" fill="#fff" />
        <circle cx="36" cy="56" r="2.4" fill="var(--a)" />
        <path d="M28 30h14M28 37h10" stroke="var(--a)" strokeWidth="2.6" strokeLinecap="round" />
      </>
    ),
  },
  lamp: {
    ...P.gold,
    draw: () => (
      <>
        <path d="M23 28l13-16 13 16z" fill="var(--b)" />
        <rect x="21" y="27" width="30" height="5" rx="2.5" fill="var(--a)" />
        <circle cx="36" cy="37" r="4.5" fill="var(--a)" />
        <path d="M36 41v11" stroke="var(--b)" strokeWidth="3.5" strokeLinecap="round" />
        <rect x="24" y="52" width="24" height="5" rx="2.5" fill="var(--b)" />
      </>
    ),
  },
  sportsbag: {
    ...P.rose,
    draw: () => (
      <>
        <rect x="14" y="28" width="44" height="26" rx="9" fill="var(--b)" />
        <path d="M28 28v-4a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v4" fill="none" stroke="var(--b)" strokeWidth="3.2" />
        <rect x="26" y="36" width="20" height="9" rx="3" fill="var(--a)" />
      </>
    ),
  },
  geometry: {
    ...P.violet,
    draw: () => (
      <>
        <path d="M14 52h30L14 22z" fill="var(--b)" />
        <path d="M22 46h10l-10-10z" fill="#fff" />
        <path d="M40 20l16 26H40z" fill="var(--a)" />
      </>
    ),
  },
  socks: {
    ...P.green,
    draw: () => (
      <>
        <path d="M25 19h16v20c0 4 3 6 8.5 8.5 6.5 3 9.5 7 9.5 12 0 4-3.5 6.5-9 6.5h-9c-9 0-16-6-16-15z" fill="var(--b)" />
        <rect x="24" y="11" width="18" height="8" rx="2" fill="var(--a)" />
        <path d="M24 44c6 3 13 3 19 0" fill="none" stroke="var(--a)" strokeWidth="3" strokeLinecap="round" />
      </>
    ),
  },
  crayons: {
    ...P.gold,
    draw: () => (
      <>
        <path d="M20 24l5-9 5 9v34h-10z" fill="var(--b)" />
        <path d="M32 24l5-9 5 9v34H32z" fill="var(--a)" />
        <path d="M44 24l5-9 5 9v34H44z" fill="var(--b)" fillOpacity=".7" />
      </>
    ),
  },
}

export function ProductImage({
  imageKey,
  imageUrl,
  alt,
  className,
}: {
  imageKey: ImageKey
  imageUrl?: string | null
  alt: string
  className?: string
}) {
  if (imageUrl) {
    return <img src={imageUrl} alt={alt} className={cn('h-full w-full object-cover', className)} loading="lazy" />
  }
  const art = ART[imageKey] ?? ART.notebook
  return (
    <svg
      viewBox="0 0 72 72"
      className={cn('h-full w-full', className)}
      role="img"
      aria-label={alt}
      style={
        {
          '--b': art.body,
          '--a': art.accent,
          background: art.bg,
        } as CSSProperties
      }
    >
      {art.draw()}
    </svg>
  )
}
