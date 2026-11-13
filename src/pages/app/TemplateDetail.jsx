import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, apiOrigin, downloadFromApi } from '../../api/client.js'
import { useServerConfig } from '../../api/serverConfig.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useT } from '../../i18n/index.jsx'
import { Loading, PageHead } from '../../components/Layout.jsx'
import { CodeBlock } from '../../components/CodeSamples.jsx'
import Icon from '../../components/Icon.jsx'
import { fmtDate } from '../../lib/format.js'

const TYPE_NAMES = { draw: 'Draw', type: 'Type', upload: 'Upload' }

export default function TemplateDetail() {
  const { id } = useParams()
  const { can } = useAuth()
  const t = useT()
  const toast = useToast()
  const navigate = useNavigate()
  const [tpl, setTpl] = useState(null)
  const [subs, setSubs] = useState(null)
  const [emails, setEmails] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const config = useServerConfig()
  const mailOff = config?.mailEnabled === false

  const load = useCallback(() => {
    api(`/api/templates/${id}`).then((d) => setTpl(d.template)).catch(toast.error)
    if (can('submission.read')) api(`/api/templates/${id}/submissions`).then((d) => setSubs(d.submissions)).catch(toast.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, toast])
  useEffect(() => { load() }, [load])

  if (!tpl) return <Loading />

  const patch = async (body) => {
    try { setTpl((await api(`/api/templates/${id}`, { method: 'PATCH', body })).template) } catch (e) { toast.error(e) }
  }
  const rotate = async () => {
    if (!confirm(t('Generate a new link? The current link will stop working.'))) return
    try { setTpl((await api(`/api/templates/${id}/rotate-link`, { method: 'POST' })).template); toast.success('New link generated') } catch (e) { toast.error(e) }
  }
  const del = async () => {
    if (!confirm(t('Delete this template and all its submissions?'))) return
    try { await api(`/api/templates/${id}`, { method: 'DELETE' }); navigate('/app/templates') } catch (e) { toast.error(e) }
  }
  const send = async (e) => {
    e.preventDefault()
    const list = emails.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean)
    if (!list.length) return
    setSending(true)
    try {
      const { results } = await api(`/api/templates/${id}/send`, { method: 'POST', body: { emails: list, message: message || undefined } })
      const ok = results.filter((r) => r.sent).length
      if (ok === results.length) toast.success('Sent to {n} recipient(s)', { n: ok })
      else toast.error(t('Sent {ok}/{total}; some emails failed', { ok, total: results.length }))
      setEmails('')
    } catch (err) {
      toast.error(err)
    } finally {
      setSending(false)
    }
  }

  const embed = `<script src="${apiOrigin()}/embed.js"></script>
<button onclick="E1000Signer.open('${tpl.shareToken}', { onSigned: s => console.log(s) })">Sign now</button>`

  return (
    <>
      <PageHead title={tpl.name} subtitle={`${tpl.documentTitle} · ${t('{n} field(s)', { n: tpl.fields.length })} · ${t('allowed:')} ${tpl.allowedSignTypes.map((x) => t(TYPE_NAMES[x])).join(', ')}`}>
        <Link to="/app/templates" className="btn btn-ghost">{t('Back')}</Link>
        {can('template.manage') && <Link to={`/app/templates/${id}/edit`} className="btn btn-ghost"><Icon name="pen" size={15} /> {t('Edit fields')}</Link>}
        <a href={tpl.shareUrl} target="_blank" rel="noreferrer" className="btn btn-primary"><Icon name="eye" size={16} /> {t('Preview')}</a>
      </PageHead>

      <div className="grid grid-2">
        <div className="card stack">
          <div className="row-between">
            <h3 style={{ margin: 0 }}>{t('Share link')}</h3>
            {can('template.manage') && (
              <label className="row small" style={{ gap: 8, cursor: 'pointer' }}>
                {tpl.isActive ? t('Active') : t('Paused')}
                <span className="switch"><input type="checkbox" checked={tpl.isActive} onChange={(e) => patch({ isActive: e.target.checked })} /><span /></span>
              </label>
            )}
          </div>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <input className="input mono" readOnly value={tpl.shareUrl} onFocus={(e) => e.target.select()} />
            <button className="btn btn-ghost" onClick={() => navigator.clipboard.writeText(tpl.shareUrl).then(() => toast.success('Copied'))} aria-label={t('Copy link')}><Icon name="copy" size={15} /></button>
          </div>
          {can('template.manage') && (
            <div className="row">
              <button className="btn btn-text btn-sm" onClick={rotate}><Icon name="refresh" size={14} /> {t('Regenerate link')}</button>
              <button className="btn btn-text btn-sm" style={{ color: 'var(--danger)' }} onClick={del}><Icon name="trash" size={14} /> {t('Delete template')}</button>
            </div>
          )}
          <div className="label mt-1">{t('Embed in your website')}</div>
          <CodeBlock code={embed} />
        </div>

        {can('template.share') && (
          <form className="card" onSubmit={send}>
            <h3>{t('Email to clients')}</h3>
            {mailOff && <div className="alert alert-info" style={{ marginBottom: 12 }}>{t('Sending emails is currently unavailable. Copy the share link and send it to your clients yourself.')}</div>}
            <div className="field"><label htmlFor="em">{t('Recipients')}</label><textarea id="em" className="textarea" style={{ minHeight: 70 }} placeholder="client@company.com, other@company.com" value={emails} onChange={(e) => setEmails(e.target.value)} /></div>
            <div className="field"><label htmlFor="msg">{t('Message')}</label><textarea id="msg" className="textarea" placeholder={tpl.message || t('Optional personal note')} value={message} onChange={(e) => setMessage(e.target.value)} /></div>
            <button className="btn btn-primary" disabled={sending || !tpl.isActive || mailOff}><Icon name="mail" size={16} /> {sending ? t('Sending…') : t('Send signing request')}</button>
            {!tpl.isActive && <p className="small muted mt-1">{t('Activate the link to send it.')}</p>}
          </form>
        )}
      </div>

      {subs && (
        <div className="card mt-3" style={{ padding: 8 }}>
          <h3 style={{ padding: '12px 12px 0' }}>{t('Submissions ({n})', { n: subs.length })}</h3>
          {subs.length === 0 ? <div className="empty">{t('Nobody has signed yet. Share the link above.')}</div> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>{t('Signer')}</th><th>{t('Email')}</th><th>{t('Signature types')}</th><th>{t('Signed at')}</th><th /></tr></thead>
                <tbody>
                  {subs.map((s) => (
                    <tr key={s.id}>
                      <td><b>{s.signerName}</b></td>
                      <td className="small">{s.signerEmail || <span className="muted">—</span>}</td>
                      <td>{s.signTypesUsed.map((x) => <span key={x} className="badge badge-muted" style={{ marginRight: 4 }}>{t(TYPE_NAMES[x] || x)}</span>)}</td>
                      <td className="small muted">{fmtDate(s.createdAt)}</td>
                      <td className="num"><button className="btn btn-ghost btn-sm" onClick={() => downloadFromApi(`/api/templates/${id}/submissions/${s.id}/download`).catch(toast.error)}><Icon name="download" size={14} /> PDF</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  )
}
