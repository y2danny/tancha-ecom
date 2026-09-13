import { supabase, supabaseReady } from '@/data/supabase/client'

const MAX_BYTES = 5 * 1024 * 1024
const BUCKET = 'product-images'

// Long edge a resized photo is capped to. Plenty for product-card and PDP
// display; keeps a 12-48MP phone photo well under MAX_BYTES after re-encode.
const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.82

// Formats every browser can both upload *and* later render in an <img> tag
// on the storefront. Anything else (most notably HEIC/HEIF — the default
// capture format on iPhones, and the #1 cause of "upload works on desktop,
// fails on mobile") gets decoded and re-encoded to JPEG below instead of
// rejected outright.
const WEB_SAFE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function looksLikeImage(file: File) {
  if (file.type.startsWith('image/')) return true
  // Some mobile browsers hand over HEIC/HEIF files with an empty or missing
  // `type` — fall back to the extension so those aren't rejected outright.
  return /\.(heic|heif|jpe?g|png|webp|gif|avif|bmp)$/i.test(file.name)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read that image'))
    img.src = src
  })
}

function withJpegExtension(name: string) {
  const base = name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : name
  return `${base || 'photo'}.jpg`
}

/**
 * Downscales + re-encodes a photo to JPEG client-side before it ever hits
 * the network. Skips the work for a file that's already a small, web-safe
 * format (the common desktop case — someone picking an already-optimized
 * image). Everything else — a big camera photo, or a format browsers can't
 * all display (HEIC/HEIF) — gets decoded via <img>/canvas and re-exported,
 * which fixes both the "photo too big" and the "upload 'succeeds' but the
 * photo is blank for shoppers not on an iPhone" failure modes in one pass.
 */
async function prepareImage(file: File): Promise<File> {
  if (WEB_SAFE_TYPES.has(file.type) && file.size <= MAX_BYTES) return file

  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await loadImage(objectUrl)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
    if (!blob) return file
    return new File([blob], withJpegExtension(file.name), { type: 'image/jpeg' })
  } catch {
    // Browser couldn't decode it client-side (rare — e.g. an Android
    // browser handed a HEIC file). Fall back to the original; the size/type
    // checks below will still catch anything that can't go up as-is.
    return file
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

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
  if (!looksLikeImage(file)) throw new Error('Choose an image file (JPG, PNG, WebP, or a phone photo).')
  if (!supabaseReady) throw new Error('Photo upload needs Supabase connected. In demo mode only the illustration shows.')

  const prepared = await prepareImage(file)
  if (prepared.size > MAX_BYTES) {
    throw new Error('That photo is too large even after compressing it — try a different photo.')
  }

  const path = randomPath(prepared)
  const { error } = await supabase.storage.from(BUCKET).upload(path, prepared, { upsert: false })
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
