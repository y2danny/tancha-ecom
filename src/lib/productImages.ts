import { supabase, supabaseReady } from '@/data/supabase/client'

const MAX_BYTES = 5 * 1024 * 1024
const BUCKET = 'product-images'

function randomPath(file: File) {
  const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : ''
  const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${id}${ext}`
}

/**
 * Validates and uploads one file to the `product-images` bucket, returning
 * its public URL. Shared by the single main-photo uploader and the gallery
 * uploader so the validation rules and error copy only live in one place.
 */
export async function uploadProductImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file (JPG, PNG, WebP).')
  if (file.size > MAX_BYTES) throw new Error('That photo is over 5MB — resize it and try again.')
  if (!supabaseReady) throw new Error('Photo upload needs Supabase connected. In demo mode only the illustration shows.')

  const path = randomPath(file)
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
