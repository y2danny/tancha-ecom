import { useRef, useState } from 'react'
import { ImageOff, Loader2, Upload } from 'lucide-react'
import { supabase, supabaseReady } from '@/data/supabase/client'
import { ProductImage } from '@/components/product/ProductImage'
import type { ImageKey } from '@/types/catalog'
import { Button } from '@/components/ui/Button'

const MAX_BYTES = 5 * 1024 * 1024
const BUCKET = 'product-images'

function randomPath(file: File) {
  const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : ''
  const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${id}${ext}`
}

/**
 * The product photo an admin actually cares about — separate from `imageKey`,
 * which only picks which built-in illustration shows when there's no real
 * photo yet (see ProductImage). Uploads straight to the `product-images`
 * storage bucket and hands back its public URL; the illustration is still
 * shown as a live preview of the fallback so it's clear what a product looks
 * like on the storefront before a photo is added.
 */
export function ProductPhotoUploader({
  value,
  onChange,
  imageKey,
  alt,
}: {
  value: string | null | undefined
  onChange: (url: string | null) => void
  imageKey: ImageKey
  alt: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pick = () => inputRef.current?.click()

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file (JPG, PNG, WebP).')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('That photo is over 5MB — resize it and try again.')
      return
    }
    if (!supabaseReady) {
      setError('Photo upload needs Supabase connected. In demo mode only the illustration shows.')
      return
    }
    setUploading(true)
    try {
      const path = randomPath(file)
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      onChange(data.publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload that photo')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md border border-hairline bg-canvas">
          <ProductImage imageKey={imageKey} imageUrl={value} alt={alt} />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={pick} disabled={uploading}>
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? 'Uploading…' : value ? 'Replace photo' : 'Upload photo'}
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} disabled={uploading}>
                <ImageOff size={14} /> Remove
              </Button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {value ? 'Shown on the storefront instead of the illustration.' : 'No photo yet — the illustration below shows in its place.'}
          </p>
        </div>
      </div>
      <input
        ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {error && <p role="alert" className="mt-2 text-xs font-semibold text-flash-dark">{error}</p>}
    </div>
  )
}
