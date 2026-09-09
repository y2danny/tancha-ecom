import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { useSeo } from '@/lib/seo'

export function NotFoundPage() {
  useSeo({ title: 'Page Not Found', noindex: true })
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="text-sm font-bold uppercase tracking-wide text-gold-600">404</p>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight">We couldn't find that page</h1>
      <p className="mt-2 text-sm text-muted">
        The link may be old, or the page may have moved. Try the homepage, or search for what you were
        looking for.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <ButtonLink to="/" variant="primary">Back to homepage</ButtonLink>
        <Link
          to="/search"
          className="inline-flex h-11 items-center gap-2 rounded-md border border-navy-700 px-5 text-sm font-semibold text-navy-700 hover:bg-navy-50"
        >
          <Search size={16} /> Search products
        </Link>
      </div>
    </div>
  )
}
