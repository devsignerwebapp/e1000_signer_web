import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, downloadFromApi } from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useT } from '../../i18n/index.jsx'
import { Loading, PageHead } from '../../components/Layout.jsx'
import Dropzone from '../../components/Dropzone.jsx'
import Icon from '../../components/Icon.jsx'
import { fmtBytes, fmtDate } from '../../lib/format.js'

export default function Documents() {
  const { can } = useAuth()
  const t = useT()
  const toast = useToast()
  const navigate = useNavigate()
  const [docs, setDocs] = useState(null)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(() => api('/api/documents').then((d) => setDocs(d.documents)).catch(toast.error), [toast])
  useEffect(() => { load() }, [load])

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
      {can('document.create') && <Dropzone onFile={upload} busy={uploading} />}
      <div className="card mt-3" style={{ padding: 8 }}>
        {!docs ? <Loading /> : docs.length === 0 ? (
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
