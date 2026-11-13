import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client.js'
import { useToast } from '../../context/ToastContext.jsx'
import { useT } from '../../i18n/index.jsx'
import { Loading, PageHead, useUsertypeLabel } from '../../components/Layout.jsx'
import Icon from '../../components/Icon.jsx'
import OverviewChart from './OverviewChart.jsx'
import { CATEGORY_BADGE, eventLabel, fmtNum, timeAgo } from '../../lib/format.js'

export default function AdminOverview() {
  const t = useT()
  const typeLabel = useUsertypeLabel()
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [overview, setOverview] = useState(null)
  const [days, setDays] = useState(30)
  const [recent, setRecent] = useState([])

  useEffect(() => {
    api('/api/admin/stats').then(setStats).catch(toast.error)
    api('/api/admin/events?limit=8&hideApi=true').then((d) => setRecent(d.events)).catch(() => {})
  }, [toast])
  useEffect(() => { api(`/api/admin/overview?days=${days}`).then(setOverview).catch(toast.error) }, [days, toast])

  if (!stats) return <Loading />
  const x = stats.totals
  const tiles = [
    { label: t('Users'), value: x.users, sub: t('{v} verified · +{n} this week', { v: fmtNum(x.verified_users), n: fmtNum(x.new_users_7d) }), icon: 'users' },
    { label: t('Documents'), value: x.documents, sub: t('{n} signed', { n: fmtNum(x.signed_documents) }), icon: 'file' },
    { label: t('Client submissions'), value: x.submissions, sub: t('{n} templates', { n: fmtNum(x.templates) }), icon: 'layout' },
    { label: t('Demo signatures'), value: x.demo_signatures, sub: t('{n} active API keys', { n: fmtNum(x.active_api_keys) }), icon: 'sparkles' },
  ]
  const totalUsers = stats.usersByType.reduce((a, b) => a + b.count, 0) || 1

  return (
    <>
      <PageHead title={t('Admin overview')} subtitle={t('{n} events in the last 24 hours', { n: fmtNum(x.events_24h) })}>
        <Link to="/admin/events" className="btn btn-ghost"><Icon name="list" size={16} /> {t('All events')}</Link>
      </PageHead>
      <div className="grid grid-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="card stat">
            <div className="stat-label"><span className="stat-icon"><Icon name={tile.icon} size={16} /></span>{tile.label}</div>
            <div className="stat-value">{fmtNum(tile.value)}</div>
            <div className="stat-sub">{tile.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-3">{overview ? <OverviewChart series={overview.series} days={days} onDays={setDays} /> : <div className="card"><Loading /></div>}</div>

      <div className="grid grid-2 mt-3">
        <div className="card">
          <h3>{t('Users by type')}</h3>
          <div className="stack mt-2" style={{ gap: 12 }}>
            {stats.usersByType.map((u) => (
              <div key={u.code}>
                <div className="row-between small"><span><b>{typeLabel(u.code, u.name)}</b> <span className="muted mono">{u.code}</span></span><b>{fmtNum(u.count)}</b></div>
                <div style={{ height: 8, borderRadius: 4, background: '#eef1fa', marginTop: 6 }}>
                  <div style={{ width: `${(u.count / totalUsers) * 100}%`, height: '100%', borderRadius: 4, background: '#2a78d6', minWidth: u.count ? 4 : 0 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="row-between"><h3 style={{ margin: 0 }}>{t('Latest events')}</h3><Link to="/admin/events" className="small">{t('View all →')}</Link></div>
          <div className="stack mt-2" style={{ gap: 10 }}>
            {recent.map((e) => (
              <div key={e.id} className="row-between small" style={{ flexWrap: 'nowrap' }}>
                <span className="row" style={{ gap: 8, flexWrap: 'nowrap', minWidth: 0 }}>
                  <span className={CATEGORY_BADGE[e.category] || 'badge'}>{e.category}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{eventLabel(e.type)}{e.user_email ? <span className="muted"> · {e.user_email}</span> : ''}</span>
                </span>
                <span className="muted" style={{ whiteSpace: 'nowrap' }}>{timeAgo(e.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
