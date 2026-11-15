import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, apiBuffer } from '../../api/client.js'
import { useToast } from '../../context/ToastContext.jsx'
import { useT } from '../../i18n/index.jsx'
import { Loading, PageHead } from '../../components/Layout.jsx'
import PdfViewer from '../../components/PdfViewer.jsx'
import Placeable from '../../components/Placeable.jsx'
import Dropzone from '../../components/Dropzone.jsx'
import SignaturePad from '../../components/SignaturePad.jsx'
import ColorPicker from '../../components/ColorPicker.jsx'
import Icon from '../../components/Icon.jsx'
import AiAnalysisButton from '../../components/AiAnalysis.jsx'
import { needsImageText, textToPng, todayString, uid } from '../../lib/signature.js'
import { useAuth } from '../../context/AuthContext.jsx'

// Fields the CLIENT fills in.
const KINDS = [
  { id: 'signature', label: 'Signature', icon: 'pen', w: 0.28, hPx: 54 },
  { id: 'initials', label: 'Initials', icon: 'type', w: 0.1, hPx: 40 },
  { id: 'text', label: 'Text (e.g. name)', icon: 'text', w: 0.3, hPx: 22 },
  { id: 'date', label: 'Date', icon: 'calendar', w: 0.18, hPx: 22 },
]
const SIGN_TYPES = [
  { id: 'draw', label: 'Draw', hint: 'Hand-drawn with mouse / finger' },
  { id: 'type', label: 'Type', hint: 'Typed name in a script font' },
  { id: 'upload', label: 'Upload', hint: 'Image, company logo or seal' },
]
// Tools for the SENDER's own items (pre-signed by the template owner).
const OWN_SIG = 'own-signature'
const OWN_TEXT = 'own-text'
const OWN_DATE = 'own-date'

const textFontSize = (item, size) => Math.max(8, Math.min(item.h * size.h * 0.7, 28 * (size.w / 595)))

