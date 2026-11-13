import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useT } from '../../i18n/index.jsx'
import { PageHead, Loading, useUsertypeLabel } from '../../components/Layout.jsx'
import Icon from '../../components/Icon.jsx'
import { eventLabel, fmtNum, timeAgo } from '../../lib/format.js'

export default function Dashboard() {
  const { user, can } = useAuth()
  const t = useT()
  const typeLabel = useUsertypeLabel()
  const [data, setData] = useState(null)
  useEffect(() => { api('/api/account/stats').then(setData).catch(() => setData({ stats: {}, activity: [] })) }, [])
  if (!data) return <Loading />
  const s = data.stats
  const tiles = [
    { label: t('Documents'), value: s.documents, icon: 'file', sub: t('{n} signed', { n: fmtNum(s.signed) }) },
    { label: t('Templates'), value: s.templates, icon: 'layout', sub: t('Reusable signing links') },
    { label: t('Client signatures'), value: s.submissions, icon: 'users', sub: t('From your share links') },
    { label: t('API calls (30d)'), value: s.api_calls_30d, icon: 'code', sub: t('Across all keys') },
  ]
  return (
    <>
      <PageHead title={t('Hello, {name} 👋', { name: user.fullName.split(' ')[0] })} subtitle={t("Here's what's happening in your signing workspace.")}>
        <Link to="/app/documents" className="btn btn-primary"><Icon name="upload" /> {t('Upload & sign')}</Link>
      </PageHead>
      <div className="grid grid-4">
        {tiles.map((x) => (
          <div key={x.label} className="card stat">
            <div className="stat-label"><span className="stat-icon"><Icon name={x.icon} size={16} /></span>{x.label}</div>
            <div className="stat-value">{fmtNum(x.value)}</div>
            <div className="stat-sub">{x.sub}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-2 mt-3">
        <div className="card">
          <h3>{t('Quick actions')}</h3>
          <div className="stack mt-2" style={{ gap: 8 }}>
            <Link to="/app/documents" className="tool-btn"><span className="ti"><Icon name="pen" size={16} /></span>{t('Sign a document myself')}</Link>
            {can('template.create') && <Link to="/app/templates/new" className="tool-btn"><span className="ti"><Icon name="layout" size={16} /></span>{t('Create a template for clients')}</Link>}
            {can('api.keys.manage') && <Link to="/app/developers" className="tool-btn"><span className="ti"><Icon name="key" size={16} /></span>{t('Get an API key')}</Link>}
            <Link to="/app/profile" className="tool-btn"><span className="ti"><Icon name="crown" size={16} /></span>{t('Plan:')} {typeLabel(user.usertype, user.usertypeName)}{user.usertype !== 'pro' && ` · ${t('Pro coming soon')}`}</Link>
          </div>
        </div>
        <div className="card">
          <h3>{t('Recent activity')}</h3>
          {data.activity.length === 0 ? <p className="muted">{t('No activity yet.')}</p> : (
            <div className="stack mt-2" style={{ gap: 10 }}>
              {data.activity.map((a, i) => (
                <div key={i} className="row-between small">
                  <span>{eventLabel(a.type)}{a.meta?.signer ? ` — ${a.meta.signer}` : ''}</span>
                  <span className="muted">{timeAgo(a.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
