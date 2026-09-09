# Supabase layer

`schema.sql` is the production data model. Nothing in `src/` reads it yet — the
app runs on `src/data/mock/` until the project is provisioned.

## Going live

1. Create the Supabase project, run `schema.sql` in the SQL editor.
2. Add `.env.local`:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
3. Write `src/data/supabase/client.ts` implementing `DataClient` from
   `src/data/repository.ts`.
4. Flip the one line in `src/data/index.ts`. No component changes.

## Rules that are not negotiable

- **Money is `bigint` kobo.** Paystack works in kobo. Floats introduce rounding
  errors you will discover during a reconciliation, not before.
- **Orders are created server-side.** The browser sends product IDs and
  quantities; the Edge Function re-reads live prices and computes the total.
  A client-supplied total is a discount coupon for anyone with devtools.
- **Payment confirmation comes from the webhook, never the redirect.** Verify
  `x-paystack-signature` as HMAC-SHA512 of the raw request body using the
  secret key, then compare `data.amount` against the stored order total.
- **Inventory changes only through `inventory_movements`.** The trigger keeps
  `products.stock` in sync and you keep an audit trail for free.
- **The first user to sign up becomes `owner`.** Do that yourself before launch,
  then invite the CEO and hand the role over. Every role change is written to
  `role_audit`.