export default function TemplateBuilder() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const t = useT()
  const toast = useToast()
  const [docId, setDocId] = useState(sp.get('doc'))
  const [docs, setDocs] = useState(null)
  const [buffer, setBuffer] = useState(null)
  const [form, setForm] = useState({ name: '', message: '', allowedSignTypes: ['draw', 'type', 'upload'] })
  const [fields, setFields] = useState([])
  const [ownerItems, setOwnerItems] = useState([])
  const [tool, setTool] = useState(null)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!!id)
  // sender-signing helpers
  const [pad, setPad] = useState(null) // initial SignaturePad tab when open
  const [ownSig, setOwnSig] = useState(null) // last created sender signature {image,width,height,type}
  const [ownText, setOwnText] = useState(user?.fullName || '')
  const [textColor, setTextColor] = useState('#0f1535')

  // Edit mode: load existing template
  useEffect(() => {
    if (!id) return
    api(`/api/templates/${id}`).then(({ template: tpl }) => {
      setForm({ name: tpl.name, message: tpl.message || '', allowedSignTypes: tpl.allowedSignTypes })
      setFields(tpl.fields)
      setOwnerItems((tpl.ownerPlacements || []).map((p) => ({ ...p, id: uid(), kind: p.image ? 'image' : 'text' })))
      setDocId(tpl.documentId)
    }).catch(toast.error).finally(() => setLoading(false))
  }, [id, toast])

  useEffect(() => {
    if (!docId) { api('/api/documents').then((d) => setDocs(d.documents)).catch(toast.error); return }
    apiBuffer(`/api/documents/${docId}/file`).then(setBuffer).catch(toast.error)
    if (!id) api(`/api/documents/${docId}`).then(({ document }) => setForm((f) => ({ ...f, name: f.name || document.title }))).catch(() => {})
  }, [docId, id, toast])

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && setTool(null)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])

  const upload = async (file) => {
    const fd = new FormData()
    fd.append('file', file)
    try { setDocId((await api('/api/documents', { method: 'POST', form: fd })).document.id) } catch (e) { toast.error(e) }
  }

  const clampPos = (nx, ny, w, h) => ({ x: Math.min(Math.max(nx - w / 2, 0), 1 - w), y: Math.min(Math.max(ny - h / 2, 0), 1 - h) })

  const placeAt = (page, nx, ny, size) => {
    if (!tool) return setSelected(null)
    if (tool === OWN_SIG || tool === OWN_TEXT || tool === OWN_DATE) {
      let item
      if (tool === OWN_SIG) {
        if (!ownSig) return
        const w = ownSig.type === 'upload' ? 0.2 : 0.26
        item = { kind: 'image', image: ownSig.image, w, h: (w * size.w * (ownSig.height / ownSig.width)) / size.h }
      } else {
        const text = tool === OWN_DATE ? todayString() : ownText.trim()
        if (!text) return toast.error('Type the text first')
        item = { kind: 'text', text, color: textColor, h: 22 / size.h, w: Math.min(0.9, (Math.max(text.length, 4) * 10.5) / size.w) }
      }
      item = { ...item, id: uid(), page, ...clampPos(nx, ny, item.w, item.h) }
      setOwnerItems((l) => [...l, item])
      setSelected(item.id)
      return
    }
    const k = KINDS.find((x) => x.id === tool)
    const w = k.w
    const h = k.hPx / size.h
    const f = { id: uid(), kind: k.id, label: '', required: true, page, w, h, ...clampPos(nx, ny, w, h) }
    setFields((l) => [...l, f])
    setSelected(f.id)
  }

  const updateField = (fid, patch) => setFields((l) => l.map((f) => (f.id === fid ? { ...f, ...patch } : f)))
  const removeField = (fid) => setFields((l) => l.filter((f) => f.id !== fid))
  const updateOwn = (oid, patch) => setOwnerItems((l) => l.map((o) => (o.id === oid ? { ...o, ...patch } : o)))
  const removeOwn = (oid) => setOwnerItems((l) => l.filter((o) => o.id !== oid))
  const sel = fields.find((f) => f.id === selected)
  const selOwn = ownerItems.find((o) => o.id === selected)
  const kindLabel = (kind) => t(KINDS.find((k) => k.id === kind).label)

  const changeColor = (c) => {
    setTextColor(c)
    if (selOwn?.kind === 'text') updateOwn(selOwn.id, { color: c })
  }

  const toggleType = (type) => setForm((f) => {
    const has = f.allowedSignTypes.includes(type)
    const next = has ? f.allowedSignTypes.filter((x) => x !== type) : [...f.allowedSignTypes, type]
    return next.length ? { ...f, allowedSignTypes: next } : f
  })

  const save = async () => {
    if (!form.name.trim()) return toast.error('Give the template a name')
    if (!fields.length) return toast.error('Place at least one field on the document')
    setSaving(true)
    const body = {
      ...form,
      message: form.message || null,
      fields: fields.map(({ id: fid, kind, label, required, page, x, y, w, h }) => ({ id: fid, kind, label: label || undefined, required, page, x, y, w, h })),
      ownerPlacements: ownerItems.map(({ page, x, y, w, h, image, text, color }) => ({
        page, x, y, w, h,
        ...(image ? { image } : needsImageText(text) ? { image: textToPng(text, color) } : { text, ...(color ? { color } : {}) }),
      })),
    }
    try {
      const { template } = id
        ? await api(`/api/templates/${id}`, { method: 'PATCH', body })
        : await api('/api/templates', { method: 'POST', body: { ...body, documentId: docId } })
      toast.success('Template saved')
      navigate(`/app/templates/${template.id}`)
    } catch (e) {
      toast.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  if (!docId) {
    return (
      <>
        <PageHead title={t('New template')} subtitle={t('Choose the PDF your clients will sign.')} />
        <Dropzone onFile={upload} />
        <div className="card mt-3">
          <h3>{t('…or pick an existing document')}</h3>
          {!docs ? <Loading /> : docs.length === 0 ? <p className="muted">{t('No documents yet.')}</p> : (
            <div className="grid grid-3 mt-2">
              {docs.map((d) => (
                <button key={d.id} className="tool-btn" onClick={() => setDocId(d.id)}>
                  <span className="ti"><Icon name="file" size={16} /></span>
                  <span className="grow">{d.title}<div className="small muted">{t('{n} page(s)', { n: d.pageCount })}</div></span>
                </button>
              ))}
            </div>
          )}
        </div>
      </>
    )
  }

  const renderOverlay = (page, size) => [
    // Sender's own (pre-signed) items
    ...ownerItems.filter((o) => o.page === page).map((o) => (
      <Placeable key={o.id} item={o} page={size} selected={selected === o.id} onSelect={() => { setSelected(o.id); setTool(null) }} onChange={(p) => updateOwn(o.id, p)} onRemove={() => removeOwn(o.id)} keepRatio={o.kind === 'image'} className="owner-item" label={t('Your signature (sender)')}>
        {o.kind === 'image' ? <img src={o.image} alt="" /> : <div className="placed-text" style={{ color: o.color, fontSize: textFontSize(o, size) }}>{o.text}</div>}
      </Placeable>
    )),
    // Fields for the client
    ...fields.filter((f) => f.page === page).map((f) => (
      <Placeable key={f.id} item={f} page={size} selected={selected === f.id} onSelect={() => { setSelected(f.id); setTool(null) }} onChange={(p) => updateField(f.id, p)} onRemove={() => removeField(f.id)} className={`field-box kind-${f.kind}`} label={kindLabel(f.kind)}>
        <span style={{ pointerEvents: 'none' }}>{f.label || kindLabel(f.kind)}{f.required ? ' *' : ''}</span>
      </Placeable>
    )),
  ]

  const ownTool = tool === OWN_SIG || tool === OWN_TEXT || tool === OWN_DATE

  return (
    <>
      <PageHead title={id ? t('Edit template') : t('New template')} subtitle={t('Place the fields your clients must fill, choose allowed signature types, then share the link.')}>
        <Link to={id ? `/app/templates/${id}` : '/app/templates'} className="btn btn-ghost">{t('Cancel')}</Link>
        <AiAnalysisButton startPath={`/api/documents/${docId}/analysis`} />
        <button className="btn btn-primary" onClick={save} disabled={saving}><Icon name="check" /> {saving ? t('Saving…') : t('Save template')}</button>
      </PageHead>
      <div className="editor">
        <aside className="editor-panel stack">
          <div className="card card-tight">
            <div className="field"><label htmlFor="tn">{t('Template name')}</label><input id="tn" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="field" style={{ marginBottom: 0 }}><label htmlFor="tm">{t('Message to signers')}</label><textarea id="tm" className="textarea" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder={t('Optional instructions…')} /></div>
          </div>

          <div className="card card-tight stack" style={{ gap: 8 }}>
            <b>{t('Fields for your client')}</b>
            {KINDS.map((k) => (
              <button key={k.id} className={`tool-btn${tool === k.id ? ' active' : ''}`} onClick={() => setTool(tool === k.id ? null : k.id)}>
                <span className="ti"><Icon name={k.icon} size={16} /></span>{t(k.label)}
              </button>
            ))}
          </div>

          <div className="card card-tight stack" style={{ gap: 8 }}>
            <div>
              <b>{t('Sign as sender')}</b> <span className="badge badge-muted">{t('optional')}</span>
              <p className="small muted" style={{ margin: '4px 0 0' }}>{t('Add your own signature, text or date. It appears on every copy your clients sign.')}</p>
            </div>
            {ownSig && (
              <div className={`sig-tile${tool === OWN_SIG ? ' active' : ''}`} onClick={() => setTool(OWN_SIG)} title={t('Click, then click on the page to place')}>
                <img src={ownSig.image} alt={t('Saved signature')} />
              </div>
            )}
            <button className="tool-btn" onClick={() => setPad('draw')}><span className="ti"><Icon name="pen" size={16} /></span>{t('Draw signature')}</button>
            <button className="tool-btn" onClick={() => setPad('type')}><span className="ti"><Icon name="type" size={16} /></span>{t('Type signature')}</button>
            <button className="tool-btn" onClick={() => setPad('upload')}><span className="ti"><Icon name="stamp" size={16} /></span>{t('Logo / seal / scan')}</button>
            <button className={`tool-btn${tool === OWN_TEXT ? ' active' : ''}`} onClick={() => setTool(tool === OWN_TEXT ? null : OWN_TEXT)}><span className="ti"><Icon name="text" size={16} /></span>{t('Text')}</button>
            {tool === OWN_TEXT && <input className="input" value={ownText} onChange={(e) => setOwnText(e.target.value)} placeholder={t('Text to place (e.g. your name)')} autoFocus />}
            <button className={`tool-btn${tool === OWN_DATE ? ' active' : ''}`} onClick={() => setTool(tool === OWN_DATE ? null : OWN_DATE)}><span className="ti"><Icon name="calendar" size={16} /></span>{t('Date')} ({todayString()})</button>
            {(tool === OWN_TEXT || tool === OWN_DATE || selOwn?.kind === 'text') && (
              <div className="stack" style={{ gap: 6 }}>
                <span className="small muted">{selOwn?.kind === 'text' ? t('Selected text colour') : t('Text & date colour')}</span>
                <ColorPicker value={selOwn?.kind === 'text' ? selOwn.color || textColor : textColor} onChange={changeColor} />
              </div>
            )}
          </div>

          {tool && (
            <div className="alert alert-info small">
              <b>{t('Placing mode:')}</b> {ownTool ? t('click anywhere on a page to drop the item.') : t('Click on the document to place the field.')} {t('Press Esc to stop.')}
            </div>
          )}

          {sel && (
            <div className="card card-tight">
              <b className="small">{t('Selected field ({kind}, page {n})', { kind: kindLabel(sel.kind), n: sel.page + 1 })}</b>
              <div className="field mt-1"><input className="input" placeholder={t('Label (e.g. Client signature)')} value={sel.label || ''} onChange={(e) => updateField(sel.id, { label: e.target.value })} maxLength={80} /></div>
              <div className="row-between">
                <label className="checkbox"><input type="checkbox" checked={sel.required} onChange={(e) => updateField(sel.id, { required: e.target.checked })} /> {t('Required')}</label>
                <button className="btn btn-danger btn-sm" onClick={() => removeField(sel.id)}><Icon name="trash" size={14} /> {t('Remove')}</button>
              </div>
            </div>
          )}

          <div className="card card-tight stack" style={{ gap: 10 }}>
            <b>{t('Allowed signature types')}</b>
            {SIGN_TYPES.map((x) => (
              <label key={x.id} className="row-between" style={{ cursor: 'pointer' }}>
                <span><b className="small">{t(x.label)}</b><div className="small muted">{t(x.hint)}</div></span>
                <span className="switch"><input type="checkbox" checked={form.allowedSignTypes.includes(x.id)} onChange={() => toggleType(x.id)} /><span /></span>
              </label>
            ))}
          </div>
          <p className="small muted center" style={{ margin: 0 }}>{t('{n} field(s)', { n: fields.length })} · {t('{n} sender item(s)', { n: ownerItems.length })}</p>
        </aside>
        {buffer ? <PdfViewer buffer={buffer} renderOverlay={renderOverlay} onPageClick={placeAt} placing={!!tool} /> : <Loading />}
      </div>

      {pad && (
        <SignaturePad
          initial={pad}
          title={t('Your signature (sender)')}
          defaultName={user?.fullName || ''}
          onClose={() => setPad(null)}
          onDone={(sig) => { setOwnSig(sig); setTool(OWN_SIG); setPad(null) }}
        />
      )}
    </>
  )
}
