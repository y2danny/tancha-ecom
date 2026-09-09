import { Link } from 'react-router-dom'
import { Mail, MapPin, Phone, ShieldCheck, Truck, Undo2, Wallet } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { site } from '@/config/site'
import { categories } from '@/data/mock/categories'

const PROMISES = [
  { icon: Truck, title: 'Nationwide delivery', body: '2–5 working days to all 36 states' },
  { icon: Wallet, title: 'Pay on delivery', body: 'Lagos, Abuja & Port Harcourt' },
  { icon: Undo2, title: '7-day returns', body: 'Wrong size or damaged? Send it back' },
  { icon: ShieldCheck, title: 'Producer direct', body: 'No middleman, no market markup' },
]

export function Footer() {
  return (
    <footer className="mt-10">
      <div className="border-y border-hairline bg-white">
        <div className="mx-auto grid max-w-[1400px] gap-px bg-hairline sm:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-start gap-3 bg-white px-5 py-5">
              <Icon className="mt-0.5 shrink-0 text-navy-600" size={22} />
              <div>
                <p className="text-sm font-bold">{title}</p>
                <p className="text-xs text-muted">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-navy-950 text-navy-100">
        <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo variant="white" className="text-white" />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-navy-200">
              We buy straight from the producers and sell straight to you. The savings are the
              markups nobody added.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(
                [
                  ['Instagram', site.socials.instagram],
                  ['TikTok', site.socials.tiktok],
                  ['X', site.socials.x],
                ] as const
              ).map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold hover:bg-white/20 hover:text-white"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-white">Shop</h3>
            <ul className="space-y-2 text-sm">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link to={`/c/${c.slug}`} className="hover:text-white">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-white">Help</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/deals" className="hover:text-white">Today&apos;s deals</Link></li>
              <li><Link to="/track" className="hover:text-white">Track my order</Link></li>
              <li><Link to="/help" className="hover:text-white">Delivery &amp; returns</Link></li>
              <li><Link to="/help" className="hover:text-white">Payment options</Link></li>
              <li><Link to="/admin" className="hover:text-white">Staff sign-in</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-white">Talk to us</h3>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center gap-2"><Phone size={15} /> {site.supportPhone}</li>
              <li className="flex items-center gap-2"><Mail size={15} /> {site.supportEmail}</li>
              <li className="flex items-start gap-2"><MapPin size={15} className="mt-0.5" /> Lagos, Nigeria</li>
            </ul>
            <div className="mt-4 rounded-md bg-white/5 p-3">
              <p className="text-xs font-semibold text-white">Secured by Paystack</p>
              <p className="mt-1 text-xs text-navy-300">
                Card, transfer, USSD and bank — or pay the rider on delivery.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-4 text-xs text-navy-300 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
            <p>Prices in Naira (₦). Deals end when the timer does.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
