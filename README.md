# Tancha — ecommerce platform

Back-to-school ecommerce for Nigeria. React 19 + Vite + TypeScript + Tailwind v4.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build
npm run lint
```

Runs with **zero configuration** against an in-memory mock backend (seeded
demo catalog, orders, deals, staff accounts) — see [Demo / mock mode](#demo--mock-mode)
below. Point it at a real Supabase project (see [`HANDOFF.md`](./HANDOFF.md))
and it switches to the live backend with no code changes.

## What is built

**Storefront:** homepage with rotating deal strips and live countdowns,
category listing with filters and sort, product detail with variants and
reviews, cart, checkout (Paystack + pay-on-delivery), order confirmation with
live status polling, deals page, legal pages (privacy / terms / returns), a
real 404 page, and a persistent AI chat widget that escalates to WhatsApp.

**Admin console** (`/admin`, role-gated, code-split from the storefront
bundle): dashboard (today's orders/revenue, low-stock alerts), product
catalog CRUD, inventory adjustments with an audit trail, deals scheduling,
order management with status updates, and team management (invite staff,
assign roles).

**Backend** (Supabase): Postgres schema with row-level security enforcing
every role boundary at the database layer, plus four Edge Functions —
`checkout` (server-side re-pricing and stock validation — the client never
sends a total), `paystack-webhook` (HMAC-verified payment confirmation —
never trusts the browser redirect), `order-lookup` (guest order lookup by
reference), `invite-team-member` (owner-only staff invites).

**Cross-cutting:** per-route SEO (meta tags, JSON-LD product markup,
robots.txt, sitemap.xml, `noindex` on private routes), WCAG AA colour
contrast, keyboard focus states, and a GitHub Actions CI workflow that lints
and type-checks/builds on every push.

Nothing is a placeholder. Everything above works end to end in mock mode
today, and against live Supabase/Paystack once configured — see
[`HANDOFF.md`](./HANDOFF.md) for exact setup steps.

## Architecture — the parts that matter later

```
src/
  types/          domain models: catalog, commerce, identity (roles), admin, support
  data/
    repository.ts   DataClient interface — the seam every screen talks to
    index.ts         picks mock vs Supabase, based on whether env vars are set
    mock/             in-memory catalog, deals, orders, team (localStorage-backed)
    supabase/         schema.sql + the live DataClient implementation
    auth/             AuthClient interface; mock vs Supabase auth, same seam pattern
  store/            cart.tsx (localStorage cart), auth.tsx (session + role context)
  components/       ui primitives, layout, product, brand, support
  features/         one folder per page area (catalog, cart, checkout, admin, legal, ...)
supabase/
  functions/        Deno Edge Functions — checkout, paystack-webhook, order-lookup, invite-team-member
```

**No component imports mock or Supabase code directly.** Every screen calls
`db.catalog`, `db.deals`, `db.orders`, `db.admin`, or `useAuth()`. The two
backends are interchangeable because they implement the same
`DataClient`/`AuthClient` interfaces.

### Rules baked in on purpose

- **Money is integer kobo everywhere.** `formatNaira()` is the only thing that
  renders it. Paystack is kobo-denominated; floats and currency do not mix.
- **The client never computes or sends an order total.** The `checkout` Edge
  Function re-prices every line from the live database and is the sole
  source of truth. A tampered client request cannot produce a cheaper order.
- **A payment is only confirmed by Paystack's webhook**, verified by
  HMAC-SHA512 signature. The post-payment redirect is a UX convenience, never
  proof of payment — it can be closed, skipped, or faked.
- **Cart lines snapshot their unit price.** A price change mid-session must
  not silently reprice someone's cart.
- **Roles are defined in `types/identity.ts` and enforced in Postgres RLS**
  (`data/supabase/schema.sql`), not in React. A leaked anon key must not be
  able to write a product row or read another customer's order.
- **The assistant is behind `AssistantProvider`.** Today it answers from the
  live catalog locally; swapping it for a model-backed one is a provider
  change, not a rewrite of the widget.

## Demo / mock mode

With no `VITE_SUPABASE_URL` set, the app runs entirely client-side against
seeded in-memory/localStorage data — useful for demos, and what CI builds
against. Staff sign-in at `/admin/login` in this mode accepts three demo
accounts (shown on the login screen itself):

| Email | Password | Role |
| --- | --- | --- |
| owner@tancha.ng | tancha-demo | owner |
| admin@tancha.ng | tancha-demo | admin |
| support@tancha.ng | tancha-demo | support_agent |

Orders placed in mock mode always settle as "confirmed" immediately (there is
no real payment gateway to wait on). Clearing site data resets everything.

## Product imagery

Products render vector illustrations keyed off `imageKey` until the client
supplies photography. Set `product.imageUrl` and the photo takes over — no
code change. The brand mark is `components/brand/Logo.tsx`, backed by
`public/logo-mark.png` (colour) and `public/logo-mark-white.png` (for dark
surfaces); drop in a vector original at `public/logo.svg` and repoint
`Logo.tsx`'s `SRC` map to it if one is ever produced.

## Setup, deployment, and handoff

See [`HANDOFF.md`](./HANDOFF.md) for the full runbook: creating the Supabase
project, running the schema, deploying the Edge Functions, Paystack keys and
webhook registration, environment variables, and deploying to Vercel.
