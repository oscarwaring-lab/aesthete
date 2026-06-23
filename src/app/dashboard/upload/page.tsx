'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, X } from 'lucide-react'
import { compressImage } from '@/lib/compress-image'

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
    const compressed = await Promise.all(images.map((img) => compressImage(img.file)))
    compressed.forEach((file) => formData.append('images', file))

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

  const ready = images.length >= MIN_IMAGES

  return (
    <div style={{ background: 'var(--void)', minHeight: '100%', padding: 28 }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* ─── Heading ──────────────────────────────────────────── */}
        <h1
          style={{
            fontFamily: 'var(--font-playfair), Georgia, serif',
            fontSize: 28,
            fontWeight: 500,
            color: '#f2f2f5',
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          Analyse your feed
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
          Upload {MIN_IMAGES}–{MAX_IMAGES} images that represent your visual identity. We read them
          as one set.
        </p>

        {/* ─── Drop zone ────────────────────────────────────────── */}
        <div
          className={`upload-zone${dragging ? ' dragging' : ''}`}
          style={{ marginTop: 24 }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <ImagePlus size={32} style={{ color: 'rgba(255,255,255,0.2)' }} strokeWidth={1.5} />
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 14 }}>
            Drag &amp; drop your images here
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 6 }}>
            or click to browse — JPEG, PNG, WebP up to 8MB
          </p>
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

        {error && (
          <p style={{ marginTop: 16, fontSize: 13, color: '#C4933A' }}>{error}</p>
        )}

        {/* ─── Previews ─────────────────────────────────────────── */}
        {images.length > 0 && (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 8,
                marginTop: 24,
              }}
            >
              {images.map((img) => (
                <div key={img.id} className="upload-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" />
                  <button
                    className="remove"
                    onClick={() => removeImage(img.id)}
                    aria-label="Remove image"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <p style={{ marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              {images.length} / {MAX_IMAGES} selected
            </p>
          </>
        )}

        {/* ─── Analyse button ───────────────────────────────────── */}
        <button
          className={`analyse-btn${analyzing ? ' loading' : ''}`}
          style={{ marginTop: images.length > 0 ? 8 : 24 }}
          onClick={analyze}
          disabled={!ready || analyzing}
        >
          {analyzing ? 'Reading your visual identity…' : 'Reveal my Aesthetic DNA'}
        </button>
      </div>
    </div>
  )
}
