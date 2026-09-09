import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Headset, MessageCircle, Send, X } from 'lucide-react'
import { localAssistant } from './assistant'
import { LogoMark } from '@/components/brand/Logo'
import { ProductImage } from '@/components/product/ProductImage'
import { productById } from '@/data/mock/products'
import { formatNaira, toWhatsAppNumber } from '@/lib/format'
import { site } from '@/config/site'
import type { ChatMessage, ChatSessionStatus } from '@/types/support'
import { cn } from '@/lib/cn'

const STORAGE_KEY = 'tancha.chat.v1'
const uid = () => Math.random().toString(36).slice(2, 10)

const GREETING: ChatMessage = {
  id: 'greet',
  author: 'assistant',
  body: 'Hi — Tancha assistant here. Ask me about the school list, delivery, payment, or any product. If you would rather speak to a person, just say so.',
  createdAt: new Date().toISOString(),
  suggestions: ['What is on the school list?', 'How much is delivery?', 'Can I pay on delivery?'],
}

function ProductChips({ ids }: { ids: string[] }) {
  return (
    <div className="mt-2 space-y-1.5">
      {ids.map((id) => {
        const p = productById.get(id)
        if (!p) return null
        return (
          <Link
            key={id}
            to={`/product/${p.slug}`}
            className="flex items-center gap-2 rounded-md bg-white p-1.5 ring-1 ring-hairline transition-colors hover:ring-navy-400"
          >
            <span className="h-9 w-9 shrink-0 overflow-hidden rounded">
              <ProductImage imageKey={p.imageKey} imageUrl={p.imageUrl} alt="" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2-safe text-[0.72rem] font-medium leading-tight text-ink">
                {p.name}
              </span>
            </span>
            <span className="shrink-0 text-[0.72rem] font-bold text-navy-700 tabular">
              {formatNaira(p.priceKobo)}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<ChatSessionStatus>('bot')
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const [unread, setUnread] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) setMessages(JSON.parse(raw) as ChatMessage[])
    } catch {
      /* nothing stored */
    }
  }, [])

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)))
    } catch {
      /* private mode */
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  // A nudge after 20s of browsing — once, and only if the panel was never opened.
  useEffect(() => {
    const id = window.setTimeout(() => setUnread(true), 20_000)
    return () => window.clearTimeout(id)
  }, [])

  const push = (msg: Omit<ChatMessage, 'id' | 'createdAt'>) =>
    setMessages((prev) => [...prev, { ...msg, id: uid(), createdAt: new Date().toISOString() }])

  const send = async (text: string) => {
    const body = text.trim()
    if (!body || typing) return
    setDraft('')
    push({ author: 'customer', body })
    setTyping(true)

    const reply = await localAssistant.reply({ message: body, history: messages })
    setTyping(false)
    push({
      author: 'assistant',
      body: reply.body,
      productIds: reply.productIds,
      suggestions: reply.suggestions,
    })

    if (reply.shouldEscalate) {
      setStatus('escalation_requested')
      push({
        author: 'system',
        body: 'Connecting you to a support rep…',
      })
    }
  }

  const whatsappHref = `https://wa.me/${toWhatsAppNumber(site.supportWhatsApp)}?text=${encodeURIComponent(
    `Hi Tancha, I was chatting on the site and would like to speak to someone.\n\nMy question: ${
      [...messages].reverse().find((m) => m.author === 'customer')?.body ?? '(no question yet)'
    }`,
  )}`

  return (
    <>
      {open && (
        <div className="animate-rise fixed inset-x-3 bottom-3 z-50 flex max-h-[min(620px,calc(100dvh-1.5rem))] flex-col overflow-hidden rounded-lg bg-canvas shadow-panel sm:inset-x-auto sm:right-5 sm:bottom-24 sm:w-[380px]">
          <header className="flex items-center gap-3 bg-navy-800 px-4 py-3 text-white">
            <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10">
              <LogoMark variant="white" size={26} />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-navy-800 bg-emerald-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight">Tancha assistant</p>
              <p className="text-[0.7rem] text-navy-200">
                {status === 'bot' ? 'Answers instantly · Reps 8am–8pm' : 'Handing over to a rep'}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="grid h-8 w-8 place-items-center rounded-md hover:bg-white/10"
            >
              <X size={17} />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
            {messages.map((m) => {
              if (m.author === 'system') {
                return (
                  <p key={m.id} className="text-center text-[0.7rem] font-semibold uppercase tracking-wide text-muted">
                    {m.body}
                  </p>
                )
              }
              const mine = m.author === 'customer'
              return (
                <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[85%]', mine && 'flex flex-col items-end')}>
                    <div
                      className={cn(
                        'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                        mine
                          ? 'rounded-br-sm bg-navy-700 text-white'
                          : 'rounded-bl-sm bg-white text-ink shadow-card',
                      )}
                    >
                      {m.body}
                    </div>
                    {m.productIds && m.productIds.length > 0 && <ProductChips ids={m.productIds} />}
                    {m.suggestions && m.suggestions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.suggestions.map((s) => (
                          <button
                            key={s}
                            onClick={() => send(s)}
                            className="rounded-full bg-white px-3 py-1.5 text-[0.72rem] font-semibold text-navy-700 shadow-card transition-colors hover:bg-navy-50"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {typing && (
              <div className="flex justify-start">
                <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-card">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy-400"
                      style={{ animationDelay: `${i * 120}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {status === 'escalation_requested' && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-card hover:bg-emerald-700"
              >
                <Headset size={17} />
                Continue on WhatsApp
              </a>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(draft)
            }}
            className="flex items-center gap-2 border-t border-hairline bg-white px-3 py-2.5"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about anything…"
              aria-label="Message"
              className="min-w-0 flex-1 rounded-full bg-canvas px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-navy-300"
            />
            <button
              type="submit"
              disabled={!draft.trim() || typing}
              aria-label="Send message"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy-700 text-white transition-colors hover:bg-navy-800 disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => {
          setOpen((v) => !v)
          setUnread(false)
        }}
        aria-label={open ? 'Close chat' : 'Open chat'}
        className={cn(
          'fixed bottom-4 right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-gold-400 text-navy-950 shadow-panel transition-transform hover:scale-105 sm:bottom-5 sm:right-5',
          !open && 'animate-pulse-ring',
        )}
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
        {unread && !open && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full bg-flash text-[0.65rem] font-bold text-white">
            1
          </span>
        )}
      </button>
    </>
  )
}
