import { Link, useParams } from 'react-router-dom'
import { LEGAL_DOCS } from './content'
import { NotFoundPage } from '@/features/home/NotFoundPage'
import { useSeo } from '@/lib/seo'

export function LegalPage() {
  const { slug } = useParams<{ slug: string }>()
  const doc = slug ? LEGAL_DOCS[slug] : undefined
  useSeo({ title: doc?.title ?? 'Not Found', description: doc?.intro })
  if (!doc) return <NotFoundPage />

  return (
    <div className="mx-auto max-w-2xl px-3 py-8 sm:px-4">
      <nav className="mb-4 flex gap-4 text-xs font-semibold uppercase tracking-wide">
        {Object.values(LEGAL_DOCS).map((d) => (
          <Link
            key={d.slug}
            to={`/legal/${d.slug}`}
            className={d.slug === doc.slug ? 'text-navy-700' : 'text-muted hover:text-navy-700'}
          >
            {d.title}
          </Link>
        ))}
      </nav>

      <h1 className="text-2xl font-extrabold tracking-tight">{doc.title}</h1>
      <p className="mt-1 text-xs text-muted">Last updated {doc.updated}</p>
      <p className="mt-4 text-sm leading-relaxed text-muted">{doc.intro}</p>

      <div className="mt-5 space-y-5">
        {doc.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-sm font-bold">{s.heading}</h2>
            <div className="mt-1.5 space-y-2">
              {s.body.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-muted">{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Link to="/" className="mt-6 inline-block text-sm font-semibold text-navy-600 hover:underline">
        ← Back to the storefront
      </Link>
    </div>
  )
}
