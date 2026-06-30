// Dependency-free DOM → raster export.
//
// Renders a live DOM node to a high-resolution PNG/JPEG/PDF entirely in the
// browser, with no build-time dependencies (the npm registry is not required).
// Approach: deep-clone the node with every computed style inlined, embed the
// page's @font-face rules, inline cross-origin <img> sources as data URLs, then
// rasterise the whole thing through an SVG <foreignObject>. This preserves the
// card verbatim — CSS variables, color-mix(), gradients, box-shadows and all.
//
// Used to turn a DNA report card into a clean, shareable specimen image — the
// hook asset for creator DM outreach.

async function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Collect every @font-face rule on the page and rewrite its url() sources to
// inlined data URLs so the SVG render uses the real brand fonts (Playfair /
// Inter) rather than a fallback. Best-effort: any font that can't be fetched is
// simply left out.
async function inlineFontFaces(): Promise<string> {
  const out: string[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | null = null
    try {
      rules = sheet.cssRules
    } catch {
      continue // cross-origin stylesheet — can't read it
    }
    if (!rules) continue
    for (const rule of Array.from(rules)) {
      if (rule.constructor?.name !== 'CSSFontFaceRule') continue
      let cssText = rule.cssText
      const urls = Array.from(cssText.matchAll(/url\(["']?([^"')]+)["']?\)/g)).map((m) => m[1])
      for (const url of urls) {
        if (url.startsWith('data:')) continue
        try {
          const abs = new URL(url, sheet.href || location.href).href
          const blob = await (await fetch(abs)).blob()
          cssText = cssText.replace(url, await blobToDataURL(blob))
        } catch {
          /* skip this source */
        }
      }
      out.push(cssText)
    }
  }
  return out.join('\n')
}

function copyComputedStyle(src: Element, dest: HTMLElement): void {
  const cs = window.getComputedStyle(src)
  let css = ''
  for (let i = 0; i < cs.length; i++) {
    const prop = cs[i]
    css += prop + ':' + cs.getPropertyValue(prop) + ';'
  }
  dest.style.cssText = css
}

function deepClone(src: Element): HTMLElement {
  const clone = src.cloneNode(false) as HTMLElement
  if (src instanceof HTMLElement) copyComputedStyle(src, clone)
  for (const child of Array.from(src.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      clone.appendChild(deepClone(child as Element))
    } else {
      clone.appendChild(child.cloneNode(true))
    }
  }
  return clone
}

// Swap every <img> in the clone for an inlined data URL. Cross-origin images
// that fail CORS are dropped rather than failing the whole export.
async function inlineImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'))
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute('src')
      if (!src || src.startsWith('data:')) return
      try {
        const abs = new URL(src, location.href).href
        const blob = await (await fetch(abs, { mode: 'cors' })).blob()
        img.setAttribute('src', await blobToDataURL(blob))
      } catch {
        img.removeAttribute('src')
      }
    }),
  )
}

const SCALE = 2 // retina-quality export

async function nodeToCanvas(node: HTMLElement, background?: string): Promise<HTMLCanvasElement> {
  const rect = node.getBoundingClientRect()
  const width = Math.ceil(rect.width)
  const height = Math.ceil(rect.height)

  const clone = deepClone(node)
  clone.style.margin = '0'
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')
  await inlineImages(clone)

  const fontCss = await inlineFontFaces()
  const xml = new XMLSerializer().serializeToString(clone)
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
    '<defs><style>' + fontCss + '</style></defs>' +
    '<foreignObject x="0" y="0" width="' + width + '" height="' + height + '">' + xml + '</foreignObject>' +
    '</svg>'

  const image = new Image()
  image.width = width
  image.height = height
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = reject
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  })

  const canvas = document.createElement('canvas')
  canvas.width = width * SCALE
  canvas.height = height * SCALE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.scale(SCALE, SCALE)
  ctx.drawImage(image, 0, 0)
  return canvas
}

function triggerDownload(dataUrl: string, filename: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

// Make sure web fonts are loaded before we snapshot, so the embedded faces are
// available to the rasteriser.
async function ensureFonts(): Promise<void> {
  try {
    await document.fonts.ready
  } catch {
    /* not supported — continue */
  }
}

export async function exportPng(node: HTMLElement, filename: string): Promise<void> {
  await ensureFonts()
  const canvas = await nodeToCanvas(node)
  triggerDownload(canvas.toDataURL('image/png'), filename)
}

export async function exportJpeg(node: HTMLElement, filename: string, background = '#ffffff'): Promise<void> {
  await ensureFonts()
  const canvas = await nodeToCanvas(node, background)
  triggerDownload(canvas.toDataURL('image/jpeg', 0.95), filename)
}

interface JsPdfInstance {
  addImage: (data: string, format: string, x: number, y: number, w: number, h: number) => void
  save: (filename: string) => void
}

// jsPDF is loaded on demand from cdnjs at click time — no build-time dependency
// and no npm install required.
const JSPDF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'

function loadJsPdf(): Promise<new (opts: unknown) => JsPdfInstance> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as { jspdf?: { jsPDF: new (o: unknown) => JsPdfInstance } }
    if (w.jspdf?.jsPDF) {
      resolve(w.jspdf.jsPDF)
      return
    }
    const script = document.createElement('script')
    script.src = JSPDF_CDN
    script.onload = () => {
      if (w.jspdf?.jsPDF) resolve(w.jspdf.jsPDF)
      else reject(new Error('jsPDF failed to initialise'))
    }
    script.onerror = () => reject(new Error('Could not load PDF library'))
    document.head.appendChild(script)
  })
}

export async function exportPdf(node: HTMLElement, filename: string): Promise<void> {
  await ensureFonts()
  const canvas = await nodeToCanvas(node, '#ffffff')
  const JsPDF = await loadJsPdf()
  const w = canvas.width / SCALE
  const h = canvas.height / SCALE
  const pdf = new JsPDF({
    orientation: w > h ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [w, h],
  })
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, w, h)
  pdf.save(filename)
}
