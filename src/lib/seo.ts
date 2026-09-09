import { useEffect } from 'react'

const SITE_TITLE = 'Tancha'
const DEFAULT_TITLE = 'Tancha — Back-to-school essentials, producer direct'
const DEFAULT_DESCRIPTION =
  'Backpacks, exercise books, uniforms, calculators and lunch flasks bought straight from the producers. Naira prices, nationwide delivery, pay on delivery in Lagos, Abuja and Port Harcourt.'

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, name)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

/**
 * This is a client-rendered SPA with no server-side rendering, so this is
 * the ceiling for on-page SEO without adding a framework — it covers the
 * browser tab, bookmarks, and crawlers that execute JS (Googlebot does).
 * Product structured data still helps rich results even without SSR.
 */
export function useSeo({
  title, description, noindex = false,
}: { title?: string; description?: string; noindex?: boolean } = {}) {
  useEffect(() => {
    document.title = title ? `${title} — ${SITE_TITLE}` : DEFAULT_TITLE
    const desc = description ?? DEFAULT_DESCRIPTION
    setMeta('description', desc)
    setMeta('og:title', title ? `${title} — ${SITE_TITLE}` : DEFAULT_TITLE, 'property')
    setMeta('og:description', desc, 'property')
    // Checkout, cart, account and admin screens have nothing for a search
    // engine to index and every reason not to appear in results.
    setMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow')
    return () => {
      document.title = DEFAULT_TITLE
      setMeta('description', DEFAULT_DESCRIPTION)
      setMeta('og:title', DEFAULT_TITLE, 'property')
      setMeta('og:description', DEFAULT_DESCRIPTION, 'property')
      setMeta('robots', 'index, follow')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, noindex])
}

const JSON_LD_ID = 'product-json-ld'

/** Injects (and removes) a Product JSON-LD block for the PDP currently mounted. */
export function useProductJsonLd(product: {
  name: string
  description: string
  brand: string
  imageUrl?: string | null
  priceKobo: number
  stock: number
  rating: number
  reviewCount: number
  slug: string
} | null) {
  useEffect(() => {
    if (!product) return
    const existing = document.getElementById(JSON_LD_ID)
    if (existing) existing.remove()

    const script = document.createElement('script')
    script.id = JSON_LD_ID
    script.type = 'application/ld+json'
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      brand: { '@type': 'Brand', name: product.brand },
      image: product.imageUrl ? [product.imageUrl] : undefined,
      url: `${window.location.origin}/product/${product.slug}`,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'NGN',
        price: (product.priceKobo / 100).toFixed(2),
        availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url: `${window.location.origin}/product/${product.slug}`,
      },
      ...(product.reviewCount > 0 && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: product.rating,
          reviewCount: product.reviewCount,
        },
      }),
    })
    document.head.appendChild(script)

    return () => {
      document.getElementById(JSON_LD_ID)?.remove()
    }
  }, [product])
}
