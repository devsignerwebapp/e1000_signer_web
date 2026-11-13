import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { api, apiBuffer } from '../api/client.js'
import PdfViewer from '../components/PdfViewer.jsx'
import SignaturePad from '../components/SignaturePad.jsx'
import Modal from '../components/Modal.jsx'
import Icon from '../components/Icon.jsx'
import ColorPicker from '../components/ColorPicker.jsx'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'
import { Brand } from '../components/Layout.jsx'
import { needsImageText, textToPng, todayString } from '../lib/signature.js'
import { useT } from '../i18n/index.jsx'

const KIND_LABEL = { signature: 'Sign here', initials: 'Initials', text: 'Text', date: 'Date' }
const TYPE_LABEL = { draw: 'drawn', type: 'typed', upload: 'uploaded/seal' }

export default function PublicSign() {
  const t = useT()
  const { token } = useParams()
  const [sp] = useSearchParams()
  const embedded = sp.get('embed') === '1'
  const [tpl, setTpl] = useState(null)
  const [buffer, setBuffer] = useState(null)
  const [error, setError] = useState('')
  const [values, setValues] = useState({})
  const [signer, setSigner] = useState({ name: '', email: '' })
  const [active, setActive] = useState(null) // field being filled
  const [textDraft, setTextDraft] = useState('')
  const [colorDraft, setColorDraft] = useState('#0f1535')
  const [lastSig, setLastSig] = useState({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  const [submitErr, setSubmitErr] = useState('')

  useEffect(() => {
    Promise.all([api(`/api/public/sign/${token}`), apiBuffer(`/api/public/sign/${token}/file`)])
      .then(([d, b]) => { setTpl(d.template); setBuffer(b) })
      .catch((e) => setError(e.message))
  }, [token])

  const fields = useMemo(() => tpl?.fields || [], [tpl])
  const required = fields.filter((f) => f.required)
  const remaining = required.filter((f) => !values[f.id]).length
  const fieldName = (f) => f.label || t(KIND_LABEL[f.kind])

  const openField = (f) => {
    setActive(f)
    if (values[f.id]?.color) setColorDraft(values[f.id].color)
    if (f.kind === 'date') setTextDraft(values[f.id]?.text || todayString())
    else if (f.kind === 'text') setTextDraft(values[f.id]?.text || signer.name)
  }

  const applySig = (sig) => {
    const kindKey = active.kind
    setValues((v) => ({ ...v, [active.id]: { type: sig.type, image: sig.image } }))
    setLastSig((l) => ({ ...l, [kindKey]: sig }))
    setActive(null)
  }
  const reuseSig = () => applySig(lastSig[active.kind])

  const renderOverlay = (page) =>
    fields.filter((f) => f.page === page).map((f) => {
      const v = values[f.id]
      return (
        <div
          key={f.id}
          className={`placed field-box kind-${f.kind}${v ? ' filled' : ' todo'}`}
          style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%`, width: `${f.w * 100}%`, height: `${f.h * 100}%`, cursor: 'pointer' }}
          onClick={() => openField(f)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && openField(f)}
          aria-label={`${fieldName(f)}${f.required ? ` (${t('required')})` : ''}`}
        >
          {v?.image ? <img src={v.image} alt="" /> : v?.text ? <span style={{ color: v.color || '#0f1535', fontWeight: 500 }}>{v.text}</span> : <span>{fieldName(f)}{f.required ? ' *' : ''}</span>}
        </div>
      )
    })

  const submit = async () => {
    setSubmitErr('')
    if (!signer.name.trim()) return setSubmitErr(t('Please enter your full name'))
    if (remaining) return setSubmitErr(t('Please complete {n} required field(s)', { n: remaining }))
    setBusy(true)
    try {
      const payload = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.text && needsImageText(v.text) ? { type: 'type', image: textToPng(v.text, v.color) } : v]))
      const r = await api(`/api/public/sign/${token}/submit`, { method: 'POST', body: { signerName: signer.name, signerEmail: signer.email || undefined, values: payload } })
      setDone(r.submission)
      if (window.parent !== window) window.parent.postMessage({ source: 'e1000signer', type: 'signed', submission: r.submission }, '*')
    } catch (e) {
      setSubmitErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (error) {
    return (
      <div className="auth-wrap">
        <div className="card auth-card center">
          <div className="empty-icon"><Icon name="link" size={28} /></div>
          <h1>{t('Link unavailable')}</h1>
          <p className="muted">{error}</p>
        </div>
      </div>
    )
  }
  if (!tpl) return <div className="loading-screen" style={{ minHeight: '100vh' }}><div className="spinner spinner-lg" /></div>

  if (done) {
    return (
      <div className="auth-wrap" style={{ minHeight: '100vh' }}>
        <div className="card auth-card center glow-border">
          <div className="empty-icon" style={{ background: 'rgba(16,185,129,.12)', color: 'var(--success)' }}><Icon name="check" size={30} /></div>
          <h1>{t('Signed successfully')}</h1>
          <p className="muted">{t('Thank you, {name}. {owner} has been notified.', { name: done.signerName, owner: tpl.ownerName })}</p>
          <a className="btn btn-primary btn-lg btn-block" href={done.downloadUrl}><Icon name="download" /> {t('Download signed PDF')}</a>
          {embedded && <button className="btn btn-text mt-2" onClick={() => window.parent.postMessage({ source: 'e1000signer', type: 'close' }, '*')}>{t('Close')}</button>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {!embedded && (
        <header className="nav">
          <div className="container">
            <Brand />
            <div className="row" style={{ marginLeft: 'auto', gap: 10, flexWrap: 'nowrap' }}>
              <span className="badge hide-sm"><Icon name="lock" size={12} /> {t('Secure signing link')}</span>
              <LanguageSwitcher />
            </div>
          </div>
        </header>
      )}
      <div className="container page" style={{ paddingTop: embedded ? 18 : 32 }}>
        <div className="page-head">
          <div>
            <h1 style={{ fontSize: 26 }}>{tpl.name}</h1>
            <p>{t('Requested by')} <b>{tpl.ownerName}</b>{tpl.ownerCompany ? ` · ${tpl.ownerCompany}` : ''}</p>
          </div>
          {embedded && <LanguageSwitcher />}
        </div>
        <div className="editor">
          <aside className="editor-panel stack">
            {tpl.message && <div className="card card-tight small" style={{ whiteSpace: 'pre-wrap' }}><b>{t('Message')}</b><br />{tpl.message}</div>}
            <div className="card card-tight">
              <div className="field"><label htmlFor="sn">{t('Your full name')} *</label><input id="sn" className="input" value={signer.name} onChange={(e) => setSigner({ ...signer, name: e.target.value })} autoComplete="name" /></div>
              <div className="field" style={{ marginBottom: 0 }}><label htmlFor="se">{t('Email')} <span className="muted">({t('optional')})</span></label><input id="se" className="input" type="email" value={signer.email} onChange={(e) => setSigner({ ...signer, email: e.target.value })} autoComplete="email" /></div>
            </div>
            <div className="card card-tight stack" style={{ gap: 8 }}>
              <div className="row-between"><b>{t('Fields')}</b><span className={`badge ${remaining ? 'badge-warning' : 'badge-success'}`}>{remaining ? t('{n} left', { n: remaining }) : t('All done')}</span></div>
              {fields.map((f) => (
                <button key={f.id} className={`tool-btn${values[f.id] ? ' active' : ''}`} onClick={() => openField(f)}>
                  <span className="ti">{values[f.id] ? <Icon name="check" size={15} /> : <Icon name={f.kind === 'date' ? 'calendar' : f.kind === 'text' ? 'text' : 'pen'} size={15} />}</span>
                  <span className="grow">{fieldName(f)}{f.required ? ' *' : ''}</span>
                  <span className="small muted">{t('p.{n}', { n: f.page + 1 })}</span>
                </button>
              ))}
              <p className="small muted" style={{ margin: 0 }}>{t('Allowed signature types:')} {tpl.allowedSignTypes.map((x) => t(TYPE_LABEL[x])).join(', ')}</p>
            </div>
            {submitErr && <div className="alert alert-error">{submitErr}</div>}
            <button className="btn btn-primary btn-lg btn-block" disabled={busy} onClick={submit}>
              {busy ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : <Icon name="check" />} {t('Finish & sign')}
            </button>
            <p className="small muted center" style={{ margin: 0 }}>{t('By signing you agree that your electronic signature is legally equivalent to your handwritten signature.')}</p>
          </aside>
          <PdfViewer buffer={buffer} renderOverlay={renderOverlay} />
        </div>
      </div>

      {active && (active.kind === 'signature' || active.kind === 'initials') && (
        lastSig[active.kind] && !values[active.id] ? (
          <Modal title={active.kind === 'initials' ? t('Initials') : t('Signature')} onClose={() => setActive(null)}>
            <div className="upload-preview"><img src={lastSig[active.kind].image} alt={t('Previous signature')} /></div>
            <div className="row mt-2" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setLastSig((l) => ({ ...l, [active.kind]: null }))}>{t('Create new')}</button>
              <button className="btn btn-primary" onClick={reuseSig}>{t('Use this')}</button>
            </div>
          </Modal>
        ) : (
          <SignaturePad
            title={active.kind === 'initials' ? t('Add your initials') : t('Add your signature')}
            allowed={tpl.allowedSignTypes}
            defaultName={active.kind === 'initials' ? signer.name.split(/\s+/).map((p) => p[0] || '').join('').toUpperCase() : signer.name}
            onClose={() => setActive(null)}
            onDone={applySig}
          />
        )
      )}
      {active && (active.kind === 'text' || active.kind === 'date') && (
        <Modal title={fieldName(active)} onClose={() => setActive(null)}>
          <input className="input" value={textDraft} onChange={(e) => setTextDraft(e.target.value)} autoFocus maxLength={200} style={{ color: colorDraft, fontWeight: 600 }} />
          <div className="mt-2"><div className="label" style={{ marginBottom: 6 }}>{t('Colour')}</div><ColorPicker value={colorDraft} onChange={setColorDraft} /></div>
          <div className="row mt-2" style={{ justifyContent: 'flex-end' }}>
            {values[active.id] && <button className="btn btn-danger" onClick={() => { setValues((v) => { const n = { ...v }; delete n[active.id]; return n }); setActive(null) }}>{t('Clear')}</button>}
            <button className="btn btn-primary" disabled={!textDraft.trim()} onClick={() => { setValues((v) => ({ ...v, [active.id]: { text: textDraft.trim(), color: colorDraft } })); setActive(null) }}>{t('Apply')}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
