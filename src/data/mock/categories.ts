import type { Category } from '@/types/catalog'

export const categories: Category[] = [
  {
    id: 'cat_bags',
    slug: 'school-bags',
    name: 'School Bags',
    imageKey: 'backpack',
    parentId: null,
    productCount: 8,
    featured: true,
  },
  {
    id: 'cat_stationery',
    slug: 'books-stationery',
    name: 'Books & Stationery',
    imageKey: 'notebook',
    parentId: null,
    productCount: 9,
    featured: true,
  },
  {
    id: 'cat_tech',
    slug: 'study-tech',
    name: 'Study Tech',
    imageKey: 'calculator',
    parentId: null,
    productCount: 8,
    featured: true,
  },
  {
    id: 'cat_audio',
    slug: 'audio-power',
    name: 'Audio & Power',
    imageKey: 'powerbank',
    parentId: null,
    productCount: 7,
    featured: true,
  },
  {
    id: 'cat_wear',
    slug: 'uniforms-footwear',
    name: 'Uniforms & Footwear',
    imageKey: 'shoes',
    parentId: null,
    productCount: 8,
    featured: true,
  },
  {
    id: 'cat_lunch',
    slug: 'lunch-hydration',
    name: 'Lunch & Hydration',
    imageKey: 'lunchbox',
    parentId: null,
    productCount: 7,
    featured: true,
  },
  {
    id: 'cat_electronics',
    slug: 'electronics-gadgets',
    name: 'Electronics & Gadgets',
    imageKey: 'tablet',
    parentId: null,
    productCount: 0,
    featured: true,
  },
]

export const categoryById = new Map(categories.map((c) => [c.id, c]))
export const categoryBySlug = new Map(categories.map((c) => [c.slug, c]))
