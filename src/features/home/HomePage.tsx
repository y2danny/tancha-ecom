import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, GraduationCap, PackageCheck, Sparkles } from 'lucide-react'
import { db } from '@/data'
import { useAsync } from '@/hooks/useAsync'
import { categories } from '@/data/mock/categories'
import { promoBanners } from '@/data/mock/promos'
import { HeroCarousel, PromoBannerSlide, type CarouselSlide } from '@/components/home/HeroCarousel'
import { ProductImage } from '@/components/product/ProductImage'
import { ProductGrid, ProductRail } from '@/components/product/ProductGrid'
import { DealStrip } from '@/components/product/DealStrip'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ButtonLink } from '@/components/ui/Button'
import { Countdown } from '@/components/ui/Countdown'
import type { ImageKey, Product } from '@/types/catalog'

/**
 * Each hero tile cycles through three products on its own offset timer, so the
 * block reads as a moving shelf rather than four static thumbnails. Stops
 * entirely for anyone who has asked the OS to reduce motion.
 *
 * These four groups are just the *theme* per tile (bags & footwear, tech,
 * apparel, everyday essentials) — pickHeroImages() below swaps each key for
 * a real product photo the admin has uploaded, and only falls back to the
 * illustration when nothing's been photographed for that slot yet. Nothing
 * here needs editing as more products get real photos — it picks them up
 * automatically.
 */
const HERO_TILES: ImageKey[][] = [
  ['backpack', 'sportsbag', 'shoes'],
  ['calculator', 'tablet', 'powerbank'],
  ['uniform', 'trousers', 'socks'],
  ['lunchbox', 'bottle', 'notebook'],
]

type HeroTileItem = { imageKey: ImageKey; imageUrl: string | null; alt: string }

function pickHeroImages(products: Product[]): HeroTileItem[][] {
  const byKey = new Map<ImageKey, Product[]>()
  for (const p of products) {
    const list = byKey.get(p.imageKey)
    if (list) list.push(p)
    else byKey.set(p.imageKey, [p])
  }
  // Real photos first within each key, so a photographed product always wins
  // over an illustration-only one sharing the same key.
  for (const list of byKey.values()) {
    list.sort((a, b) => Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl)))
  }

  const used = new Set<string>()
  return HERO_TILES.map((keys) =>
    keys.map((key): HeroTileItem => {
      const candidates = byKey.get(key) ?? []
      const pick = candidates.find((p) => !used.has(p.id)) ?? candidates[0]
      if (pick) used.add(pick.id)
      return { imageKey: key, imageUrl: pick?.imageUrl ?? null, alt: pick?.name ?? '' }
    }),
  )
}

const TILE_INTERVAL_MS = 3200

function HeroTile({
  items,
  offsetMs,
  lifted,
}: {
  items: HeroTileItem[]
  offsetMs: number
  lifted: boolean
}) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let interval: number | undefined
    const start = window.setTimeout(() => {
      setIndex((i) => (i + 1) % items.length)
      interval = window.setInterval(
        () => setIndex((i) => (i + 1) % items.length),
        TILE_INTERVAL_MS,
      )
    }, offsetMs + TILE_INTERVAL_MS)
    return () => {
      window.clearTimeout(start)
      if (interval) window.clearInterval(interval)
    }
  }, [items.length, offsetMs])

  return (
    <div
      className="relative overflow-hidden rounded-md bg-white/95 shadow-lift transition-transform duration-500"
      style={{ transform: lifted ? 'translateY(14px)' : undefined }}
    >
      <span className="block aspect-square">
        {items.map((item, i) => (
          <span
            key={`${item.imageKey}-${i}`}
            aria-hidden={i !== index}
            className="absolute inset-0 transition-all duration-700 ease-out"
            style={{
              opacity: i === index ? 1 : 0,
              transform: i === index ? 'scale(1)' : 'scale(1.06)',
            }}
          >
            <ProductImage imageKey={item.imageKey} imageUrl={item.imageUrl} alt={item.alt} />
          </span>
        ))}
      </span>

      <span className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
        {items.map((item, i) => (
          <span
            key={`${item.imageKey}-${i}`}
            className="h-1 rounded-full bg-navy-900 transition-all duration-500"
            style={{ width: i === index ? 14 : 5, opacity: i === index ? 0.55 : 0.18 }}
          />
        ))}
      </span>
    </div>
  )
}

