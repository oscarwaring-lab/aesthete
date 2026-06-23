// Shared client-side image compression.
//
// Scales an image to a max 1200px longest edge and re-encodes as JPEG.
// Vercel rejects request bodies over 4.5MB at the edge, and phone photos
// (3-8MB each) blow past that, so we shrink before upload. Falls back to
// the original file if anything goes wrong.
//
// Used by both the feed-upload page and the continuity check page.

const MAX_EDGE = 1200
const JPEG_QUALITY = 0.82

export async function compressImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
    const targetW = Math.round(width * scale)
    const targetH = Math.round(height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    )
    if (!blob) return file

    // Preserve the original filename so the server-side experience is unchanged.
    return new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    return file
  }
}
