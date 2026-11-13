import { Link } from 'react-router-dom'
import { useT } from '../i18n/index.jsx'

export default function NotFound() {
  const t = useT()
  return (
    <div className="auth-wrap">
      <div className="center">
        <div className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: 120, fontWeight: 700, lineHeight: 1 }}>404</div>
        <h2>{t('This page drifted into space')}</h2>
        <Link to="/" className="btn btn-primary mt-2">{t('Back home')}</Link>
      </div>
    </div>
  )
}
