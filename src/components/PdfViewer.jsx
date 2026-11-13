import { useEffect, useRef, useState } from 'react'
import { loadPdf, pdfjs } from '../lib/pdf.js'
import { TEXT_OPS, renderHtmlText } from '../lib/htmlText.js'
import { useT } from '../i18n/index.jsx'

const MODE_KEY = 'e1k_viewer_mode'
const readMode = () => {
  try { return localStorage.getItem(MODE_KEY) === 'exact' ? 'exact' : 'html' } catch { return 'html' }
}

/**
 * Renders every page of a PDF as HTML and hosts an overlay slot (renderOverlay) where
 * signatures/fields live. Overlay coordinates are normalized (0..1) to the visible page —
 * exactly what the backend expects when it stamps the original PDF.
 *
 * Modes:
 *  - "html"  (default): canvas draws only graphics/images; all text is real, visible HTML
 *            (<span>s with matching font, weight, colour) — selectable, searchable, copyable.
 *  - "exact": canvas draws everything (pixel-perfect), plus an invisible selectable text layer.
 */
export default function PdfViewer({ buffer, renderOverlay, onPageClick, placing = false, maxWidth = 860, onLoaded }) {
  const wrapRef = useRef(null)
  const [doc, setDoc] = useState(null)
  const [error, setError] = useState(null)
  const [width, setWidth] = useState(0)
  const [mode, setMode] = useState(readMode)
  const t = useT()

  useEffect(() => {
    if (!buffer) return
    let cancelled = false
    setDoc(null)
    setError(null)
    const task = loadPdf(buffer)
    task.promise
      .then((d) => {
        if (cancelled) return
        setDoc(d)
        onLoaded?.(d)
      })
      .catch((e) => !cancelled && setError(e.message || 'Could not open PDF'))
    return () => {
      cancelled = true
      task.destroy().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buffer])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const switchMode = (m) => {
    setMode(m)
    try { localStorage.setItem(MODE_KEY, m) } catch { /* ignore */ }
  }

  const pageWidth = Math.max(260, Math.min(maxWidth, width - 24))

  return (
    <div ref={wrapRef} className="viewer">
      <div className="viewer-toolbar">
        <span className="small muted">{doc ? t('{n} page(s)', { n: doc.numPages }) : ''}</span>
        <div className="tabs" role="radiogroup" aria-label={t('Rendering mode')}>
          <button className={`tab${mode === 'html' ? ' active' : ''}`} onClick={() => switchMode('html')} title={t('Text is real HTML: selectable, searchable, sharp at any zoom')}>{t('HTML text')}</button>
          <button className={`tab${mode === 'exact' ? ' active' : ''}`} onClick={() => switchMode('exact')} title={t('Pixel-exact rendering of the original PDF')}>{t('Exact')}</button>
        </div>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {!doc && !error && <div className="loading-screen"><div className="spinner spinner-lg" /></div>}
      {doc && width > 0 &&
        Array.from({ length: doc.numPages }, (_, i) => (
          <PdfPage key={i} doc={doc} index={i} targetWidth={pageWidth} mode={mode} renderOverlay={renderOverlay} onPageClick={onPageClick} placing={placing} />
        ))}
    </div>
  )
}

function PdfPage({ doc, index, targetWidth, mode, renderOverlay, onPageClick, placing }) {
  const t = useT()
  const canvasRef = useRef(null)
  const textRef = useRef(null)
  const overlayRef = useRef(null)
  const [size, setSize] = useState(null)

  useEffect(() => {
    let task
    let textLayer
    const signal = { cancelled: false }
    ;(async () => {
      const page = await doc.getPage(index + 1)
      if (signal.cancelled) return
      const base = page.getViewport({ scale: 1 })
      const scale = targetWidth / base.width
      const viewport = page.getViewport({ scale })
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
      const canvas = canvasRef.current
      canvas.width = Math.floor(viewport.width * dpr)
      canvas.height = Math.floor(viewport.height * dpr)
      canvas.style.width = `${Math.floor(viewport.width)}px`
      canvas.style.height = `${Math.floor(viewport.height)}px`
      setSize({ w: Math.floor(viewport.width), h: Math.floor(viewport.height), scale })
      textRef.current?.replaceChildren()

      const html = mode === 'html'
      const opList = html ? await page.getOperatorList() : null
      if (signal.cancelled) return
      task = page.render({
        canvas,
        viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        ...(html ? { operationsFilter: (i, list) => !TEXT_OPS.has(list.fnArray[i]) } : {}),
      })
      try {
        await task.promise
      } catch {
        return
      }
      if (signal.cancelled || !textRef.current) return
      if (html) {
        await renderHtmlText({ page, viewport, container: textRef.current, opList, signal }).catch(() => {})
      } else {
        textLayer = new pdfjs.TextLayer({ textContentSource: page.streamTextContent(), container: textRef.current, viewport })
        textLayer.render().catch(() => {})
      }
    })()
    return () => {
      signal.cancelled = true
      task?.cancel()
      textLayer?.cancel()
    }
  }, [doc, index, targetWidth, mode])

  const click = (e) => {
    if (!onPageClick || !size || e.target !== overlayRef.current) return
    const r = overlayRef.current.getBoundingClientRect()
    onPageClick(index, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, size)
  }

  return (
    <div
      className="pdf-page"
      style={{ width: size?.w || targetWidth, height: size?.h || targetWidth * 1.3, '--total-scale-factor': size?.scale || 1, '--scale-round-x': '1px', '--scale-round-y': '1px' }}
      data-page={index}
    >
      <span className="pdf-page-label">{t('Page {n}', { n: index + 1 })}</span>
      <canvas ref={canvasRef} />
      <div ref={textRef} className={mode === 'html' ? 'htmlTextLayer' : 'textLayer'} />
      <div ref={overlayRef} className={`overlay${placing ? ' placing' : ''}`} onClick={click}>
        {size && renderOverlay?.(index, size)}
      </div>
    </div>
  )
}
