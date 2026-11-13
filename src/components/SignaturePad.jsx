import { useEffect, useRef, useState } from 'react'
import Modal from './Modal.jsx'
import Icon from './Icon.jsx'
import { INK_COLORS, SIGN_FONTS, drawnSignature, typedSignature, uploadedSignature } from '../lib/signature.js'
import { useT } from '../i18n/index.jsx'

const TABS = [
  { id: 'draw', label: 'Draw', icon: 'pen' },
  { id: 'type', label: 'Type', icon: 'type' },
  { id: 'upload', label: 'Upload / Seal', icon: 'stamp' },
]

/**
 * Create a signature by drawing, typing or uploading an image (logo / seal / scan).
 * onDone({ type, image: dataURL PNG, width, height })
 */
export default function SignaturePad({ onClose, onDone, allowed = ['draw', 'type', 'upload'], title, defaultName = '', initial = 'draw' }) {
  const t = useT()
  const tabs = TABS.filter((x) => allowed.includes(x.id))
  const [tab, setTab] = useState(allowed.includes(initial) ? initial : tabs[0]?.id)
  const [color, setColor] = useState(INK_COLORS[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // draw
  const canvasRef = useRef(null)
  const drawing = useRef(null)
  const [hasInk, setHasInk] = useState(false)
  const [thickness, setThickness] = useState(3)

  // type
  const [name, setName] = useState(defaultName)
  const [font, setFont] = useState(SIGN_FONTS[0].family)

  // upload
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [removeWhite, setRemoveWhite] = useState(true)

  useEffect(() => {
    if (tab !== 'draw') return
    const c = canvasRef.current
    if (!c) return
    const r = c.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    c.width = r.width * dpr
    c.height = r.height * dpr
    const ctx = c.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    setHasInk(false)
  }, [tab])

  useEffect(() => {
    if (tab !== 'upload' || !file) return
    let alive = true
    uploadedSignature(file, { removeWhite }).then((r) => alive && setPreview(r)).catch((e) => setError(e.message))
    return () => { alive = false }
  }, [file, removeWhite, tab])

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top, p: e.pressure || 0.5 }
  }
  const down = (e) => {
    e.preventDefault()
    canvasRef.current.setPointerCapture(e.pointerId)
    drawing.current = { last: pos(e), mid: pos(e) }
  }
  const move = (e) => {
    if (!drawing.current) return
    const ctx = canvasRef.current.getContext('2d')
    const p = pos(e)
    const { last, mid } = drawing.current
    const newMid = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 }
    ctx.strokeStyle = color
    ctx.lineWidth = thickness * (e.pointerType === 'pen' ? 0.6 + p.p : 1)
    ctx.beginPath()
    ctx.moveTo(mid.x, mid.y)
    ctx.quadraticCurveTo(last.x, last.y, newMid.x, newMid.y)
    ctx.stroke()
    drawing.current = { last: p, mid: newMid }
    if (!hasInk) setHasInk(true)
  }
  const up = () => { drawing.current = null }
  const clear = () => {
    const c = canvasRef.current
    c.getContext('2d').clearRect(0, 0, c.width, c.height)
    setHasInk(false)
  }

  const save = async () => {
    setError('')
    setBusy(true)
    try {
      let r = null
      if (tab === 'draw') r = drawnSignature(canvasRef.current)
      if (tab === 'type') r = name.trim() ? await typedSignature(name.trim(), font, color) : null
      if (tab === 'upload') r = preview
      if (!r) throw new Error(tab === 'draw' ? t('Please draw your signature first') : tab === 'type' ? t('Please type your name') : t('Please choose an image'))
      onDone(r)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={title || t('Create your signature')} onClose={onClose} width={640}>
      {tabs.length > 1 && (
        <div className="tabs" style={{ marginBottom: 16 }}>
          {tabs.map((x) => (
            <button key={x.id} className={`tab${tab === x.id ? ' active' : ''}`} onClick={() => setTab(x.id)}>
              <span className="row" style={{ gap: 6 }}><Icon name={x.icon} size={15} />{t(x.label)}</span>
            </button>
          ))}
        </div>
      )}

      {tab !== 'upload' && (
        <div className="row-between" style={{ marginBottom: 12 }}>
          <div className="swatches" role="radiogroup" aria-label={t('Ink colour')}>
            {INK_COLORS.map((c) => (
              <button key={c} className={`swatch${c === color ? ' active' : ''}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={c} />
            ))}
          </div>
          {tab === 'draw' && (
            <label className="row small muted" style={{ gap: 8 }}>
              {t('Thickness')}
              <input type="range" min="1.5" max="6" step="0.5" value={thickness} onChange={(e) => setThickness(+e.target.value)} />
            </label>
          )}
        </div>
      )}

      {tab === 'draw' && (
        <div className="pad">
          <canvas ref={canvasRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
          <div className="pad-baseline" />
          <div className="pad-hint">{hasInk ? '' : t('Sign here with your mouse, finger or stylus')}</div>
          <button className="btn btn-ghost btn-sm" style={{ position: 'absolute', top: 10, right: 10 }} onClick={clear}>{t('Clear')}</button>
        </div>
      )}

      {tab === 'type' && (
        <div className="stack">
          <input className="input" placeholder={t('Type your full name')} value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={60} />
          <div className="stack" style={{ gap: 8 }}>
            {SIGN_FONTS.map((f) => (
              <button key={f.family} className={`font-opt${font === f.family ? ' active' : ''}`} style={{ fontFamily: `"${f.family}", cursive`, color }} onClick={() => setFont(f.family)}>
                {name || t('Your Signature')}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'upload' && (
        <div className="stack">
          <label className="dropzone" style={{ padding: 22 }}>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={(e) => { setFile(e.target.files?.[0] || null); setPreview(null) }} />
            <div className="dz-icon" style={{ width: 44, height: 44 }}><Icon name="upload" /></div>
            <b>{file ? file.name : t('Upload a signature scan, company logo or seal')}</b>
            <div className="small muted">{t('PNG, JPG, WEBP or SVG')}</div>
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={removeWhite} onChange={(e) => setRemoveWhite(e.target.checked)} />
            {t('Remove white background (recommended for scans & stamps)')}
          </label>
          {preview && <div className="upload-preview"><img src={preview.image} alt={t('Signature preview')} /></div>}
        </div>
      )}

      {error && <div className="alert alert-error mt-2">{error}</div>}
      <div className="row mt-3" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>{t('Cancel')}</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          <Icon name="check" /> {t('Use this signature')}
        </button>
      </div>
    </Modal>
  )
}
