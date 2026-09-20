/**
 * Photo promo banners for the homepage hero carousel — full-bleed offer
 * graphics (as opposed to the vector-illustration imagery used everywhere
 * else on the site). Each one is a flat image asset in `public/images/promos/`
 * built to a 1400×460 canvas; add a new entry here and drop the matching
 * file in that folder to add another slide. `href` should point at a real
 * route (a category, a deal, or a specific product) — never link a banner
 * to something that doesn't exist yet in the catalog.
 */
export type PromoBanner = {
  id: string
  image: string
  alt: string
  href?: string
}

export const promoBanners: PromoBanner[] = [
  {
    id: 'new-categories-launch',
    image: '/images/promos/new-categories-launch.jpg',
    alt: 'New on Tancha: 4 new categories — Electronics, Phones, Home and Fashion — same producer prices',
    href: '/search',
  },
  {
    id: 'complete-backpack-set',
    image: '/images/promos/complete-backpack-set.jpg',
    alt: 'Complete Backpack Set — backpack, lunch bag, pencil case and pouch, all four pieces for ₦20,000, while stock lasts',
    href: '/c/school-bags',
  },
]
