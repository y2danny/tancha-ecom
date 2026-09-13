import type { AssistantProvider, AssistantReply, ChatMessage } from '@/types/support'
import { products, productBySlug } from '@/data/mock/products'
import { formatDayRange, formatNaira } from '@/lib/format'
import { site } from '@/config/site'

/**
 * Local assistant. Deliberately implements the same `AssistantProvider`
 * interface the real one will: swap this for a fetch to the `/assistant`
 * Edge Function and the widget does not change a line.
 *
 * It answers from the live catalog rather than a hardcoded script, so a new
 * product is answerable the moment it exists.
 */

type Intent = {
  id: string
  test: RegExp
  handle: (message: string) => AssistantReply
}

const money = (kobo: number) => formatNaira(kobo)

function findProducts(message: string, limit = 3) {
  const words = message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3)
  if (words.length === 0) return []
  const scored = products
    .map((p) => {
      const hay = `${p.name} ${p.brand} ${p.hook} ${p.tags.join(' ')}`.toLowerCase()
      return { p, score: words.filter((w) => hay.includes(w)).length }
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.p.unitsSold - a.p.unitsSold)
  return scored.slice(0, limit).map((s) => s.p)
}

const DEFAULT_SUGGESTIONS = [
  'What is on the school list?',
  'How much is delivery?',
  'Can I pay on delivery?',
  'Talk to a person',
]

const INTENTS: Intent[] = [
  {
    id: 'human',
    test: /\b(human|person|agent|rep|representative|someone|call me|speak to|talk to)\b/i,
    handle: () => ({
      body: 'Sure — I will pass you to a rep now. They answer on WhatsApp fastest, usually within a few minutes during the day.',
      shouldEscalate: true,
    }),
  },
  {
    id: 'delivery',
    test: /\b(deliver|delivery|shipping|how long|when will|arrive|dispatch)\b/i,
    handle: () => ({
      body: `Up to 14 days anywhere in Nigeria. Delivery is ${money(150_000)} flat, and free once your order passes ${money(site.freeDeliveryThresholdKobo)}.`,
      suggestions: ['Can I pay on delivery?', 'Do you deliver to Enugu?', 'Talk to a person'],
    }),
  },
  {
    id: 'pod',
    test: /\b(pay on delivery|cash on delivery|pod|pay when|pay later|before i pay)\b/i,
    handle: () => ({
      body: 'Yes — pay on delivery is available in Lagos, Abuja and Port Harcourt. You open the package and check the item before you hand over cash or transfer. Everywhere else, pay online with Paystack: card, bank transfer or USSD.',
      suggestions: ['What if the size is wrong?', 'How much is delivery?'],
    }),
  },
  {
    id: 'payment',
    test: /\b(paystack|card|transfer|ussd|payment|pay online|bank)\b/i,
    handle: () => ({
      body: 'Paystack handles the online payments — card, bank transfer, USSD and direct debit. Your card details go straight to Paystack, never to us. Pay on delivery is there too if you are in Lagos, Abuja or Port Harcourt.',
      suggestions: ['Can I pay on delivery?', 'Is my payment secure?'],
    }),
  },
  {
    id: 'returns',
    test: /\b(return|refund|wrong size|exchange|damaged|broken|send back)\b/i,
    handle: () => ({
      body: 'Seven days to tell us. Wrong size, wrong item, or damaged in transit — we arrange the pickup ourselves and either exchange it or refund you in full. No restocking fee.',
      suggestions: ['Talk to a person', 'How long does delivery take?'],
    }),
  },
  {
    id: 'checklist',
    test: /\b(school list|checklist|resumption|starting school|everything|what do i need|essentials)\b/i,
    handle: () => {
      const picks = [
        'complete-stationery-starter-kit-32-pieces',
        'a4-hardcover-exercise-books-10-pack-80-leaves',
        'tancha-classic-24l-school-backpack',
        'stainless-steel-lunch-flask-700ml',
        'casio-fx-991ex-scientific-calculator',
      ]
        .map((slug) => productBySlug.get(slug)?.id)
        .filter((id): id is string => Boolean(id))
      return {
        body: 'The fastest way is the Stationery Starter Kit — 32 pieces checked against a standard Nigerian school list. Pair it with a bag, exercise books, a lunch flask and a calculator and the list is done. These five cover most of it:',
        productIds: picks,
        suggestions: ['How much is delivery?', 'Do you have uniforms?'],
      }
    },
  },
  {
    id: 'bulk',
    test: /\b(bulk|wholesale|carton|cartons|dozen|classroom|large order|school order|quantities|for my school)\b/i,
    handle: () => ({
      body: 'For schools and bulk orders we quote straight off the producer price — it drops well below what you see on the site. Send the list and quantities to a rep and they will price it the same day.',
      suggestions: ['Talk to a person', 'What is on the school list?'],
      shouldEscalate: false,
    }),
  },
  {
    id: 'cheap',
    test: /\b(cheap|cheapest|affordable|low price|budget|under|less than)\b/i,
    handle: () => {
      const picks = [...products].sort((a, b) => a.priceKobo - b.priceKobo).slice(0, 4)
      return {
        body: 'Here is the bottom of the range right now. All of it comes direct from the producer, which is why the prices look the way they do:',
        productIds: picks.map((p) => p.id),
        suggestions: ['What is on the school list?', 'Can I pay on delivery?'],
      }
    },
  },
  {
    id: 'deals',
    test: /\b(deal|discount|offer|sale|promo|off)\b/i,
    handle: () => {
      const picks = [...products]
        .filter((p) => p.compareAtKobo)
        .sort((a, b) => a.priceKobo / (a.compareAtKobo ?? 1) - b.priceKobo / (b.compareAtKobo ?? 1))
        .slice(0, 4)
      return {
        body: 'Deal of the day runs until midnight and the deal of the week resets on Sunday. These are carrying the biggest cuts right now:',
        productIds: picks.map((p) => p.id),
        suggestions: ['How much is delivery?', 'Talk to a person'],
      }
    },
  },
  {
    id: 'greeting',
    test: /^\s*(hi|hey|hello|good (morning|afternoon|evening)|how far|abeg)\b/i,
    handle: () => ({
      body: 'Hello. I can help with the school list, prices, delivery, or finding a specific item. What are you shopping for?',
      suggestions: DEFAULT_SUGGESTIONS,
    }),
  },
]

export const localAssistant: AssistantProvider = {
  name: 'tancha-local',
  async reply({ message }: { message: string; history: ChatMessage[] }): Promise<AssistantReply> {
    await new Promise((r) => setTimeout(r, 420 + Math.random() * 420))

    for (const intent of INTENTS) {
      if (intent.test.test(message)) return intent.handle(message)
    }

    const found = findProducts(message)
    if (found.length > 0) {
      return {
        body:
          found.length === 1
            ? `Found it — ${found[0].name}, ${money(found[0].priceKobo)}. Delivered in ${formatDayRange(found[0].deliveryDaysMin, found[0].deliveryDaysMax)} days.`
            : 'These match what you described:',
        productIds: found.map((p) => p.id),
        suggestions: ['How much is delivery?', 'Can I pay on delivery?', 'Talk to a person'],
      }
    }

    return {
      body: 'I did not catch that one. I can help with the school list, delivery, payment, returns, or finding a product — or I can put you through to a rep.',
      suggestions: DEFAULT_SUGGESTIONS,
    }
  },
}
