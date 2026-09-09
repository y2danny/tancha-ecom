import { site } from '@/config/site'

export interface LegalSection {
  heading: string
  body: string[]
}

export interface LegalDoc {
  slug: string
  title: string
  updated: string
  intro: string
  sections: LegalSection[]
}

/**
 * Drafted to be NDPR-aware (Nigeria Data Protection Regulation / Nigeria
 * Data Protection Act 2023) and to match what the storefront actually does
 * today — Paystack for card/transfer/USSD, pay-on-delivery in Lagos, Abuja
 * and Port Harcourt, a 7-day return window. This is a solid starting draft,
 * not legal advice — have a Nigerian lawyer review it before launch,
 * especially the NDPA sections once the customer-accounts and AI-chat data
 * flows are finalised.
 */
export const LEGAL_DOCS: Record<string, LegalDoc> = {
  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy',
    updated: '8 September 2026',
    intro: `${site.name} ("we", "us") respects your privacy. This policy explains what we collect when you shop with us, why, and what rights you have over it under the Nigeria Data Protection Act 2023 (NDPA).`,
    sections: [
      {
        heading: '1. What we collect',
        body: [
          'Account and order details you give us directly: full name, phone number, delivery address, and email if you pay by card, transfer or USSD.',
          'Payment information is handled entirely by Paystack, our licensed payment processor. We never receive or store your card number, CVV or PIN — our servers only ever see a payment reference and a success or failure status.',
          'Order history, items viewed and basic device/browser information, used to keep the site working and to show you relevant products.',
          'If you use the chat widget, we keep the conversation so our support team (and the assistant) can help you and follow up.',
        ],
      },
      {
        heading: '2. Why we collect it',
        body: [
          'To take your order, arrange delivery or pay-on-delivery collection, and let you track it.',
          'To respond to support questions, including escalations to a human agent over WhatsApp.',
          'To detect fraud, prevent abuse of pay-on-delivery, and keep accurate inventory and accounting records.',
          'To improve the catalogue and marketing — for example, which deals perform well — using aggregated, non-identifying statistics wherever possible.',
        ],
      },
      {
        heading: '3. Who we share it with',
        body: [
          'Paystack, to process payments.',
          'Our delivery partners/riders, limited to the name, phone number and address needed to complete your delivery.',
          'Supabase, our database and authentication provider, which stores the data described above on our behalf under a data processing arrangement.',
          'We do not sell your personal data. We do not share it with advertisers.',
        ],
      },
      {
        heading: '4. Your rights under the NDPA',
        body: [
          'You can ask us what personal data we hold about you, ask us to correct it, or ask us to delete it, subject to the records we are legally required to keep (for example, completed order and tax records).',
          `To exercise any of these rights, email ${site.supportEmail} or message us on WhatsApp. We aim to respond within 14 days.`,
        ],
      },
      {
        heading: '5. How long we keep it',
        body: [
          'Order records are kept for as long as Nigerian tax and consumer-protection law requires. Chat transcripts are kept for 12 months for quality and dispute purposes, then deleted.',
        ],
      },
      {
        heading: '6. Changes to this policy',
        body: [
          'We will update the date above whenever this policy changes, and post the new version here before it takes effect.',
        ],
      },
    ],
  },

  terms: {
    slug: 'terms',
    title: 'Terms of Service',
    updated: '8 September 2026',
    intro: `These terms govern every order placed on ${site.name}. Placing an order means you accept them.`,
    sections: [
      {
        heading: '1. Who we are',
        body: [
          `${site.name} sources products directly from producers and sells them to customers across Nigeria. We are not a marketplace — every listing is a product we have bought or arranged to buy on your behalf.`,
        ],
      },
      {
        heading: '2. Orders and pricing',
        body: [
          'Prices are shown in Naira and include VAT where applicable. Delivery is a flat fee shown at checkout, and free above the threshold shown there.',
          'We re-confirm every price and stock level on our servers at the moment you pay — the price you see at checkout is the price you are charged, not an estimate.',
          'We may cancel and fully refund an order if an item turns out to be out of stock or mispriced due to an error, and we will tell you why.',
        ],
      },
      {
        heading: '3. Payment',
        body: [
          'Card, bank transfer, USSD and direct debit payments are processed by Paystack. An order paid this way is only confirmed once Paystack confirms the payment to us — usually within seconds.',
          `Pay-on-delivery is available in ${site.serviceCities.slice(0, 3).join(', ')}. You may open and inspect the item before paying the rider.`,
        ],
      },
      {
        heading: '4. Delivery',
        body: [
          'Delivery windows shown at checkout and on your confirmation page are estimates, not guarantees — weather, traffic and address accuracy all affect them.',
          'Please provide a full, accurate address and a phone number you can be reached on. We are not responsible for delivery delays caused by incorrect address details.',
        ],
      },
      {
        heading: '5. Returns and refunds',
        body: [
          'See our separate Returns & Refunds policy — it covers timeframes, condition requirements, and how refunds are paid back.',
        ],
      },
      {
        heading: '6. Limitation of liability',
        body: [
          `To the extent permitted by Nigerian law, ${site.name}'s liability for any order is limited to the amount you paid for that order.`,
        ],
      },
    ],
  },

  returns: {
    slug: 'returns',
    title: 'Returns & Refunds',
    updated: '8 September 2026',
    intro: 'We want you to be comfortable buying from us sight-unseen. Here is exactly how returns work.',
    sections: [
      {
        heading: '1. The 7-day window',
        body: [
          'You have 7 days from delivery (or from collection, for pay-on-delivery) to tell us about a wrong size, wrong item, or damaged/defective product.',
          'Message us on WhatsApp or through the chat widget with your order reference and a photo of the issue — this is the fastest way to get it resolved.',
        ],
      },
      {
        heading: '2. Condition',
        body: [
          'Items must be unused, unwashed, and in their original packaging with tags attached, except where the return is because the item itself arrived damaged or defective.',
        ],
      },
      {
        heading: '3. Pickup',
        body: [
          'For the cities we deliver in ourselves, we arrange a free pickup. Outside those cities, we will agree a drop-off point or courier arrangement with you.',
        ],
      },
      {
        heading: '4. Refunds',
        body: [
          'Once we receive and check the returned item, refunds for card/transfer/USSD payments are sent back to the original payment method via Paystack, typically within 5–7 working days.',
          'Pay-on-delivery refunds are sent by bank transfer to an account you provide, since there is no card or transfer to reverse.',
          'You may choose a replacement or store credit instead of a refund where that is faster — for example, a straightforward size exchange.',
        ],
      },
    ],
  },
}
