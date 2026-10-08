-- Run this once in the Supabase SQL editor against your LIVE project to
-- switch the store over from Paystack to Flutterwave. Safe to run once;
-- running it again after it has already succeeded will error harmlessly
-- (there's no longer a 'paystack' value or a paystack_reference column to
-- rename).
alter type payment_method rename value 'paystack' to 'flutterwave';
alter table orders rename column paystack_reference to flutterwave_reference;
