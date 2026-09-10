import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { PromoBanner } from '@/data/mock/promos'

const AUTOPLAY_MS = 6500

export type CarouselSlide = {
  id: string
  ariaLabel: string
  render: () => ReactNode
}

/**
 * Crossfades between slides of different natural heights (a short wide
 * photo banner vs. the taller brand hero) by measuring the active slide
 * and animating the container to match, rather than forcing every slide
 * into one fixed box. Stops autoplay for reduced-motion, on hover/focus,
 * and whenever there's only one slide.
 */
export function HeroCarousel({ slides }: { slides: CarouselSlide[] }) {
  const [index, setIndex] = useState(0)
  const [height, setHeight] = useState<number>()
  const [paused, setPaused] = useState(false)
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])

  useLayoutEffect(() => {
    const measure = () => {
      const el = slideRefs.current[index]
      if (el) setHeight(el.offsetHeight)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [index])

  useEffect(() => {
    if (slides.length < 2 || paused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, AUTOPLAY_MS)
    return () => window.clearInterval(timer)
  }, [slides.length, paused])

  const go = (next: number) => setIndex((next + slides.length) % slides.length)

  return (
    <div
      className="group relative overflow-hidden rounded-md shadow-card transition-[height] duration-500 ease-out"
      style={{ height }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured offers"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(index - 1)
        if (e.key === 'ArrowRight') go(index + 1)
      }}
    >
      {slides.map((slide, i) => {
        const active = i === index
        return (
          <div
            key={slide.id}
            ref={(el) => {
              slideRefs.current[i] = el
            }}
            className="absolute inset-x-0 top-0"
            style={{
              opacity: active ? 1 : 0,
              visibility: active ? 'visible' : 'hidden',
              transitionProperty: 'opacity, visibility',
              transitionDuration: '500ms, 0s',
              transitionDelay: active ? '0s, 0s' : '0s, 500ms',
              transitionTimingFunction: 'ease',
            }}
            aria-hidden={!active}
            role="group"
            aria-roledescription="slide"
            aria-label={slide.ariaLabel}
          >
            {slide.render()}
          </div>
        )
      })}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => go(index - 1)}
            className="absolute left-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-navy-950/35 text-white opacity-0 backdrop-blur transition-opacity hover:bg-navy-950/55 focus-visible:opacity-100 group-hover:opacity-100"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => go(index + 1)}
            className="absolute right-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-navy-950/35 text-white opacity-0 backdrop-blur transition-opacity hover:bg-navy-950/55 focus-visible:opacity-100 group-hover:opacity-100"
          >
            <ChevronRight size={18} />
          </button>

          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Go to slide ${i + 1}: ${slide.ariaLabel}`}
                aria-current={i === index}
                onClick={() => go(i)}
                className="h-1.5 rounded-full bg-white transition-all duration-300"
                style={{ width: i === index ? 20 : 7, opacity: i === index ? 0.95 : 0.45 }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function PromoBannerSlide({ banner }: { banner: PromoBanner }) {
  const img = (
    <img
      src={banner.image}
      alt={banner.alt}
      width={1400}
      height={460}
      loading="eager"
      className="block w-full"
    />
  )
  return banner.href ? (
    <Link to={banner.href} className="block" aria-label={banner.alt}>
      {img}
    </Link>
  ) : (
    img
  )
}
