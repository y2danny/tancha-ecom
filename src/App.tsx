import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { CartProvider } from '@/store/cart'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ChatWidget } from '@/components/support/ChatWidget'
import { HomePage } from '@/features/home/HomePage'
import { StaticPage } from '@/features/home/StaticPage'
import { ListingPage } from '@/features/catalog/ListingPage'
import { ProductPage } from '@/features/catalog/ProductPage'
import { DealsPage } from '@/features/catalog/DealsPage'
import { CartPage } from '@/features/cart/CartPage'
import { CheckoutPage } from '@/features/checkout/CheckoutPage'
import { OrderConfirmationPage } from '@/features/orders/OrderConfirmationPage'
import { AdminPage } from '@/features/admin/AdminPage'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <ScrollToTop />
        <div className="flex min-h-dvh flex-col">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/c/:slug" element={<ListingPage mode="category" />} />
              <Route path="/search" element={<ListingPage mode="search" />} />
              <Route path="/product/:slug" element={<ProductPage />} />
              <Route path="/deals" element={<DealsPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order/:reference" element={<OrderConfirmationPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/help" element={<StaticPage page="help" />} />
              <Route path="/track" element={<StaticPage page="track" />} />
              <Route path="/account" element={<StaticPage page="account" />} />
              <Route path="*" element={<StaticPage page="help" />} />
            </Routes>
          </main>
          <Footer />
          <ChatWidget />
        </div>
      </CartProvider>
    </BrowserRouter>
  )
}
