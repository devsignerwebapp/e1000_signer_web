// Builds a REAL, visible HTML text layer for a PDF page.
//
// Canvas renders only graphics/images (text operators are filtered out), and every text run
// becomes a positioned <span> with a matching system font, weight, style and colour.
// The result is selectable, searchable (Ctrl+F), copyable and stays crisp at any zoom.
import { pdfjs } from './pdf.js'

const { OPS, Util } = pdfjs

export const TEXT_OPS = new Set([OPS.showText, OPS.showSpacedText, OPS.nextLineShowText, OPS.nextLineSetSpacingShowText])

const FAMILIES = {
  serif: '"Times New Roman", Times, Georgia, serif',
  monospace: '"Courier New", Consolas, monospace',
  'sans-serif': 'Arial, Helvetica, "Segoe UI", sans-serif',
}

const norm = (s) => s.replace(/\s+/g, '')

function glyphText(arr) {
  if (!Array.isArray(arr)) return ''
  let s = ''
  for (const g of arr) if (g && typeof g === 'object' && typeof g.unicode === 'string') s += g.unicode
  return s
}

/** Walk the operator list once: for each text-showing op record its text, fill colour and visibility. */
export function textRuns(opList) {
  const runs = []
  let state = { color: '#000000', mode: 0 }
  const stack = []
  const { fnArray, argsArray } = opList
  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i]
    const a = argsArray[i]
    if (fn === OPS.save) stack.push({ ...state })
    else if (fn === OPS.restore) state = stack.pop() || state
    else if (fn === OPS.setFillRGBColor) state.color = typeof a?.[0] === 'string' ? a[0] : state.color
    else if (fn === OPS.setTextRenderingMode) state.mode = a?.[0] ?? 0
    else if (TEXT_OPS.has(fn)) {
      const glyphs = fn === OPS.nextLineSetSpacingShowText ? a?.[2] : a?.[0]
      const text = norm(glyphText(glyphs))
      // Render modes 3 and 7 are invisible (e.g. OCR text over a scanned image).
      if (text) runs.push({ text, color: state.color, invisible: state.mode === 3 || state.mode === 7 })
    }
  }
  return runs
}

function fontInfo(page, fontName, style) {
  let font = null
  try { if (page.commonObjs.has(fontName)) font = page.commonObjs.get(fontName) } catch { /* not resolved */ }
  const generic = font?.fallbackName || style?.fontFamily || 'sans-serif'
  return {
    family: FAMILIES[generic] || `${generic}, sans-serif`,
    weight: font?.black ? 900 : font?.bold ? 700 : 400,
    italic: !!font?.italic,
  }
}

let measureCtx
const measure = (font, text) => {
  measureCtx ||= document.createElement('canvas').getContext('2d')
  measureCtx.font = font
  return measureCtx.measureText(text).width
}

/** Render the visible HTML text for `page` into `container`. Returns the number of spans. */
export async function renderHtmlText({ page, viewport, container, opList, signal }) {
  const content = await page.getTextContent()
  if (signal?.cancelled) return 0
  const runs = textRuns(opList)
  let runIdx = 0
  let lastColor = '#000000'
  const frag = document.createDocumentFragment()
  let count = 0

  for (const item of content.items) {
    if (!('str' in item) || !item.str) continue
    const key = norm(item.str)
    if (!key) continue

    // Match the item to its text run (same order) to recover colour + visibility.
    let run = null
    const probe = key.slice(0, Math.min(4, key.length))
    for (let j = runIdx; j < Math.min(runs.length, runIdx + 80); j++) {
      if (runs[j].text.includes(probe) || key.startsWith(runs[j].text.slice(0, 4))) { run = runs[j]; runIdx = j; break }
    }
    if (run) lastColor = run.color

    const style = content.styles[item.fontName] || {}
    const tx = Util.transform(viewport.transform, item.transform)
    let angle = Math.atan2(tx[1], tx[0])
    if (style.vertical) angle += Math.PI / 2
    const fontHeight = Math.hypot(tx[2], tx[3])
    if (fontHeight < 1) continue
    const ascentRatio = style.ascent ? style.ascent : style.descent ? 1 + style.descent : 0.8
    const ascent = fontHeight * ascentRatio
    const left = angle === 0 ? tx[4] : tx[4] + ascent * Math.sin(angle)
    const top = angle === 0 ? tx[5] - ascent : tx[5] - ascent * Math.cos(angle)

    const f = fontInfo(page, item.fontName, style)
    const cssFont = `${f.italic ? 'italic ' : ''}${f.weight} ${fontHeight}px ${f.family}`
    const target = (style.vertical ? item.height : item.width) * viewport.scale
    const natural = measure(cssFont, item.str)
    const scaleX = natural > 0 && target > 0 ? target / natural : 1

    const span = document.createElement('span')
    span.textContent = item.str
    span.style.cssText = `left:${left}px;top:${top}px;font:${cssFont};color:${run?.invisible ? 'transparent' : lastColor};` +
      `transform:rotate(${angle}rad) scaleX(${scaleX})`
    if (item.hasEOL) span.dataset.eol = '1'
    frag.appendChild(span)
    count++
  }
  container.replaceChildren(frag)
  return count
}
