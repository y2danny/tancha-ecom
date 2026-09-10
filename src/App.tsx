import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { CartProvider } from '@/store/cart'
import { AuthProvider } from '@/store/auth'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ChatWidget } from '@/components/support/ChatWidget'
import { HomePage } from '@/features/home/HomePage'
import { StaticPage } from '@/features/home/StaticPage'
import { LegalPage } from '@/features/legal/LegalPage'
import { ListingPage } from '@/features/catalog/ListingPage'
import { ProductPage } from '@/features/catalog/ProductPage'
import { DealsPage } from '@/features/catalog/DealsPage'
import { CartPage } from '@/features/cart/CartPage'
import { CheckoutPage } from '@/features/checkout/CheckoutPage'
import { OrderConfirmationPage } from '@/features/orders/OrderConfirmationPage'
import { NotFoundPage } from '@/features/home/NotFoundPage'

// The admin console is never touched by a customer, so it is loaded only
// when someone actually navigates to /admin — about a third of the bundle
// otherwise ships to every shopper for nothing.
const AdminLayout = lazy(() => import('@/features/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })))
const LoginPage = lazy(() => import('@/features/admin/LoginPage').then((m) => ({ default: m.LoginPage })))
const AcceptInvitePage = lazy(() =>
  import('@/features/admin/AcceptInvitePage').then((m) => ({ default: m.AcceptInvitePage })),
)
const DashboardPage = lazy(() => import('@/features/admin/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const ProductsPage = lazy(() => import('@/features/admin/pages/ProductsPage').then((m) => ({ default: m.ProductsPage })))
const InventoryPage = lazy(() => import('@/features/admin/pages/InventoryPage').then((m) => ({ default: m.InventoryPage })))
const AdminDealsPage = lazy(() => import('@/features/admin/pages/DealsPage').then((m) => ({ default: m.DealsPage })))
const OrdersPage = lazy(() => import('@/features/admin/pages/OrdersPage').then((m) => ({ default: m.OrdersPage })))
const TeamPage = lazy(() => import('@/features/admin/pages/TeamPage').then((m) => ({ default: m.TeamPage })))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])
  return null
}

/** Header, footer and the chat widget wrap every customer-facing page —
 *  but never the admin console, which has its own shell. */
function StorefrontLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ChatWidget />
    </div>
  )
}

function AdminFallback() {
  return <div className="grid min-h-dvh place-items-center text-sm text-muted">Loading the console…</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <ScrollToTop />
          <Suspense fallback={<AdminFallback />}>
            <Routes>
              <Route element={<StorefrontLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/c/:slug" element={<ListingPage mode="category" />} />
                <Route path="/search" element={<ListingPage mode="search" />} />
                <Route path="/product/:slug" element={<ProductPage />} />
                <Route path="/deals" element={<DealsPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/order/:reference" element={<OrderConfirmationPage />} />
                <Route path="/help" element={<StaticPage page="help" />} />
                <Route path="/track" element={<StaticPage page="track" />} />
                <Route path="/account" element={<StaticPage page="account" />} />
                <Route path="/legal/:slug" element={<LegalPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>

              <Route path="/admin/login" element={<LoginPage />} />
              <Route path="/admin/accept-invite" element={<AcceptInvitePage />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="deals" element={<AdminDealsPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="team" element={<TeamPage />} />
              </Route>
            </Routes>
          </Suspense>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
