import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useT } from '../i18n/index.jsx'
import Icon from '../components/Icon.jsx'

/**
 * 404 page. `compact` = rendered inside the workspace/admin shell (sidebar stays visible).
 */
export default function NotFound({ compact = false }) {
  const t = useT()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const canGoBack = typeof window !== 'undefined' && window.history.length > 1

  return (
    <div className={compact ? 'nf nf-compact' : 'nf'}>
      <div className="nf-card card glow-border">
        <div className="nf-visual" aria-hidden>
          <span className="nf-orbit" />
          <span className="nf-planet" />
          <span className="nf-doc"><Icon name="file" size={34} /></span>
        </div>
        <div className="nf-code gradient-text">404</div>
        <h1 className="nf-title">{t('Page not found')}</h1>
        <p className="muted nf-text">{t("The page you're looking for doesn't exist, was moved, or the link is incomplete.")}</p>
        <code className="nf-path" title={pathname}>{pathname}</code>
        <div className="row nf-actions">
          {canGoBack && <button className="btn btn-ghost" onClick={() => navigate(-1)}>← {t('Go back')}</button>}
          <Link to="/" className="btn btn-ghost"><Icon name="home" size={16} /> {t('Home')}</Link>
          {user ? (
            <Link to="/app" className="btn btn-primary"><Icon name="layout" size={16} /> {t('Go to dashboard')}</Link>
          ) : (
            <Link to="/demo" className="btn btn-primary"><Icon name="sparkles" size={16} /> {t('Try demo')}</Link>
          )}
        </div>
        <p className="small muted nf-help">
          {t('Opened a signing link? Ask the sender for a new one — it may have been regenerated or deactivated.')}
        </p>
      </div>
    </div>
  )
}
