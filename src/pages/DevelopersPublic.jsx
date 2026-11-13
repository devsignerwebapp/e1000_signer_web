import { Link } from 'react-router-dom'
import CodeSamples from '../components/CodeSamples.jsx'
import Icon from '../components/Icon.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useT } from '../i18n/index.jsx'

const WAYS = [
  { icon: 'code', title: 'REST API', text: 'JSON + multipart endpoints under /api/v1, authenticated with an X-API-Key header.' },
  { icon: 'file', title: 'OpenAPI spec', text: 'Import into Postman, Insomnia or Swagger UI, or generate SDKs for 40+ languages.' },
  { icon: 'webhook', title: 'Webhooks', text: 'Get an HMAC-signed POST when a client signs (submission.created) or a doc is signed.' },
  { icon: 'globe', title: 'Embed widget', text: 'One <script> tag opens the signing flow in a modal on your own website.' },
  { icon: 'link', title: 'Share links', text: 'No code at all: send template links from the dashboard or by email.' },
  { icon: 'zap', title: 'No-code tools', text: 'Zapier, Make, n8n: call the REST endpoints with an HTTP module + your API key.' },
]

export default function DevelopersPublic() {
  const { user } = useAuth()
  const t = useT()
  return (
    <div className="container page">
      <div className="hero" style={{ padding: '24px 0 32px' }}>
        <span className="pill"><Icon name="code" size={14} /> {t('Developer platform')}</span>
        <h1 style={{ fontSize: 'clamp(32px,5vw,52px)' }}>{t('Signatures inside')} <span className="gradient-text">{t('your')}</span> {t('product')}</h1>
        <p className="lead">{t("Six ways to integrate, and they're all free. Get an API key, then sign PDFs from any language.")}</p>
        <Link to={user ? '/app/developers' : '/register'} className="btn btn-primary btn-lg"><Icon name="key" /> {user ? t('Manage API keys') : t('Get a free API key')}</Link>
      </div>
      <div className="grid grid-3">
        {WAYS.map((w) => (
          <div key={w.title} className="card card-hover">
            <div className="feature-icon"><Icon name={w.icon} size={20} /></div>
            <h3>{t(w.title)}</h3>
            <p className="muted" style={{ margin: 0 }}>{t(w.text)}</p>
          </div>
        ))}
      </div>
      <div className="card mt-4">
        <h2 style={{ fontSize: 24 }}>{t('Quick start')}</h2>
        <p className="muted">{t('Coordinates use the visible page with the origin at the top-left. By default x, y, w, h are ratios (0–1) of the page width/height; pass "unit": "pt" to use PDF points. Every placement needs an image (PNG/JPEG data URL) or text; text placements may also set a color.')}</p>
        <CodeSamples />
      </div>
    </div>
  )
}
