# Tancha — storefront

Back-to-school ecommerce for Nigeria. React 19 + Vite + TypeScript + Tailwind v4.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build
```

## What is built

The **storefront**, end to end: homepage with rotating deal strips and live
countdowns, category listing with filters and sort, product detail with
variants and reviews, cart, checkout (Paystack / pay-on-delivery UI), order
confirmation, deals page, and a persistent AI chat widget that escalates to
WhatsApp.

Not built yet: the admin console (a placeholder page documents the modules and
roles) and the Supabase backend. Both are designed for — see below.

## Architecture — the parts that matter later

```
src/
  types/         domain models: catalog, commerce, identity (roles), support
  data/
    repository.ts  interfaces every screen talks to — the seam
    index.ts       picks the implementation (one line changes for Supabase)
    mock/          in-memory catalog, deals, orders
    supabase/      schema.sql + notes; the production data model
  store/cart.tsx localStorage-backed cart, price snapshotted at add time
  components/    ui primitives, layout, product, brand, support
  features/      one folder per page
```

**No component imports mock data for business logic.** They call `db.catalog`,
`db.deals`, `db.orders`. Swapping in Supabase is a new file implementing
`DataClient` plus one line in `src/data/index.ts`.

### Rules baked in on purpose

- **Money is integer kobo.** `formatNaira()` is the only thing that renders it.
  Paystack works in kobo; floats and currency do not mix.
- **Cart lines snapshot their unit price.** A price change mid-session must not
  silently reprice someone's cart.
- **Roles are defined in `types/identity.ts` and enforced in Postgres RLS**
  (`data/supabase/schema.sql`), not in React. A leaked anon key must not be able
  to write a product row.
- **The assistant is behind `AssistantProvider`.** Today it answers from the live
  catalog locally; tomorrow it is a fetch to an Edge Function calling a model.
  The widget does not change.

## Next, in order

1. Provision Supabase, run `src/data/supabase/schema.sql`, implement
   `DataClient` against it.
2. `/checkout` Edge Function: re-price the cart server-side, create the order,
   init the Paystack transaction. Never trust a client-supplied total.
3. `/paystack-webhook`: verify `x-paystack-signature`, then mark paid and
   decrement inventory. The redirect is not proof of payment.
4. Admin console — products, inventory, deals, orders, team.
5. Swap the local assistant for the model-backed one; add the agent inbox.

## Product imagery

Products render vector illustrations keyed off `imageKey` until the client
supplies photography. Set `product.imageUrl` and the photo takes over — no code
change.

## The logo

`public/logo.png` is the client's original. The white background is keyed out
and the mark trimmed into three derived assets:

| File | Use |
| --- | --- |
| `public/logo-mark.png` | brand-blue mark, transparent |
| `public/logo-mark-white.png` | monochrome, for dark surfaces |
| `public/favicon.png` | browser tab and home-screen icon |

`components/brand/Logo.tsx` exposes `variant="chip" | "white" | "blue"`. The
mark is mid-blue line art and vanishes against the navy header, so the primary
lockup sits the real mark in a white chip — brand colour intact, reads like an
app icon. Secondary surfaces (footer, chat avatar) use the white variant. Size
is an inline style, not a Tailwind class, because two competing `h-*` classes
are resolved by stylesheet order rather than the order you wrote them.

If the client ever produces a vector original, drop it in and point the three
`SRC` paths at it — nothing else changes.
