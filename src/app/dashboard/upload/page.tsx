'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, Loader2, ScanLine, X } from 'lucide-react'

const MIN_IMAGES = 3
const MAX_IMAGES = 12
const MAX_FILE_BYTES = 8 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

type Selected = { file: File; url: string; id: string }

export default function UploadPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [images, setImages] = useState<Selected[]>([])
  const [dragging, setDragging] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      setError(null)
      const incoming = Array.from(fileList)
      const valid: Selected[] = []

      for (const file of incoming) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          setError('Only JPEG, PNG and WebP images are supported.')
          continue
        }
        if (file.size > MAX_FILE_BYTES) {
          setError(`"${file.name}" is larger than 8MB.`)
          continue
        }
        valid.push({
          file,
          url: URL.createObjectURL(file),
          id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
        })
      }

      setImages((prev) => {
        const combined = [...prev, ...valid]
        if (combined.length > MAX_IMAGES) {
          setError(`You can upload at most ${MAX_IMAGES} images.`)
          return combined.slice(0, MAX_IMAGES)
        }
        return combined
      })
    },
    []
  )

  function removeImage(id: string) {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((i) => i.id !== id)
    })
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  async function analyze() {
    if (images.length < MIN_IMAGES) {
      setError(`Add at least ${MIN_IMAGES} images to analyse.`)
      return
    }
    setError(null)
    setAnalyzing(true)

    const formData = new FormData()
    images.forEach((img) => formData.append('images', img.file))

    try {
      const res = await fetch('/api/aesthetic-dna', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setAnalyzing(false)
        return
      }

      router.push(`/dashboard/report/${data.profile_id}`)
    } catch {
      setError('Network error. Please try again.')
      setAnalyzing(false)
    }
  }

  if (analyzing) {
    return <AnalyzingState count={images.length} />
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Analyse your feed</h1>
      <p className="mt-1 text-sm text-muted">
        Upload {MIN_IMAGES}–{MAX_IMAGES} images that represent your visual identity. We read them
        as one set.
      </p>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`mt-8 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center transition-colors ${
          dragging
            ? 'border-[var(--accent)] bg-[var(--accent)]/5'
            : 'border-border bg-panel hover:border-white/20'
        }`}
      >
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--violet))' }}
        >
          <ImagePlus className="h-5 w-5 text-white" />
        </div>
        <p className="text-sm font-medium">Drag & drop your images here</p>
        <p className="mt-1 text-xs text-muted">or click to browse — JPEG, PNG, WebP up to 8MB</p>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {/* Previews */}
      {images.length > 0 && (
        <>
          <div className="mt-8 flex items-center justify-between">
            <span className="text-sm text-muted">
              {images.length} / {MAX_IMAGES} selected
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {images.map((img) => (
              <div
                key={img.id}
                className="group relative aspect-square overflow-hidden rounded-xl border border-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => removeImage(img.id)}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Remove image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <button
        onClick={analyze}
        disabled={images.length < MIN_IMAGES}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        style={{ backgroundColor: 'var(--accent)' }}
      >
        Reveal my Aesthetic DNA
      </button>
    </div>
  )
}

function AnalyzingState({ count }: { count: number }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="relative mb-8 h-40 w-40 overflow-hidden rounded-2xl border border-border bg-panel">
        {/* sweeping scan line */}
        <div
          className="animate-scan absolute inset-x-0 h-1/3"
          style={{
            background:
              'linear-gradient(180deg, transparent, rgba(109,92,255,0.45), transparent)',
          }}
        />
        <div className="flex h-full w-full items-center justify-center">
          <ScanLine className="h-10 w-10 text-[var(--accent)]" />
        </div>
      </div>

      <h2 className="text-xl font-semibold tracking-tight">Reading your visual identity…</h2>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Studying {count} images as one set — sampling palette, tone, composition and mood.
      </p>
      <div className="mt-6 flex items-center gap-2 text-xs text-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        This usually takes 10–20 seconds
      </div>
    </div>
  )
}
