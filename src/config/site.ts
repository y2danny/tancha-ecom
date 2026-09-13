/**
 * Single source of truth for business-level configuration.
 * Everything here moves to a `settings` table the CEO edits from the admin
 * panel — the shape is deliberately already database-shaped.
 */
export const site = {
  name: 'Tancha',
  tagline: 'Direct from the producer. Priced for Nigeria.',
  supportPhone: '0801 234 5678',
  supportWhatsApp: '2348012345678',
  supportEmail: 'hello@tancha.ng',
  freeDeliveryThresholdKobo: 3_000_000, // ₦30,000
  currency: 'NGN',
  paymentMethods: ['paystack', 'pay_on_delivery'] as const,
  serviceCities: ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano', 'Enugu'],
  socials: {
    instagram: 'https://instagram.com/tancha.ng',
    x: 'https://x.com/tancha_ng',
    tiktok: 'https://tiktok.com/@tancha.ng',
    facebook: 'https://facebook.com/tancha.ng',
  },
}

export const announcements = [
  'New: phones, home & fashion now on Tancha — direct from the producer',
  'Free delivery on orders over ₦30,000 nationwide',
  'Pay on delivery available in Lagos, Abuja & Port Harcourt',
  'Direct from the producer. No middleman markup.',
]
