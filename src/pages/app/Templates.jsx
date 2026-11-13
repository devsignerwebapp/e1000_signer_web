import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client.js'
import { useToast } from '../../context/ToastContext.jsx'
import { useT } from '../../i18n/index.jsx'
import { Loading, PageHead } from '../../components/Layout.jsx'
import Icon from '../../components/Icon.jsx'
import { timeAgo } from '../../lib/format.js'

const TYPE_NAMES = { draw: 'Draw', type: 'Type', upload: 'Upload' }

export default function Templates() {
  const t = useT()
  const toast = useToast()
  const [list, setList] = useState(null)
  useEffect(() => { api('/api/templates').then((d) => setList(d.templates)).catch(toast.error) }, [toast])

  const copy = (tpl) => navigator.clipboard.writeText(tpl.shareUrl).then(() => toast.success('Link copied'))

  return (
    <>
      <PageHead title={t('Templates')} subtitle={t('Reusable documents your clients sign through a link.')}>
        <Link to="/app/templates/new" className="btn btn-primary"><Icon name="plus" /> {t('New template')}</Link>
      </PageHead>
      {!list ? <Loading /> : list.length === 0 ? (
        <div className="card empty">
          <div className="empty-icon"><Icon name="layout" size={28} /></div>
          <h3>{t('No templates yet')}</h3>
          <p>{t('Turn any PDF into a signing link for your clients.')}</p>
          <Link to="/app/templates/new" className="btn btn-primary">{t('Create your first template')}</Link>
        </div>
      ) : (
        <div className="grid grid-3">
          {list.map((tpl) => (
            <div key={tpl.id} className="card card-hover stack" style={{ gap: 10 }}>
              <div className="row-between">
                <span className={`badge ${tpl.isActive ? 'badge-success' : 'badge-muted'}`}>{tpl.isActive ? t('Active') : t('Paused')}</span>
                <span className="small muted">{t('{n} field(s)', { n: tpl.fields.length })}</span>
              </div>
              <Link to={`/app/templates/${tpl.id}`} style={{ color: 'var(--ink)' }}><h3 style={{ margin: 0 }}>{tpl.name}</h3></Link>
              <div className="small muted">{tpl.documentTitle} · {t('{n} page(s)', { n: tpl.pageCount })}</div>
              <div className="row small" style={{ gap: 6 }}>
                {tpl.allowedSignTypes.map((s) => <span key={s} className="badge badge-muted">{t(TYPE_NAMES[s])}</span>)}
              </div>
              <div className="row-between">
                <span className="small">{t('{n} signed', { n: tpl.submissionCount })}{tpl.lastSubmissionAt && <span className="muted"> · {t('last')} {timeAgo(tpl.lastSubmissionAt)}</span>}</span>
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => copy(tpl)} aria-label={t('Copy link')}><Icon name="copy" size={14} /></button>
                  <Link to={`/app/templates/${tpl.id}`} className="btn btn-ghost btn-sm">{t('Open')}</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
