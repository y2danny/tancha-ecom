import { useRef, useState } from 'react'
import { ImageOff, Loader2, Upload } from 'lucide-react'
import { uploadProductImage } from '@/lib/productImages'
import { ProductImage } from '@/components/product/ProductImage'
import type { ImageKey } from '@/types/catalog'
import { Button } from '@/components/ui/Button'

/**
 * The product photo an admin actually cares about — separate from `imageKey`,
 * which only picks which built-in illustration shows when there's no real
 * photo yet (see ProductImage). Uploads straight to the `product-images`
 * storage bucket and hands back its public URL; the illustration is still
 * shown as a live preview of the fallback so it's clear what a product looks
 * like on the storefront before a photo is added. For more than one photo,
 * see ProductGalleryUploader below this one in the form.
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
    setUploading(true)
    try {
      onChange(await uploadProductImage(file))
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
            {value ? 'The main photo — shown first on the storefront.' : 'No photo yet — the illustration shows in its place.'}
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
