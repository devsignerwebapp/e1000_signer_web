import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useT } from '../../i18n/index.jsx'
import { Loading, PageHead } from '../../components/Layout.jsx'
import CodeSamples, { CodeBlock } from '../../components/CodeSamples.jsx'
import Modal from '../../components/Modal.jsx'
import Icon from '../../components/Icon.jsx'
import { fmtDate, timeAgo } from '../../lib/format.js'

export default function Developers() {
  const { can } = useAuth()
  const t = useT()
  const toast = useToast()
  const [keys, setKeys] = useState(null)
  const [name, setName] = useState('')
  const [created, setCreated] = useState(null)
  const [hook, setHook] = useState({ url: '', secret: null })
  const [hookUrl, setHookUrl] = useState('')

  useEffect(() => {
    api('/api/account/api-keys').then((d) => setKeys(d.apiKeys)).catch(toast.error)
    if (can('webhook.manage')) api('/api/account/webhook').then((d) => { setHook(d); setHookUrl(d.url || '') }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast])

  const create = async (e) => {
    e.preventDefault()
    try {
      const r = await api('/api/account/api-keys', { method: 'POST', body: { name: name || t('Default key') } })
      setKeys((k) => [r.apiKey, ...k])
      setCreated(r.key)
      setName('')
    } catch (err) {
      toast.error(err)
    }
  }
  const revoke = async (k) => {
    if (!confirm(t('Revoke "{name}"? Apps using it will stop working immediately.', { name: k.name }))) return
    try {
      await api(`/api/account/api-keys/${k.id}`, { method: 'DELETE' })
      setKeys((l) => l.map((x) => (x.id === k.id ? { ...x, revokedAt: new Date().toISOString() } : x)))
    } catch (err) {
      toast.error(err)
    }
  }
  const saveHook = async (e) => {
    e.preventDefault()
    try {
      const r = await api('/api/account/webhook', { method: 'PUT', body: { url: hookUrl.trim() || null } })
      setHook(r)
      toast.success(r.url ? 'Webhook saved — copy the new signing secret' : 'Webhook removed')
    } catch (err) {
      toast.error(err)
    }
  }
  const testHook = async () => {
    try {
      const r = await api('/api/account/webhook/test', { method: 'POST' })
      if (r.ok) toast.success('Delivered (HTTP {status})', { status: r.status })
      else toast.error(t('Delivery failed: {reason}', { reason: r.error || `HTTP ${r.status}` }))
    } catch (err) {
      toast.error(err)
    }
  }

  return (
    <>
      <PageHead title={t('API & Webhooks')} subtitle={t('Use E1000Signer from your own applications.')} />
      <div className="grid grid-2">
        <div className="card">
          <h3>{t('API keys')}</h3>
          <form className="row" onSubmit={create} style={{ flexWrap: 'nowrap' }}>
            <input className="input" placeholder={t('Key name (e.g. Production server)')} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            <button className="btn btn-primary"><Icon name="plus" size={16} /> {t('Create')}</button>
          </form>
          {!keys ? <Loading /> : keys.length === 0 ? <p className="muted mt-2">{t('No keys yet.')}</p> : (
            <div className="table-wrap mt-2">
              <table className="table">
                <thead><tr><th>{t('Name')}</th><th>{t('Key')}</th><th>{t('Last used')}</th><th /></tr></thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id} style={{ opacity: k.revokedAt ? 0.5 : 1 }}>
                      <td><b>{k.name}</b><div className="small muted">{fmtDate(k.createdAt)}</div></td>
                      <td className="mono">{k.prefix}…</td>
                      <td className="small muted">{k.lastUsedAt ? timeAgo(k.lastUsedAt) : t('never')}</td>
                      <td className="num">{k.revokedAt ? <span className="badge badge-muted">{t('Revoked')}</span> : <button className="btn btn-danger btn-sm" onClick={() => revoke(k)}>{t('Revoke')}</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {can('webhook.manage') && (
          <form className="card" onSubmit={saveHook}>
            <h3>{t('Webhook')}</h3>
            <p className="small muted">{t('We POST JSON to this URL on submission.created and document.signed. Verify the X-E1000-Signature header with your secret.')}</p>
            <div className="field"><label htmlFor="wh">{t('Endpoint URL')}</label><input id="wh" className="input" type="url" placeholder="https://your-app.com/hooks/e1000" value={hookUrl} onChange={(e) => setHookUrl(e.target.value)} /></div>
            {hook.secret && <div className="field"><label>{t('Signing secret')}</label><input className="input mono" readOnly value={hook.secret} onFocus={(e) => e.target.select()} /></div>}
            <div className="row">
              <button className="btn btn-primary">{t('Save')}</button>
              {hook.url && <button type="button" className="btn btn-ghost" onClick={testHook}><Icon name="zap" size={15} /> {t('Send test event')}</button>}
            </div>
          </form>
        )}
      </div>

      <div className="card mt-3">
        <h3>{t('Integration examples')}</h3>
        <CodeSamples />
      </div>

      {created && (
        <Modal title={t('Your new API key')} onClose={() => setCreated(null)}>
          <div className="alert alert-info" style={{ marginBottom: 12 }}>{t('Copy it now: for security we only show it once.')}</div>
          <CodeBlock code={created} />
          <div className="row mt-2" style={{ justifyContent: 'flex-end' }}><button className="btn btn-primary" onClick={() => setCreated(null)}>{t('Done')}</button></div>
        </Modal>
      )}
    </>
  )
}
