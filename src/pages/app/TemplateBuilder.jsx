import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, apiBuffer } from '../../api/client.js'
import { useToast } from '../../context/ToastContext.jsx'
import { useT } from '../../i18n/index.jsx'
import { Loading, PageHead } from '../../components/Layout.jsx'
import PdfViewer from '../../components/PdfViewer.jsx'
import Placeable from '../../components/Placeable.jsx'
import Dropzone from '../../components/Dropzone.jsx'
import Icon from '../../components/Icon.jsx'
import { uid } from '../../lib/signature.js'

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

export default function TemplateBuilder() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const t = useT()
  const toast = useToast()
  const [docId, setDocId] = useState(sp.get('doc'))
  const [docs, setDocs] = useState(null)
  const [buffer, setBuffer] = useState(null)
  const [form, setForm] = useState({ name: '', message: '', allowedSignTypes: ['draw', 'type', 'upload'] })
  const [fields, setFields] = useState([])
  const [tool, setTool] = useState(null)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!!id)

  // Edit mode: load existing template
  useEffect(() => {
    if (!id) return
    api(`/api/templates/${id}`).then(({ template: tpl }) => {
      setForm({ name: tpl.name, message: tpl.message || '', allowedSignTypes: tpl.allowedSignTypes })
      setFields(tpl.fields)
      setDocId(tpl.documentId)
    }).catch(toast.error).finally(() => setLoading(false))
  }, [id, toast])

  useEffect(() => {
    if (!docId) { api('/api/documents').then((d) => setDocs(d.documents)).catch(toast.error); return }
    apiBuffer(`/api/documents/${docId}/file`).then(setBuffer).catch(toast.error)
    if (!id) api(`/api/documents/${docId}`).then(({ document }) => setForm((f) => ({ ...f, name: f.name || document.title }))).catch(() => {})
  }, [docId, id, toast])

  const upload = async (file) => {
    const fd = new FormData()
    fd.append('file', file)
    try { setDocId((await api('/api/documents', { method: 'POST', form: fd })).document.id) } catch (e) { toast.error(e) }
  }

  const placeAt = (page, nx, ny, size) => {
    if (!tool) return setSelected(null)
    const k = KINDS.find((x) => x.id === tool)
    const w = k.w
    const h = k.hPx / size.h
    const f = { id: uid(), kind: k.id, label: '', required: true, page, w, h, x: Math.min(Math.max(nx - w / 2, 0), 1 - w), y: Math.min(Math.max(ny - h / 2, 0), 1 - h) }
    setFields((l) => [...l, f])
    setSelected(f.id)
  }
  const update = (fid, patch) => setFields((l) => l.map((f) => (f.id === fid ? { ...f, ...patch } : f)))
  const remove = (fid) => setFields((l) => l.filter((f) => f.id !== fid))
  const sel = fields.find((f) => f.id === selected)
  const kindLabel = (kind) => t(KINDS.find((k) => k.id === kind).label)

  const toggleType = (type) => setForm((f) => {
    const has = f.allowedSignTypes.includes(type)
    const next = has ? f.allowedSignTypes.filter((x) => x !== type) : [...f.allowedSignTypes, type]
    return next.length ? { ...f, allowedSignTypes: next } : f
  })

  const save = async () => {
    if (!form.name.trim()) return toast.error('Give the template a name')
    if (!fields.length) return toast.error('Place at least one field on the document')
    setSaving(true)
    const body = { ...form, message: form.message || null, fields: fields.map(({ id: fid, kind, label, required, page, x, y, w, h }) => ({ id: fid, kind, label: label || undefined, required, page, x, y, w, h })) }
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

  const renderOverlay = (page, size) =>
    fields.filter((f) => f.page === page).map((f) => (
      <Placeable key={f.id} item={f} page={size} selected={selected === f.id} onSelect={() => { setSelected(f.id); setTool(null) }} onChange={(p) => update(f.id, p)} onRemove={() => remove(f.id)} className={`field-box kind-${f.kind}`} label={kindLabel(f.kind)}>
        <span style={{ pointerEvents: 'none' }}>{f.label || kindLabel(f.kind)}{f.required ? ' *' : ''}</span>
      </Placeable>
    ))

  return (
    <>
      <PageHead title={id ? t('Edit template') : t('New template')} subtitle={t('Place the fields your clients must fill, choose allowed signature types, then share the link.')}>
        <Link to={id ? `/app/templates/${id}` : '/app/templates'} className="btn btn-ghost">{t('Cancel')}</Link>
        <button className="btn btn-primary" onClick={save} disabled={saving}><Icon name="check" /> {saving ? t('Saving…') : t('Save template')}</button>
      </PageHead>
      <div className="editor">
        <aside className="editor-panel stack">
          <div className="card card-tight">
            <div className="field"><label htmlFor="tn">{t('Template name')}</label><input id="tn" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="field" style={{ marginBottom: 0 }}><label htmlFor="tm">{t('Message to signers')}</label><textarea id="tm" className="textarea" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder={t('Optional instructions…')} /></div>
          </div>
          <div className="card card-tight stack" style={{ gap: 10 }}>
            <b>{t('Allowed signature types')}</b>
            {SIGN_TYPES.map((x) => (
              <label key={x.id} className="row-between" style={{ cursor: 'pointer' }}>
                <span><b className="small">{t(x.label)}</b><div className="small muted">{t(x.hint)}</div></span>
                <span className="switch"><input type="checkbox" checked={form.allowedSignTypes.includes(x.id)} onChange={() => toggleType(x.id)} /><span /></span>
              </label>
            ))}
          </div>
          <div className="card card-tight stack" style={{ gap: 8 }}>
            <b>{t('Add fields')}</b>
            {KINDS.map((k) => (
              <button key={k.id} className={`tool-btn${tool === k.id ? ' active' : ''}`} onClick={() => setTool(tool === k.id ? null : k.id)}>
                <span className="ti"><Icon name={k.icon} size={16} /></span>{t(k.label)}
              </button>
            ))}
            {tool && <div className="alert alert-info small">{t('Click on the document to place the field.')}</div>}
          </div>
          {sel && (
            <div className="card card-tight">
              <b className="small">{t('Selected field ({kind}, page {n})', { kind: kindLabel(sel.kind), n: sel.page + 1 })}</b>
              <div className="field mt-1"><input className="input" placeholder={t('Label (e.g. Client signature)')} value={sel.label || ''} onChange={(e) => update(sel.id, { label: e.target.value })} maxLength={80} /></div>
              <div className="row-between">
                <label className="checkbox"><input type="checkbox" checked={sel.required} onChange={(e) => update(sel.id, { required: e.target.checked })} /> {t('Required')}</label>
                <button className="btn btn-danger btn-sm" onClick={() => remove(sel.id)}><Icon name="trash" size={14} /> {t('Remove')}</button>
              </div>
            </div>
          )}
          <p className="small muted center" style={{ margin: 0 }}>{t('{n} field(s)', { n: fields.length })}</p>
        </aside>
        {buffer ? <PdfViewer buffer={buffer} renderOverlay={renderOverlay} onPageClick={placeAt} placing={!!tool} /> : <Loading />}
      </div>
    </>
  )
}
