import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, Phone, Search, ShoppingCart, User, X } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { ProductImage } from '@/components/product/ProductImage'
import { useCart } from '@/store/cart'
import { db } from '@/data'
import { site, announcements } from '@/config/site'
import { formatNaira } from '@/lib/format'
import type { Product } from '@/types/catalog'
import { categories } from '@/data/mock/categories'
import { cn } from '@/lib/cn'

function AnnouncementBar() {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setIndex((i) => (i + 1) % announcements.length), 4200)
    return () => window.clearInterval(id)
  }, [])
  return (
    <div className="bg-navy-950 text-white">
      <div className="mx-auto flex h-9 max-w-[1400px] items-center justify-between gap-4 px-4 text-xs">
        <p key={index} className="animate-rise truncate font-medium">
          {announcements[index]}
        </p>
        <a
          href={`tel:${site.supportPhone.replace(/\s/g, '')}`}
          className="hidden shrink-0 items-center gap-1.5 font-semibold text-navy-100 hover:text-white sm:flex"
        >
          <Phone size={13} />
          {site.supportPhone}
        </a>
      </div>
    </div>
  )
}

function SearchBox({ className }: { className?: string }) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    if (term.trim().length < 2) {
      setResults([])
      return
    }
    const id = window.setTimeout(() => {
      db.catalog.searchSuggestions(term).then((r) => {
        if (!cancelled) setResults(r)
      })
    }, 160)
    return () => {
      cancelled = true
      window.clearTimeout(id)
    }
  }, [term])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={boxRef} className={cn('relative', className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!term.trim()) return
          setOpen(false)
          navigate(`/search?q=${encodeURIComponent(term.trim())}`)
        }}
        className="flex h-11 overflow-hidden rounded-md bg-white ring-1 ring-navy-200 focus-within:ring-2 focus-within:ring-gold-400"
      >
        <input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search backpacks, calculators, uniforms…"
          className="min-w-0 flex-1 px-3.5 text-sm outline-none placeholder:text-muted"
          aria-label="Search products"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 bg-gold-400 px-4 text-sm font-bold text-navy-950 transition-colors hover:bg-gold-300"
        >
          <Search size={16} />
          <span className="hidden sm:inline">Search</span>
        </button>
      </form>

      {open && results.length > 0 && (
        <div className="absolute inset-x-0 top-12 z-50 overflow-hidden rounded-md bg-white shadow-panel">
          {results.map((p) => (
            <Link
              key={p.id}
              to={`/product/${p.slug}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 border-b border-hairline px-3 py-2.5 last:border-0 hover:bg-navy-50"
            >
              <span className="h-10 w-10 shrink-0 overflow-hidden rounded">
                <ProductImage imageKey={p.imageKey} imageUrl={p.imageUrl} alt={p.name} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{p.name}</span>
                <span className="block text-xs text-muted">{p.brand}</span>
              </span>
              <span className="shrink-0 text-sm font-bold tabular">{formatNaira(p.priceKobo)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function Header() {
  const { itemCount } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 shadow-card">
      <AnnouncementBar />
      <div className="bg-navy-700 text-white">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:gap-6">
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md hover:bg-navy-600 lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Open menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link to="/" className="shrink-0 text-white">
            <Logo className="text-white" />
          </Link>

          <SearchBox className="hidden flex-1 sm:block" />

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <Link
              to="/account"
              className="hidden items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold hover:bg-navy-600 sm:flex"
            >
              <User size={18} />
              Account
            </Link>
            <Link
              to="/cart"
              className="relative flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold hover:bg-navy-600"
            >
              <span className="relative">
                <ShoppingCart size={20} />
                {itemCount > 0 && (
                  <span className="absolute -right-2 -top-2 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-gold-400 px-1 text-[0.65rem] font-bold text-navy-950 tabular">
                    {itemCount}
                  </span>
                )}
              </span>
              <span className="hidden sm:inline">Cart</span>
            </Link>
          </div>
        </div>

        <div className="px-4 pb-3 sm:hidden">
          <SearchBox />
        </div>
      </div>

      <nav className="hidden bg-white lg:block">
        <div className="mx-auto flex max-w-[1400px] items-center gap-1 px-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/c/${c.slug}`}
              className="border-b-2 border-transparent px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-gold-400 hover:text-navy-700"
            >
              {c.name}
            </Link>
          ))}
          <Link
            to="/deals"
            className="ml-auto flex items-center gap-1.5 px-3 py-2.5 text-sm font-bold text-flash-dark"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-flash" />
            Today&apos;s Deals
          </Link>
        </div>
      </nav>

      {menuOpen && (
        <div className="animate-rise border-t border-hairline bg-white lg:hidden">
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/c/${c.slug}`}
              onClick={() => setMenuOpen(false)}
              className="block border-b border-hairline px-4 py-3 text-sm font-semibold"
            >
              {c.name}
            </Link>
          ))}
          <Link
            to="/deals"
            onClick={() => setMenuOpen(false)}
            className="block px-4 py-3 text-sm font-bold text-flash-dark"
          >
            Today&apos;s Deals
          </Link>
        </div>
      )}
    </header>
  )
}
