import {
  createContext, useCallback, useContext, useEffect, useMemo, useReducer,
  type ReactNode,
} from 'react'
import type { CartLine } from '@/types/commerce'
import type { Product, ProductVariant } from '@/types/catalog'

const STORAGE_KEY = 'tancha.cart.v1'

type State = { lines: CartLine[] }

type Action =
  | { type: 'add'; line: CartLine }
  | { type: 'setQty'; productId: string; variantId: string | null; quantity: number }
  | { type: 'remove'; productId: string; variantId: string | null }
  | { type: 'clear' }
  | { type: 'hydrate'; lines: CartLine[] }

const same = (a: CartLine, productId: string, variantId: string | null) =>
  a.productId === productId && a.variantId === variantId

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate':
      return { lines: action.lines }
    case 'add': {
      const existing = state.lines.find((l) => same(l, action.line.productId, action.line.variantId))
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            same(l, action.line.productId, action.line.variantId)
              ? { ...l, quantity: Math.min(99, l.quantity + action.line.quantity) }
              : l,
          ),
        }
      }
      return { lines: [...state.lines, action.line] }
    }
    case 'setQty':
      return {
        lines: state.lines
          .map((l) =>
            same(l, action.productId, action.variantId) ? { ...l, quantity: action.quantity } : l,
          )
          .filter((l) => l.quantity > 0),
      }
    case 'remove':
      return { lines: state.lines.filter((l) => !same(l, action.productId, action.variantId)) }
    case 'clear':
      return { lines: [] }
  }
}

type CartContextValue = {
  lines: CartLine[]
  itemCount: number
  add: (product: Product, variant?: ProductVariant | null, quantity?: number) => void
  setQuantity: (productId: string, variantId: string | null, quantity: number) => void
  remove: (productId: string, variantId: string | null) => void
  clear: () => void
  quantityOf: (productId: string) => number
}

const CartContext = createContext<CartContextValue | null>(null)

function readStorage(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CartLine[]) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { lines: [] })

  useEffect(() => {
    dispatch({ type: 'hydrate', lines: readStorage() })
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.lines))
    } catch {
      /* private browsing — cart simply does not survive a refresh */
    }
  }, [state.lines])

  const add = useCallback(
    (product: Product, variant?: ProductVariant | null, quantity = 1) => {
      dispatch({
        type: 'add',
        line: {
          productId: product.id,
          variantId: variant?.id ?? null,
          quantity,
          unitPriceKobo: variant?.priceKobo ?? product.priceKobo,
        },
      })
    },
    [],
  )

  const value = useMemo<CartContextValue>(
    () => ({
      lines: state.lines,
      itemCount: state.lines.reduce((n, l) => n + l.quantity, 0),
      add,
      setQuantity: (productId, variantId, quantity) =>
        dispatch({ type: 'setQty', productId, variantId, quantity }),
      remove: (productId, variantId) => dispatch({ type: 'remove', productId, variantId }),
      clear: () => dispatch({ type: 'clear' }),
      quantityOf: (productId) =>
        state.lines.filter((l) => l.productId === productId).reduce((n, l) => n + l.quantity, 0),
    }),
    [state.lines, add],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
