import { formatDate } from '../i18n/index.jsx'

// Helpers that turn every signature style (drawn, typed, uploaded) into a trimmed PNG.

export const SIGN_FONTS = [
  { family: 'Great Vibes', label: 'Classic' },
  { family: 'Dancing Script', label: 'Flow' },
  { family: 'Sacramento', label: 'Thin' },
  { family: 'Allura', label: 'Elegant' },
  { family: 'Caveat', label: 'Hand' },
]
export const INK_COLORS = ['#0f1535', '#1b2a8f', '#2563eb', '#0f766e']
export const TEXT_COLORS = ['#0f1535', '#1b2a8f', '#2563eb', '#0f766e', '#b91c1c', '#7c3aed']

/** Crop transparent margins; returns a new canvas (or null when empty). */
export function trimCanvas(src, pad = 8) {
  const ctx = src.getContext('2d', { willReadFrequently: true })
  const { width, height } = src
  const data = ctx.getImageData(0, 0, width, height).data
  let top = height, left = width, right = -1, bottom = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < left) left = x
        if (x > right) right = x
        if (y < top) top = y
        if (y > bottom) bottom = y
      }
    }
  }
  if (right < 0) return null
  left = Math.max(0, left - pad); top = Math.max(0, top - pad)
  right = Math.min(width - 1, right + pad); bottom = Math.min(height - 1, bottom + pad)
  const out = document.createElement('canvas')
  out.width = right - left + 1
  out.height = bottom - top + 1
  out.getContext('2d').drawImage(src, left, top, out.width, out.height, 0, 0, out.width, out.height)
  return out
}

const result = (canvas, type) => ({ type, image: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height })

export async function typedSignature(text, family, color) {
  await document.fonts.load(`96px "${family}"`)
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')
  ctx.font = `96px "${family}"`
  const w = Math.ceil(ctx.measureText(text).width) + 80
  c.width = Math.min(Math.max(w, 200), 2400)
  c.height = 200
  ctx.font = `96px "${family}"`
  ctx.fillStyle = color
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 40, 104)
  const t = trimCanvas(c)
  return t ? result(t, 'type') : null
}

export function drawnSignature(canvas) {
  const t = trimCanvas(canvas)
  return t ? result(t, 'draw') : null
}

/** Load an uploaded image (logo/seal/signature photo) → PNG, optionally knocking out a white background. */
export async function uploadedSignature(file, { removeWhite = false, threshold = 235 } = {}) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('Could not read this image'))
      i.src = url
    })
    const max = 1200
    const scale = Math.min(1, max / Math.max(img.naturalWidth || 600, img.naturalHeight || 600))
    const c = document.createElement('canvas')
    c.width = Math.round((img.naturalWidth || 600) * scale)
    c.height = Math.round((img.naturalHeight || 600) * scale)
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, c.width, c.height)
    if (removeWhite) {
      const d = ctx.getImageData(0, 0, c.width, c.height)
      for (let i = 0; i < d.data.length; i += 4) {
        const [r, g, b] = [d.data[i], d.data[i + 1], d.data[i + 2]]
        const minC = Math.min(r, g, b)
        if (minC >= threshold) d.data[i + 3] = 0
        else if (minC > threshold - 40) d.data[i + 3] = Math.round(d.data[i + 3] * ((threshold - minC) / 40))
      }
      ctx.putImageData(d, 0, 0)
    }
    const t = trimCanvas(c, 2) || c
    return result(t, 'upload')
  } finally {
    URL.revokeObjectURL(url)
  }
}

// The server stamps text with standard Helvetica (WinAnsi). Anything outside that set
// (e.g. Azerbaijani "ə", Cyrillic) is rendered to a PNG in the browser instead.
const WIN_ANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'
export const needsImageText = (s) => [...s].some((ch) => ch.charCodeAt(0) > 255 && !WIN_ANSI_EXTRA.includes(ch))

export function textToPng(text, color = '#0d1233') {
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')
  const font = '600 64px Helvetica, Arial, sans-serif'
  ctx.font = font
  c.width = Math.ceil(ctx.measureText(text).width) + 16
  c.height = 84
  ctx.font = font
  ctx.fillStyle = color
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 8, 44)
  return (trimCanvas(c, 4) || c).toDataURL('image/png')
}

export const todayString = () => formatDate(new Date(), 'day')

export const uid = () => Math.random().toString(36).slice(2, 10)
