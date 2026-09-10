# Handoff — going from demo to live

This is the one document to follow to take Tancha from "runs locally against
mock data" to "real store, real payments, real staff accounts." Nothing
below requires touching application code — it's accounts, keys, and a
handful of commands.

Everything here assumes you already have:
- A Supabase account (free tier is enough to start).
- A Paystack account (Nigerian business registration is needed to go from
  test mode to live payouts — test mode works with no registration).
- Somewhere to deploy the frontend (these steps use Vercel; any static host
  that serves a Vite SPA works the same way).

## 1. Create the Supabase project and run the schema

1. At [supabase.com](https://supabase.com), create a new project. Pick a
   region close to your users (e.g. an EU region — there is no Nigerian
   region yet) and save the database password somewhere safe; you won't need
   it day-to-day, but you'll want it if you ever connect a SQL client
   directly.
2. Open **SQL Editor → New query**, paste in the entire contents of
   `src/data/supabase/schema.sql`, and run it. This creates every table,
   role, and row-level-security policy — there is nothing else to configure
   by hand.
3. Optional but recommended: run `src/data/supabase/seed.sql` the same way.
   It loads the same demo catalog (47 products across 6 categories, 3 deals)
   that you've been looking at in mock mode, so the store isn't empty on day
   one. Delete the products you don't want and add your real ones from the
   admin console — nothing about the seed data is special or hard-coded
   anywhere else. Skip this step entirely if you'd rather start from zero.
4. **Create the owner account.** There is deliberately no public sign-up
   screen in the app (customers check out as guests; staff accounts are
   created by an owner, not by self-registration). Go to **Authentication →
   Users → Add user**, enter your own email and a password, and check **Auto
   Confirm User**. The very first row ever inserted into `profiles` is
   automatically made `owner` (see the `handle_new_user` trigger in
   `schema.sql`) — so make sure this is the first account you create, before
   anyone else touches the project. You can now sign in at `/admin/login`
   with that email and password.
5. Grab your **Project URL** and **anon/public key** from **Settings → API**.
   You'll need both in step 3 below. Never copy the `service_role` key or the
   database password into the frontend, a `.env` file, or anywhere in this
   chat/repo — the Edge Functions get the service-role key automatically from
   the Supabase runtime, they never need it handed to them.

## 2. Deploy the Edge Functions

The four functions in `supabase/functions/` (`checkout`, `paystack-webhook`,
`order-lookup`, `invite-team-member`) are the only code allowed to write
orders, confirm payments, or invite staff — they run with the service-role
key so they can bypass RLS deliberately, in the one place that's supposed to.

Run these from the project root (`C:\Users\USER\Downloads\tancha` — the same
folder `supabase/functions/` lives in):

```bash
npm install -g supabase        # Supabase CLI, one-time
supabase init                  # one-time — creates supabase/config.toml;
                                # answer the prompts with defaults, it will
                                # not touch the functions/ folder that's
                                # already there
supabase login                 # opens a browser to authenticate the CLI
supabase link --project-ref oweyocwbtodadbxtsltv
supabase functions deploy checkout
supabase functions deploy paystack-webhook
supabase functions deploy order-lookup
supabase functions deploy invite-team-member
```

Then set the two secrets the functions need (everything else — `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY` — is injected automatically by the Edge runtime):

```bash
supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxxxxxxx
supabase secrets set PUBLIC_SITE_URL=https://your-domain.example
```

`PUBLIC_SITE_URL` is where Paystack sends the shopper back to after paying
(`/order/<reference>`) — set it to wherever step 4 ends up deploying the
frontend.

## 3. Paystack keys and the webhook

1. In the Paystack dashboard, under **Settings → API Keys & Webhooks**, copy
   the **test** secret key (`sk_test_...`) and public key (`pk_test_...`) to
   start — switch to live keys only once you're ready to take real money.
2. Set `PAYSTACK_SECRET_KEY` as shown above — that's the only Paystack key
   this app needs anywhere. The checkout flow redirects to Paystack's own
   hosted payment page (the `authorization_url` the `checkout` function gets
   back from Paystack), so there is no public key to wire into the frontend
   at all; the secret key lives only in the Edge Function secrets, never in
   a `.env` file or in the browser.
3. Register the webhook: **Settings → API Keys & Webhooks → Webhook URL** →
   `https://<your-project-ref>.supabase.co/functions/v1/paystack-webhook`.
   This is what actually confirms an order as paid — the browser redirect
   after payment is just a nice loading screen, never trusted on its own.
4. Test it: place a test order with card `4084 0840 8408 4081`, any future
   expiry, CVV `408`, OTP `123456` (Paystack's standard test card). The order
   should flip from "Confirming your payment" to "Order confirmed" within a
   few seconds on the confirmation page, and you should see the webhook
   delivery logged as successful in the Paystack dashboard.

## 4. Environment variables and deploying the frontend

Create `.env` (copy from `.env.example`) with the two values collected above:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key from Settings → API>
```

The app detects these automatically (`src/data/index.ts`) and switches from
the mock backend to the live one — no code change either way.

**Deploying to Vercel:**

```bash
npm install -g vercel
vercel            # first run: link or create the project, follow the prompts
```

In the Vercel project's **Settings → Environment Variables**, add the same
two `VITE_...` values (for Production, and Preview if you want preview
deploys to also hit the real backend — or leave Preview unset to fall back to
mock mode, which is often what you want for PR previews). Then:

```bash
vercel --prod
```

Point your domain at the Vercel project (**Settings → Domains**) once you've
picked one — nothing in the app hard-codes a domain except the SEO tags in
`index.html` and `public/sitemap.xml`/`robots.txt`. These now point at
`tancha.com.ng` (bought from Whogohost) rather than `tancha.ng` — if that
ever changes, it's the same three files, a find-and-replace is enough.

## 5. Go-live checklist

- [ ] Schema run, owner account created and can sign in at `/admin/login`.
- [ ] All four Edge Functions deployed; `PAYSTACK_SECRET_KEY` and
      `PUBLIC_SITE_URL` secrets set.
- [ ] Paystack webhook URL registered and a test payment confirms correctly.
- [ ] Frontend deployed with the two `VITE_...` env vars set in Vercel.
- [ ] Signed in as owner, invited the real staff accounts from **Admin → Team**
      (each invite is an email with a set-password link — owner role is
      never assigned by invite, only by the first-signup trigger above).
- [ ] Added or edited real products/categories/deals from the admin console,
      removed any seed data you don't want.
- [ ] Switched `PAYSTACK_SECRET_KEY` from `sk_test_...` to the live
      `sk_live_...` equivalent once Paystack has approved the business for
      live payouts (`supabase secrets set PAYSTACK_SECRET_KEY=sk_live_...`).
- [x] Domain purchased (`tancha.com.ng`, via Whogohost) and SEO tags in
      `index.html`/`public/sitemap.xml`/`public/robots.txt` updated to match.
      Still to do: point its DNS at the Vercel deployment once that exists
      (Vercel's **Settings → Domains** shows the exact A/CNAME records).
- [ ] Had a lawyer glance at `src/features/legal/content.ts` — it's a solid
      starting draft (written with NDPR in mind), not a substitute for legal
      review.

## Where things live

- Full architecture notes, the rules the codebase enforces on purpose, and
  demo-mode login accounts: [`README.md`](./README.md).
- Database schema and the policies behind every role:
  `src/data/supabase/schema.sql`.
- Anything payment- or order-related: `supabase/functions/checkout/` and
  `supabase/functions/paystack-webhook/` — read the comments at the top of
  each file before changing either.
