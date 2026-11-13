import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, downloadFromApi } from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useT } from '../../i18n/index.jsx'
import { Loading, PageHead } from '../../components/Layout.jsx'
import Dropzone from '../../components/Dropzone.jsx'
import Icon from '../../components/Icon.jsx'
import { fmtBytes, fmtDate } from '../../lib/format.js'

const TYPE_NAMES = { draw: 'Draw', type: 'Type', upload: 'Upload' }

/** Documents your clients signed through your template links. */
function ClientSigned({ items }) {
  const t = useT()
  const toast = useToast()
  const [q, setQ] = useState('')
  if (!items) return <Loading />
  const needle = q.trim().toLowerCase()
  const rows = needle
    ? items.filter((s) => [s.signerName, s.signerEmail, s.templateName, s.documentTitle].some((v) => v?.toLowerCase().includes(needle)))
    : items
  if (items.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon"><Icon name="users" size={28} /></div>
        <p style={{ margin: '0 0 12px' }}>{t('No client has signed yet. Share a template link to collect signatures.')}</p>
        <Link to="/app/templates" className="btn btn-primary"><Icon name="layout" size={16} /> {t('Go to templates')}</Link>
      </div>
    )
  }
  return (
    <>
      <div className="row" style={{ padding: '10px 10px 4px' }}>
        <input className="input" style={{ maxWidth: 340 }} placeholder={t('Search signer, email, template…')} value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="grow" />
        <span className="small muted">{t('{n} signed document(s)', { n: rows.length })}</span>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>{t('Document')}</th><th>{t('Signer')}</th><th>{t('Signature types')}</th><th>{t('Signed at')}</th><th /></tr></thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>
                  <b>{s.templateName}</b>
                  <div className="small muted">{s.documentTitle} · {t('{n} page(s)', { n: s.pageCount })}</div>
                </td>
                <td><b>{s.signerName}</b><div className="small muted">{s.signerEmail || '—'}</div></td>
                <td>{s.signTypesUsed.map((x) => <span key={x} className="badge badge-muted" style={{ marginRight: 4 }}>{t(TYPE_NAMES[x] || x)}</span>)}</td>
                <td className="small muted">{fmtDate(s.createdAt)}</td>
                <td>
                  <div className="row" style={{ justifyContent: 'flex-end', gap: 6, flexWrap: 'nowrap' }}>
                    <Link to={`/app/templates/${s.templateId}`} className="btn btn-ghost btn-sm" title={t('Open template')}><Icon name="layout" size={14} /></Link>
                    <button className="btn btn-primary btn-sm" onClick={() => downloadFromApi(`/api/templates/${s.templateId}/submissions/${s.id}/download`).catch(toast.error)}><Icon name="download" size={14} /> PDF</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default function Documents() {
  const { can } = useAuth()
  const t = useT()
  const toast = useToast()
  const navigate = useNavigate()
  const [sp, setSp] = useSearchParams()
  const tab = sp.get('tab') === 'clients' && can('submission.read') ? 'clients' : 'mine'
  const [docs, setDocs] = useState(null)
  const [signed, setSigned] = useState(null)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(() => api('/api/documents').then((d) => setDocs(d.documents)).catch(toast.error), [toast])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (can('submission.read')) api('/api/templates/submissions').then((d) => setSigned(d.submissions)).catch(() => setSigned([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const upload = async (file) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { document } = await api('/api/documents', { method: 'POST', form })
      toast.success('Uploaded')
      navigate(`/app/documents/${document.id}/sign`)
    } catch (e) {
      toast.error(e)
    } finally {
      setUploading(false)
    }
  }

  const remove = async (d) => {
    if (!confirm(t('Delete "{title}"? Templates built from it will also be removed.', { title: d.title }))) return
    try {
      await api(`/api/documents/${d.id}`, { method: 'DELETE' })
      setDocs((l) => l.filter((x) => x.id !== d.id))
      toast.success('Deleted')
    } catch (e) {
      toast.error(e)
    }
  }

  return (
    <>
      <PageHead title={t('Documents')} subtitle={t('Upload a PDF to sign it yourself or turn it into a template for clients.')} />
      {can('document.create') && tab === 'mine' && <Dropzone onFile={upload} busy={uploading} />}

      <div className="tabs" role="tablist" style={{ marginTop: tab === 'mine' && can('document.create') ? 20 : 0 }}>
        <button role="tab" aria-selected={tab === 'mine'} className={`tab${tab === 'mine' ? ' active' : ''}`} onClick={() => setSp({})}>
          <span className="row" style={{ gap: 6 }}><Icon name="file" size={15} />{t('My documents')}{docs && <span className="badge badge-muted">{docs.length}</span>}</span>
        </button>
        {can('submission.read') && (
          <button role="tab" aria-selected={tab === 'clients'} className={`tab${tab === 'clients' ? ' active' : ''}`} onClick={() => setSp({ tab: 'clients' })}>
            <span className="row" style={{ gap: 6 }}><Icon name="users" size={15} />{t('Signed by clients')}{signed && <span className="badge badge-success">{signed.length}</span>}</span>
          </button>
        )}
      </div>

      <div className="card mt-2" style={{ padding: 8 }}>
        {tab === 'clients' ? <ClientSigned items={signed} /> : !docs ? <Loading /> : docs.length === 0 ? (
          <div className="empty"><div className="empty-icon"><Icon name="file" size={28} /></div>{t('No documents yet. Upload your first PDF above.')}</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('Document')}</th><th>{t('Status')}</th><th>{t('Pages')}</th><th>{t('Size')}</th><th>{t('Uploaded')}</th><th /></tr></thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id}>
                    <td><b>{d.title}</b><div className="small muted">{d.originalName}{d.source === 'api' && <span className="badge badge-muted" style={{ marginLeft: 6 }}>API</span>}</div></td>
                    <td>{d.isSigned ? <span className="badge badge-success"><Icon name="check" size={12} /> {t('Signed')}</span> : <span className="badge badge-muted">{t('Unsigned')}</span>}</td>
                    <td className="num">{d.pageCount}</td>
                    <td className="num">{fmtBytes(d.sizeBytes)}</td>
                    <td className="small muted">{fmtDate(d.createdAt)}</td>
                    <td>
                      <div className="row" style={{ justifyContent: 'flex-end', gap: 6, flexWrap: 'nowrap' }}>
                        <Link to={`/app/documents/${d.id}/sign`} className="btn btn-ghost btn-sm"><Icon name="pen" size={14} /> {t('Sign')}</Link>
                        {can('template.create') && <Link to={`/app/templates/new?doc=${d.id}`} className="btn btn-ghost btn-sm"><Icon name="layout" size={14} /> {t('Template')}</Link>}
                        <button className="btn btn-ghost btn-sm" onClick={() => downloadFromApi(`/api/documents/${d.id}/download`).catch(toast.error)} title={d.isSigned ? t('Download signed PDF') : t('Download original')}><Icon name="download" size={14} /></button>
                        {can('document.delete') && <button className="btn btn-danger btn-sm" onClick={() => remove(d)} aria-label={t('Delete')}><Icon name="trash" size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