function Hero() {
  const { data: deals } = useAsync(() => db.deals.listActiveDeals(), [], [])
  const dayDeal = deals.find((d) => d.kind === 'day')

  const { data: heroProducts } = useAsync(
    () => db.catalog.listProducts({ perPage: 100 }),
    [],
    { items: [], total: 0, page: 1, perPage: 100, pageCount: 1 },
  )
  const heroTiles = pickHeroImages(heroProducts.items)

  return (
    <section className="bg-gradient-to-br from-navy-800 via-navy-700 to-navy-900 text-white">
      <div className="grid items-center gap-6 p-6 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:p-10">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-400 px-3 py-1 text-xs font-bold uppercase tracking-wide text-navy-950">
            <GraduationCap size={14} />
            Back-to-school season
          </span>

          <h1 className="mt-4 text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl">
            The whole school list.
            <br />
            <span className="text-gold-300">Up to 62% off.</span>
          </h1>

          <p className="mt-4 max-w-lg text-sm leading-relaxed text-navy-100 sm:text-base">
            Bags, books, uniforms, calculators, lunch flasks — bought straight from the producers
            and sold at the price that leaves. No market markup, no three middlemen, no story.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ButtonLink to="/c/books-stationery" variant="deal" size="lg">
              Shop the school list
              <ArrowRight size={17} />
            </ButtonLink>
            <ButtonLink
              to="/deals"
              variant="outline"
              size="lg"
              className="border-white/40 text-white hover:bg-white/10"
            >
              See today&apos;s deals
            </ButtonLink>
          </div>

          {dayDeal && (
            <div className="mt-6 inline-flex flex-wrap items-center gap-3 rounded-md bg-white/10 px-4 py-2.5 backdrop-blur">
              <span className="text-xs font-bold uppercase tracking-wide text-gold-300">
                Deal of the day ends in
              </span>
              <Countdown endsAt={dayDeal.endsAt} tone="dark" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {heroTiles.map((items, i) => (
            <HeroTile key={i} items={items} offsetMs={i * 900} lifted={i % 2 === 1} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
        {[
          ['62%', 'off school essentials'],
          ['14 days', 'nationwide delivery'],
          ['₦0', 'delivery over ₦30,000'],
          ['Pay later', 'cash on delivery'],
        ].map(([big, small]) => (
          <div key={small} className="bg-navy-900/60 px-4 py-3 text-center">
            <p className="text-lg font-extrabold text-gold-300 tabular">{big}</p>
            <p className="text-[0.7rem] uppercase tracking-wide text-navy-200">{small}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function CategoryTiles() {
  return (
    <section className="rounded-md bg-white shadow-card">
      <SectionHeader kicker="Start here" title="Shop by category" to="/c/books-stationery" />
      <div className="grid grid-cols-3 gap-px bg-hairline sm:grid-cols-6">
        {categories.map((c) => (
          <Link
            key={c.id}
            to={`/c/${c.slug}`}
            className="group flex flex-col items-center gap-2 bg-white px-2 py-5 text-center transition-colors hover:bg-navy-50"
          >
            <span className="h-14 w-14 overflow-hidden rounded-full ring-1 ring-hairline transition-transform group-hover:scale-105">
              <ProductImage imageKey={c.imageKey} alt={c.name} />
            </span>
            <span className="text-xs font-semibold leading-tight text-ink">{c.name}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function DealSection() {
  const { data: deals, loading } = useAsync(() => db.deals.listActiveDeals(), [], [])
  const ids = deals.flatMap((d) => d.productIds)
  const { data: products } = useAsync(() => db.catalog.getProductsByIds(ids), [ids.join(',')], [])
  const byId = new Map(products.map((p) => [p.id, p]))

  return (
    <div className="space-y-4">
      {deals.map((deal) => (
        <DealStrip
          key={deal.id}
          deal={deal}
          loading={loading || products.length === 0}
          products={deal.productIds.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p))}
        />
      ))}
    </div>
  )
}

function TrustBand() {
  return (
    <section className="grid gap-px overflow-hidden rounded-md bg-hairline shadow-card sm:grid-cols-3">
      {[
        {
          icon: PackageCheck,
          title: 'Straight from the producer',
          body: 'We buy at the factory, not the market. That gap is the whole business.',
        },
        {
          icon: Sparkles,
          title: 'Capacity and quality, tested',
          body: 'Power banks are capacity-tested per batch. Calculators are distributor-sourced.',
        },
        {
          icon: GraduationCap,
          title: 'Built around the school list',
          body: 'Range picked from real Nigerian requirement lists, not a factory catalogue.',
        },
      ].map(({ icon: Icon, title, body }) => (
        <div key={title} className="bg-white p-5">
          <Icon className="text-navy-600" size={22} />
          <h3 className="mt-2.5 text-sm font-bold">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
        </div>
      ))}
    </section>
  )
}

function BestSellers() {
  const { data, loading } = useAsync(
    () => db.catalog.listProducts({ sort: 'bestselling', perPage: 10 }),
    [],
    { items: [], total: 0, page: 1, perPage: 10, pageCount: 1 },
  )
  return (
    <section className="rounded-md bg-white shadow-card">
      <SectionHeader
        kicker="Moving fastest"
        title="Bestsellers this season"
        to="/search?q=&sort=bestselling"
        linkLabel="See all"
      />
      {loading ? (
        <div className="p-3">
          <ProductGrid products={[]} loading skeletonCount={5} />
        </div>
      ) : (
        <ProductRail products={data.items} />
      )}
    </section>
  )
}

function NewArrivals() {
  const { data, loading } = useAsync(
    () => db.catalog.listProducts({ sort: 'newest', perPage: 10 }),
    [],
    { items: [], total: 0, page: 1, perPage: 10, pageCount: 1 },
  )
  return (
    <section className="rounded-md bg-white shadow-card">
      <SectionHeader kicker="Just landed" title="New in stock" to="/search?q=&sort=newest" />
      {loading ? (
        <div className="p-3">
          <ProductGrid products={[]} loading skeletonCount={5} />
        </div>
      ) : (
        <ProductRail products={data.items} />
      )}
    </section>
  )
}

function EverythingGrid() {
  const { data, loading } = useAsync(
    () => db.catalog.listProducts({ sort: 'relevance', perPage: 20 }),
    [],
    { items: [], total: 0, page: 1, perPage: 20, pageCount: 1 },
  )
  return (
    <section className="rounded-md bg-white p-3 shadow-card">
      <SectionHeader kicker="The full launch range" title="Everything for resumption" />
      <div className="pt-3">
        <ProductGrid products={data.items} loading={loading} skeletonCount={10} />
      </div>
      <div className="flex justify-center py-5">
        <ButtonLink to="/search?q=" variant="outline">
          Browse the full catalogue
          <ArrowRight size={16} />
        </ButtonLink>
      </div>
    </section>
  )
}

/**
 * Photo promo banners lead the carousel — they're the scroll-stopping
 * "offer" graphics — with the evergreen brand hero (headline, CTAs, live
 * deal countdown) as the last slide so it's always reachable even before
 * more promos exist. Add a new banner in `src/data/mock/promos.ts` and it
 * shows up here automatically.
 */
function buildHeroSlides(): CarouselSlide[] {
  return [
    ...promoBanners.map((banner) => ({
      id: banner.id,
      ariaLabel: banner.alt,
      render: () => <PromoBannerSlide banner={banner} />,
    })),
    {
      id: 'brand-hero',
      ariaLabel: "Tancha — the whole school list, up to 62% off",
      render: () => <Hero />,
    },
  ]
}

export function HomePage() {
  const heroSlides = buildHeroSlides()
  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-3 py-4 sm:px-4">
      <HeroCarousel slides={heroSlides} />
      <CategoryTiles />
      <DealSection />
      <BestSellers />
      <TrustBand />
      <NewArrivals />
      <EverythingGrid />
    </div>
  )
}
