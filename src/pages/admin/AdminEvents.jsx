import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import { useToast } from '../../context/ToastContext.jsx'
import { useT } from '../../i18n/index.jsx'
import { Loading, PageHead } from '../../components/Layout.jsx'
import Icon from '../../components/Icon.jsx'
import { CATEGORY_BADGE, eventLabel, fmtDate, fmtNum } from '../../lib/format.js'

export default function AdminEvents() {
  const t = useT()
  const toast = useToast()
  const [filters, setFilters] = useState({ category: '', q: '', hideApi: true })
  const [query, setQuery] = useState(filters)
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [open, setOpen] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => { setQuery(filters); setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [filters])

  useEffect(() => {
    const p = new URLSearchParams({ page, limit: 50, hideApi: query.hideApi })
    if (query.category) p.set('category', query.category)
    if (query.q) p.set('q', query.q)
    api(`/api/admin/events?${p}`).then(setData).catch(toast.error)
  }, [query, page, toast])

  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1

  return (
    <>
      <PageHead title={t('Events')} subtitle={t('Every action across the platform: auth, documents, templates, submissions, API and admin.')} />
      <div className="card card-tight row" style={{ marginBottom: 16 }}>
        <input className="input" style={{ maxWidth: 320 }} placeholder={t('Search email, type, id, metadata…')} value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        <select className="select" style={{ maxWidth: 200 }} value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="">{t('All categories')}</option>
          {(data?.categories || []).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="checkbox"><input type="checkbox" checked={filters.hideApi} onChange={(e) => setFilters({ ...filters, hideApi: e.target.checked })} /> {t('Hide individual API requests')}</label>
        <span className="grow" />
        {data && <span className="small muted">{t('{n} events', { n: fmtNum(data.total) })}</span>}
      </div>
      <div className="card" style={{ padding: 8 }}>
        {!data ? <Loading /> : data.events.length === 0 ? <div className="empty">{t('No events match.')}</div> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('When')}</th><th>{t('Category')}</th><th>{t('Event')}</th><th>{t('User')}</th><th>IP</th><th /></tr></thead>
              <tbody>
                {data.events.map((e) => (
                  <tr key={e.id}>
                    <td className="small" style={{ whiteSpace: 'nowrap' }}>{fmtDate(e.created_at)}</td>
                    <td><span className={CATEGORY_BADGE[e.category] || 'badge'}>{e.category}</span></td>
                    <td><b className="small">{eventLabel(e.type)}</b><div className="mono muted" style={{ fontSize: 11 }}>{e.type}</div></td>
                    <td className="small">{e.user_email || <span className="muted">{t('guest')}</span>}</td>
                    <td className="mono muted" style={{ fontSize: 12 }}>{e.ip_address || '—'}</td>
                    <td className="num"><button className="btn btn-text btn-sm" onClick={() => setOpen(open === e.id ? null : e.id)} aria-label={t('Details')}><Icon name="eye" size={15} /></button>
                      {open === e.id && <pre className="codeblock" style={{ textAlign: 'left', marginTop: 6, maxWidth: 420, whiteSpace: 'pre-wrap' }}>{JSON.stringify({ entity: e.entity_id, ...e.meta }, null, 2)}</pre>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="row mt-2" style={{ justifyContent: 'center' }}>
        <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← {t('Prev')}</button>
        <span className="small muted">{t('Page {n} / {total}', { n: page, total: pages })}</span>
        <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>{t('Next')} →</button>
      </div>
    </>
  )
}
