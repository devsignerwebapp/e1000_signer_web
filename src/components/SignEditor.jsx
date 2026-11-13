import { useCallback, useEffect, useState } from 'react'
import PdfViewer from './PdfViewer.jsx'
import Placeable from './Placeable.jsx'
import SignaturePad from './SignaturePad.jsx'
import Icon from './Icon.jsx'
import ColorPicker from './ColorPicker.jsx'
import { useT } from '../i18n/index.jsx'
import { needsImageText, textToPng, todayString, uid } from '../lib/signature.js'

const SAVED_KEY = 'e1k_saved_signatures'
const loadSaved = () => {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]') } catch { return [] }
}
const storeSaved = (list) => {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(list.slice(0, 6))) } catch { /* quota / private mode */ }
}

/**
 * Free-form signing editor: create signatures (draw / type / upload logo or seal),
 * drop them anywhere on any page, add text & date stamps, drag & resize.
 * onSubmit(placements) where placements = [{ page, x, y, w, h, image? , text? }].
 */
export default function SignEditor({ buffer, onSubmit, submitting, submitLabel, defaultName = '', extraPanel }) {
  const t = useT()
  const [signatures, setSignatures] = useState(loadSaved)
  const [activeSig, setActiveSig] = useState(null)
  const [tool, setTool] = useState(null) // 'signature' | 'text' | 'date'
  const [textValue, setTextValue] = useState(defaultName)
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(null)
  const [pad, setPad] = useState(null) // initial tab for SignaturePad
  const [textColor, setTextColor] = useState('#0f1535')

  useEffect(() => storeSaved(signatures), [signatures])
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && setTool(null)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])

  const addSignature = (sig) => {
    const s = { ...sig, id: uid() }
    setSignatures((l) => [s, ...l])
    setActiveSig(s)
    setTool('signature')
    setPad(null)
  }

  const placeAt = useCallback((page, nx, ny, size) => {
    if (!tool) return setSelected(null)
    let item
    if (tool === 'signature') {
      if (!activeSig) return
      const w = activeSig.type === 'upload' ? 0.2 : 0.28
      const h = (w * size.w * (activeSig.height / activeSig.width)) / size.h
      item = { kind: 'image', image: activeSig.image, w, h }
    } else {
      const text = tool === 'date' ? todayString() : textValue.trim()
      if (!text) return
      const h = 22 / size.h
      const w = Math.min(0.9, (Math.max(text.length, 4) * 10.5) / size.w)
      item = { kind: 'text', text, w, h, color: textColor }
    }
    item = { ...item, id: uid(), page, x: Math.min(Math.max(nx - item.w / 2, 0), 1 - item.w), y: Math.min(Math.max(ny - item.h / 2, 0), 1 - item.h) }
    setItems((l) => [...l, item])
    setSelected(item.id)
  }, [tool, activeSig, textValue, textColor])

  const selectedItem = items.find((i) => i.id === selected)
  const changeColor = (c) => {
    setTextColor(c)
    if (selectedItem?.kind === 'text') update(selectedItem.id, { color: c })
  }

  const update = (id, patch) => setItems((l) => l.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  const remove = (id) => setItems((l) => l.filter((i) => i.id !== id))

  const renderOverlay = (page, size) =>
    items.filter((i) => i.page === page).map((i) => (
      <Placeable key={i.id} item={i} page={size} selected={selected === i.id} onSelect={() => setSelected(i.id)} onChange={(p) => update(i.id, p)} onRemove={() => remove(i.id)} keepRatio={i.kind === 'image'}>
        {i.kind === 'image' ? <img src={i.image} alt="" /> : <div className="placed-text" style={{ color: i.color, fontSize: Math.max(8, Math.min(i.h * size.h * 0.7, 28 * (size.w / 595))) }}>{i.text}</div>}
      </Placeable>
    ))

  const submit = () =>
    onSubmit(items.map(({ page, x, y, w, h, image, text, color }) => ({
      page, x, y, w, h,
      ...(image ? { image } : needsImageText(text) ? { image: textToPng(text, color) } : { text, color }),
    })))

  return (
    <div className="editor">
      <aside className="editor-panel stack">
        <div className="card card-tight stack">
          <div className="row-between">
            <b>{t('Your signatures')}</b>
            <button className="btn btn-ghost btn-sm" onClick={() => setPad('draw')}><Icon name="plus" size={14} /> {t('New')}</button>
          </div>
          {signatures.length === 0 && <p className="small muted" style={{ margin: 0 }}>{t('Create a signature by drawing, typing, or uploading your logo / seal.')}</p>}
          <div className="grid grid-2" style={{ gap: 8 }}>
            {signatures.map((s) => (
              <div key={s.id} className={`sig-tile${activeSig?.id === s.id && tool === 'signature' ? ' active' : ''}`} onClick={() => { setActiveSig(s); setTool('signature') }} title={t('Click, then click on the page to place')}>
                <img src={s.image} alt={t('Saved signature')} />
                <button className="remove" style={{ display: 'grid', placeItems: 'center', position: 'absolute', top: -8, right: -8, width: 20, height: 20, borderRadius: '50%', border: 0, background: '#fff', boxShadow: 'var(--shadow-sm)', cursor: 'pointer', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); setSignatures((l) => l.filter((x) => x.id !== s.id)) }} aria-label={t('Delete saved signature')}>×</button>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-tight stack" style={{ gap: 8 }}>
          <b>{t('Add to document')}</b>
          <button className="tool-btn" onClick={() => setPad('draw')}><span className="ti"><Icon name="pen" size={16} /></span>{t('Draw signature')}</button>
          <button className="tool-btn" onClick={() => setPad('type')}><span className="ti"><Icon name="type" size={16} /></span>{t('Type signature')}</button>
          <button className="tool-btn" onClick={() => setPad('upload')}><span className="ti"><Icon name="stamp" size={16} /></span>{t('Logo / seal / scan')}</button>
          <button className={`tool-btn${tool === 'text' ? ' active' : ''}`} onClick={() => setTool(tool === 'text' ? null : 'text')}><span className="ti"><Icon name="text" size={16} /></span>{t('Text')}</button>
          {tool === 'text' && <input className="input" value={textValue} onChange={(e) => setTextValue(e.target.value)} placeholder={t('Text to place (e.g. your name)')} autoFocus />}
          <button className={`tool-btn${tool === 'date' ? ' active' : ''}`} onClick={() => setTool(tool === 'date' ? null : 'date')}><span className="ti"><Icon name="calendar" size={16} /></span>{t('Date')} ({todayString()})</button>
        </div>

        {(tool === 'text' || tool === 'date' || selectedItem?.kind === 'text') && (
          <div className="card card-tight stack" style={{ gap: 8 }}>
            <b className="small">{selectedItem?.kind === 'text' ? t('Selected text colour') : t('Text & date colour')}</b>
            <ColorPicker value={selectedItem?.kind === 'text' ? selectedItem.color || textColor : textColor} onChange={changeColor} />
          </div>
        )}

        {tool && (
          <div className="alert alert-info small">
            <b>{t('Placing mode:')}</b> {t('click anywhere on a page to drop the item.')} {t('Press Esc to stop.')}
          </div>
        )}

        {extraPanel}

        <button className="btn btn-primary btn-lg btn-block" disabled={!items.length || submitting} onClick={submit}>
          {submitting ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : <Icon name="download" />} {submitLabel || t('Sign & download')}
        </button>
        <p className="small muted center" style={{ margin: 0 }}>{t('{n} item(s) placed · drag to move · corner to resize', { n: items.length })}</p>
      </aside>

      <PdfViewer buffer={buffer} renderOverlay={renderOverlay} onPageClick={placeAt} placing={!!tool} />

      {pad && <SignaturePad initial={pad} defaultName={defaultName} onClose={() => setPad(null)} onDone={addSignature} />}
    </div>
  )
}
