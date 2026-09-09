import { Link } from 'react-router-dom'
import { site } from '@/config/site'
import { useSeo } from '@/lib/seo'

const CONTENT: Record<string, { title: string; blocks: [string, string][] }> = {
  help: {
    title: 'Delivery, payment and returns',
    blocks: [
      ['How long does delivery take?', 'Two to five working days nationwide. Lagos mainland orders placed before noon usually go out the same day.'],
      ['What does delivery cost?', 'A flat ₦1,500 anywhere in Nigeria, free on orders above ₦30,000.'],
      ['Can I pay on delivery?', 'Yes, in Lagos, Abuja and Port Harcourt. Open the package and check the item before you hand over cash or transfer.'],
      ['What payment methods work online?', 'Card, bank transfer, USSD and direct debit, all through Paystack. Your card details never touch our servers.'],
      ['What if the size is wrong?', 'Seven days to tell us. We arrange the pickup and either exchange it or refund you in full.'],
      ['Do you sell wholesale?', 'For schools and bulk orders, message us on WhatsApp and we will quote directly off the producer price.'],
    ],
  },
  track: {
    title: 'Track your order',
    blocks: [
      ['Where is my order?', 'Order tracking goes live with the customer accounts release. For now, send your reference to the chat or WhatsApp and a rep will check it within minutes.'],
      ['I did not get a confirmation', 'Check the phone number you entered at checkout. If it was wrong, message us with your name and we will find the order.'],
    ],
  },
  account: {
    title: 'Your account',
    blocks: [
      ['Sign in is coming', 'Accounts, saved addresses and order history arrive with the Supabase auth release. Everything today works as guest checkout.'],
      ['Staff?', 'Sign in from the staff page linked in the footer.'],
    ],
  },
}

export function StaticPage({ page }: { page: keyof typeof CONTENT }) {
  const content = CONTENT[page]
  useSeo({ title: content.title, noindex: page === 'account' })
  return (
    <div className="mx-auto max-w-2xl px-3 py-8 sm:px-4">
      <h1 className="text-2xl font-extrabold tracking-tight">{content.title}</h1>
      <div className="mt-4 divide-y divide-hairline rounded-md bg-white shadow-card">
        {content.blocks.map(([q, a]) => (
          <div key={q} className="p-4 sm:p-5">
            <h2 className="text-sm font-bold">{q}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{a}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">
        Still stuck? Call {site.supportPhone} or use the chat at the bottom right.
      </p>
      <Link to="/" className="mt-4 inline-block text-sm font-semibold text-navy-600 hover:underline">
        ← Back to the storefront
      </Link>
    </div>
  )
}
