import { useRef, useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import { uploadProductImage } from '@/lib/productImages'

const MAX_EXTRA = 6

/**
 * Extra photos beyond the one main image — the row of thumbnail slots a
 * shopper clicks through on the product page (see ProductPage.tsx). Each
 * slot uploads independently so one bad file doesn't block the others, and
 * order here is the order they'll appear in on the storefront.
 */
export function ProductGalleryUploader({
  value,
  onChange,
}: {
  value: string[]
  onChange: (urls: string[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pick = () => inputRef.current?.click()

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError(null)
    const room = MAX_EXTRA - value.length
    const batch = Array.from(files).slice(0, room)
    if (files.length > room) setError(`Only added ${room} — up to ${MAX_EXTRA} extra photos per product.`)
    setUploading(true)
    try {
      const uploaded = await Promise.all(
        batch.map((file) =>
          uploadProductImage(file).catch((err) => {
            setError(err instanceof Error ? err.message : 'Could not upload one of those photos')
            return null
          }),
        ),
      )
      const urls = uploaded.filter((u): u is string => u !== null)
      if (urls.length) onChange([...value, ...urls])
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = (url: string) => onChange(value.filter((u) => u !== url))

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((url) => (
          <div key={url} className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-hairline">
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(url)}
              aria-label="Remove photo"
              className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-navy-950/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {value.length < MAX_EXTRA && (
          <button
            type="button"
            onClick={pick}
            disabled={uploading}
            className="grid h-16 w-16 shrink-0 place-items-center rounded-md border border-dashed border-hairline text-muted hover:border-navy-400 hover:text-navy-600 disabled:opacity-50"
            aria-label="Add photo"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          </button>
        )}
      </div>
      <p className="mt-1.5 text-xs text-muted">
        {value.length}/{MAX_EXTRA} extra photos. Shown as thumbnails on the product page, in this order.
      </p>
      <input
        ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p role="alert" className="mt-2 text-xs font-semibold text-flash-dark">{error}</p>}
    </div>
  )
}
