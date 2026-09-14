import type {
  Category, Deal, Paginated, Product, ProductQuery,
} from '@/types/catalog'
import type { CartLine, CheckoutDraft, Order } from '@/types/commerce'
import type {
  AdminRepository, InventoryAdjustment, InventoryMovementRecord, NewDealInput, NewProductInput,
} from '@/types/admin'
import type { CatalogRepository, DataClient, DealRepository, OrderRepository } from '../repository'
import { supabase, functionsUrl, ensureFreshSession } from './client'
import { mapCategory, mapDeal, mapOrder, mapProduct, mapReview, mapTeamMember } from './mappers'

const PRODUCT_SELECT = '*, product_variants(*)'

async function callFunction<T>(name: string, body: unknown): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token ?? (import.meta.env.VITE_SUPABASE_ANON_KEY as string)
  const res = await fetch(`${functionsUrl}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? `${name} failed (${res.status})`)
  return json as T
}

const catalog: CatalogRepository = {
  async listCategories(): Promise<Category[]> {
    const { data: cats, error } = await supabase.from('categories').select('*').order('position')
    if (error) throw error
    const { data: prods } = await supabase.from('products').select('category_id').eq('active', true)
    const counts = new Map<string, number>()
    for (const row of prods ?? []) counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1)
    return (cats ?? []).map((c) => mapCategory(c, counts.get(c.id) ?? 0))
  },

  async getCategory(slug) {
    const { data } = await supabase.from('categories').select('*').eq('slug', slug).maybeSingle()
    return data ? mapCategory(data) : null
  },

  async listProducts(query: ProductQuery): Promise<Paginated<Product>> {
    let categoryId: string | undefined
    if (query.categorySlug) {
      const { data } = await supabase.from('categories').select('id').eq('slug', query.categorySlug).maybeSingle()
      categoryId = data?.id
    }
    let builder = supabase.from('products').select(PRODUCT_SELECT, { count: 'exact' }).eq('active', true)
    if (categoryId) builder = builder.eq('category_id', categoryId)
    if (query.tags?.length) builder = builder.contains('tags', query.tags)
    if (query.minPriceKobo !== undefined) builder = builder.gte('price_kobo', query.minPriceKobo)
    if (query.maxPriceKobo !== undefined) builder = builder.lte('price_kobo', query.maxPriceKobo)
    if (query.minRating !== undefined) builder = builder.gte('rating', query.minRating)
    if (query.inStockOnly) builder = builder.gt('stock', 0)
    if (query.payOnDeliveryOnly) builder = builder.eq('pay_on_delivery', true)
    if (query.search) builder = builder.ilike('name', `%${query.search}%`)

    switch (query.sort) {
      case 'price-asc': builder = builder.order('price_kobo', { ascending: true }); break
      case 'price-desc': builder = builder.order('price_kobo', { ascending: false }); break
      case 'newest': builder = builder.order('created_at', { ascending: false }); break
      case 'bestselling': builder = builder.order('units_sold', { ascending: false }); break
      default: builder = builder.order('units_sold', { ascending: false })
    }

    const perPage = query.perPage ?? 24
    const page = query.page ?? 1
    const start = (page - 1) * perPage
    const { data, count, error } = await builder.range(start, start + perPage - 1)
    if (error) throw error
    const total = count ?? 0
    return {
      items: (data ?? []).map(mapProduct),
      total,
      page,
      perPage,
      pageCount: Math.max(1, Math.ceil(total / perPage)),
    }
  },

  async getProduct(slug) {
    const { data } = await supabase.from('products').select(PRODUCT_SELECT).eq('slug', slug).maybeSingle()
    return data ? mapProduct(data) : null
  },

  async getProductsByIds(ids) {
    if (ids.length === 0) return []
    const { data } = await supabase.from('products').select(PRODUCT_SELECT).in('id', ids)
    return (data ?? []).map(mapProduct)
  },

  async listReviews(productId) {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('approved', true)
      .order('created_at', { ascending: false })
    return (data ?? []).map(mapReview)
  },

  async relatedProducts(product, limit = 6) {
    const { data } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('category_id', product.categoryId)
      .eq('active', true)
      .neq('id', product.id)
      .limit(limit)
    return (data ?? []).map(mapProduct)
  },

  async searchSuggestions(term, limit = 6) {
    if (!term.trim()) return []
    const { data } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('active', true)
      .or(`name.ilike.%${term}%,brand.ilike.%${term}%`)
      .limit(limit)
    return (data ?? []).map(mapProduct)
  },
}

const dealRepo: DealRepository = {
  async listActiveDeals(): Promise<Deal[]> {
    const { data } = await supabase
      .from('deals')
      .select('*, deal_products(product_id, position)')
      .eq('active', true)
      .gt('ends_at', new Date().toISOString())
    return (data ?? []).map(mapDeal)
  },
  async getDeal(id) {
    const { data } = await supabase
      .from('deals')
      .select('*, deal_products(product_id, position)')
      .eq('id', id)
      .maybeSingle()
    return data ? mapDeal(data) : null
  },
}

const orders: OrderRepository = {
  async placeOrder({ lines, draft }: { lines: CartLine[]; draft: CheckoutDraft }) {
    const result = await callFunction<{ order: any; authorization_url?: string }>('checkout', {
      lines,
      draft,
    })
    return { order: mapOrder(result.order) as Order, authorizationUrl: result.authorization_url }
  },

  async getOrder(reference) {
    // Guest checkouts have no auth.uid(), so RLS can't match them to a row —
    // the lookup function reads with the service key and only ever returns
    // the one order whose reference was asked for.
    try {
      const result = await callFunction<{ order: any }>('order-lookup', { reference })
      return result.order ? mapOrder(result.order) : null
    } catch {
      return null
    }
  },
}

function productPatchToRow(patch: Partial<NewProductInput>) {
  const row: Record<string, unknown> = {}
  if (patch.slug !== undefined) row.slug = patch.slug
  if (patch.name !== undefined) row.name = patch.name
  if (patch.hook !== undefined) row.hook = patch.hook
  if (patch.description !== undefined) row.description = patch.description
  if (patch.bullets !== undefined) row.bullets = patch.bullets
  if (patch.brand !== undefined) row.brand = patch.brand
  if (patch.categoryId !== undefined) row.category_id = patch.categoryId
  if (patch.imageKey !== undefined) row.image_key = patch.imageKey
  if (patch.imageUrl !== undefined) row.image_url = patch.imageUrl
  if (patch.gallery !== undefined) row.gallery = patch.gallery
  if (patch.priceKobo !== undefined) row.price_kobo = patch.priceKobo
  if (patch.compareAtKobo !== undefined) row.compare_at_kobo = patch.compareAtKobo
  if (patch.stock !== undefined) row.stock = patch.stock
  if (patch.tags !== undefined) row.tags = patch.tags
  if (patch.deliveryDaysMin !== undefined) row.delivery_days_min = patch.deliveryDaysMin
  if (patch.deliveryDaysMax !== undefined) row.delivery_days_max = patch.deliveryDaysMax
  if (patch.payOnDelivery !== undefined) row.pay_on_delivery = patch.payOnDelivery
  if (patch.active !== undefined) row.active = patch.active
  return row
}

/**
 * Retries only a genuinely dropped request — a flaky mobile connection,
 * a DNS blip, a timeout mid-request — which surfaces as a *thrown* error
 * from the underlying fetch. A real database error (bad input, an RLS
 * denial) comes back as `{ error }` on a normally-*resolved* response, so
 * it's never caught here and never retried; retrying that would just waste
 * time reproducing the same failure three times.
 *
 * This is what was behind "saving a product works most of the time but
 * randomly fails on mobile": the save flow makes several sequential
 * round trips (insert/update, replace variants, re-fetch for display), and
 * on a shaky mobile connection any single one of them dropping killed the
 * whole operation — even the purely informational final re-fetch, which
 * could fail *after* the actual write had already succeeded.
 */
async function withRetry<T>(fn: () => PromiseLike<T>, attempts = 3): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === attempts - 1) throw err
      await new Promise((resolve) => setTimeout(resolve, 350 * (i + 1)))
    }
  }
  throw new Error('unreachable')
}

async function replaceVariants(productId: string, variants: NewProductInput['variants']) {
  const { error: deleteError } = await withRetry(() =>
    supabase.from('product_variants').delete().eq('product_id', productId),
  )
  if (deleteError) throw deleteError
  if (variants.length === 0) return
  const { error: insertError } = await withRetry(() =>
    supabase.from('product_variants').insert(
      variants.map((v) => ({
        product_id: productId,
        option_name: v.optionName,
        label: v.label,
        price_kobo: v.priceKobo,
        stock: v.stock,
        sku: v.sku,
      })),
    ),
  )
  if (insertError) throw insertError
}

const admin: AdminRepository = {
  async listAllProducts() {
    const { data, error } = await supabase.from('products').select(PRODUCT_SELECT).order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(mapProduct)
  },

  async createProduct(input) {
    // A stale session (the tab was backgrounded — e.g. the system photo
    // picker was open — long enough for the access token to expire) makes
    // this write fail outright with an auth error no amount of retrying
    // fixes. Refresh first so that can't happen.
    await ensureFreshSession()
    const row = productPatchToRow(input)
    const { data, error } = await withRetry(() =>
      supabase.from('products').insert(row).select(PRODUCT_SELECT).single(),
    )
    if (error) throw error
    if (!input.variants.length) return mapProduct(data)

    await replaceVariants(data.id, input.variants)
    try {
      // The insert above already has every column except the variants we
      // just wrote — refetch once more so the returned object is accurate.
      const { data: fresh, error: freshError } = await withRetry(() =>
        supabase.from('products').select(PRODUCT_SELECT).eq('id', data.id).single(),
      )
      if (freshError) throw freshError
      return mapProduct(fresh)
    } catch {
      // The product and its variants are already saved (both calls above
      // succeeded) — a flaky final refetch is cosmetic and must not be
      // reported to the admin as a failed save.
      return mapProduct(data)
    }
  },

  async updateProduct(id, patch) {
    // Same stale-session guard as createProduct — this is the save path the
    // admin actually hits every time they edit a product, so it's the one
    // most likely to land right after the tab was backgrounded.
    await ensureFreshSession()
    const row = productPatchToRow(patch)
    let productRow: any = null
    if (Object.keys(row).length) {
      // .select().single() here (rather than a bare update) both saves a
      // round trip we'd otherwise spend re-fetching, and — as a bonus fix —
      // turns a previously-silent RLS-blocked update (0 rows affected, no
      // Postgres error) into a real, catchable error via PostgREST's
      // "expected exactly one row" check.
      const { data, error } = await withRetry(() =>
        supabase.from('products').update(row).eq('id', id).select(PRODUCT_SELECT).single(),
      )
      if (error) throw error
      productRow = data
    }
    if (patch.variants) {
      await replaceVariants(id, patch.variants)
      try {
        // Variants changed after productRow was fetched (or nothing else
        // changed and we never fetched it) — refetch for accurate data.
        const { data, error } = await withRetry(() =>
          supabase.from('products').select(PRODUCT_SELECT).eq('id', id).single(),
        )
        if (error) throw error
        productRow = data
      } catch {
        // The update and variant writes above already succeeded — don't
        // fail the save over a flaky informational refetch. Fall back to
        // whatever we already have; if we have nothing (a variants-only
        // edit whose refetch also failed), say so honestly rather than
        // guessing at the product's current state.
        if (!productRow) throw new Error('Saved, but could not load the latest details — refresh to check.')
      }
    }
    if (!productRow) {
      // Neither branch above ran (an empty patch with no variants field) —
      // nothing was actually written, so fetch the current row to return.
      const { data, error } = await withRetry(() => supabase.from('products').select(PRODUCT_SELECT).eq('id', id).single())
      if (error) throw error
      productRow = data
    }
    return mapProduct(productRow)
  },

  async setProductActive(id, active) {
    const { error } = await supabase.from('products').update({ active }).eq('id', id)
    if (error) throw error
  },

  async deleteProduct(id) {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      // order_items.product_id is "on delete restrict" on purpose — a
      // product that's ever been ordered must stay around for order
      // history. Postgres reports that as a foreign_key_violation (23503).
      if (error.code === '23503') {
        throw new Error('This product has order history and can’t be deleted — use Hide instead.')
      }
      throw error
    }
  },

  async adjustInventory(input: InventoryAdjustment) {
    // Stock itself is never written directly — the trigger on this table
    // applies the delta, which is the whole point of an append-only ledger.
    const { error } = await supabase.from('inventory_movements').insert({
      product_id: input.productId,
      variant_id: input.variantId ?? null,
      delta: input.delta,
      reason: input.reason,
    })
    if (error) throw error
  },

  async listMovements(limit = 50) {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*, products(name)')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []).map(
      (row: any): InventoryMovementRecord => ({
        id: String(row.id),
        productId: row.product_id,
        variantId: row.variant_id,
        delta: row.delta,
        reason: row.reason,
        productName: row.products?.name ?? 'Unknown product',
        createdAt: row.created_at,
        actorName: row.actor_id ? 'Staff' : 'System',
      }),
    )
  },

  async listAllDeals() {
    const { data, error } = await supabase.from('deals').select('*, deal_products(product_id, position)').order('starts_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(mapDeal)
  },

  async createDeal(input: NewDealInput) {
    const { data, error } = await supabase
      .from('deals')
      .insert({
        kind: input.kind,
        title: input.title,
        subtitle: input.subtitle,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        headline_discount: input.headlineDiscount,
        active: input.active,
      })
      .select('*')
      .single()
    if (error) throw error
    if (input.productIds.length) {
      await supabase.from('deal_products').insert(
        input.productIds.map((productId, position) => ({ deal_id: data.id, product_id: productId, position })),
      )
    }
    return mapDeal({ ...data, deal_products: input.productIds.map((product_id, position) => ({ product_id, position })) })
  },

  async updateDeal(id, patch) {
    const row: Record<string, unknown> = {}
    if (patch.kind !== undefined) row.kind = patch.kind
    if (patch.title !== undefined) row.title = patch.title
    if (patch.subtitle !== undefined) row.subtitle = patch.subtitle
    if (patch.startsAt !== undefined) row.starts_at = patch.startsAt
    if (patch.endsAt !== undefined) row.ends_at = patch.endsAt
    if (patch.headlineDiscount !== undefined) row.headline_discount = patch.headlineDiscount
    if (patch.active !== undefined) row.active = patch.active
    if (Object.keys(row).length) {
      const { error } = await supabase.from('deals').update(row).eq('id', id)
      if (error) throw error
    }
    if (patch.productIds) {
      await supabase.from('deal_products').delete().eq('deal_id', id)
      if (patch.productIds.length) {
        await supabase.from('deal_products').insert(
          patch.productIds.map((productId, position) => ({ deal_id: id, product_id: productId, position })),
        )
      }
    }
    const { data, error } = await supabase.from('deals').select('*, deal_products(product_id, position)').eq('id', id).single()
    if (error) throw error
    return mapDeal(data)
  },

  async listAllOrders(filter) {
    let builder = supabase.from('orders').select('*, order_items(*)').order('placed_at', { ascending: false })
    if (filter?.status) builder = builder.eq('status', filter.status)
    const { data, error } = await builder
    if (error) throw error
    return (data ?? []).map(mapOrder)
  },

  async updateOrderStatus(reference, status) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('reference', reference)
      .select('*, order_items(*)')
      .single()
    if (error) throw error
    return mapOrder(data)
  },

  async listTeam() {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at')
    if (error) throw error
    return (data ?? []).map(mapTeamMember)
  },

  async inviteTeamMember(email, fullName, role) {
    const result = await callFunction<{ member: any }>('invite-team-member', { email, fullName, role })
    return mapTeamMember(result.member)
  },

  async setTeamRole(userId, role) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
    if (error) throw error
  },
}

export const supabaseClient: DataClient = { catalog, deals: dealRepo, orders, admin }
