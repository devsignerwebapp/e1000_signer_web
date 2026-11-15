import { Link } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { useT } from '../i18n/index.jsx'

const FEATURES = [
  { icon: 'pen', title: 'Draw, type or upload', text: 'Hand-drawn signatures, elegant typed scripts, or your company logo & seal with automatic background removal.' },
  { icon: 'globe', title: 'PDF → HTML → PDF', text: 'Your PDF is rendered as live HTML pages in the browser; signatures are stamped back into the original PDF, pixel-perfect.' },
  { icon: 'layout', title: 'Reusable templates', text: 'Mark where clients sign once, pick which signature types they may use, and share a link — or email it directly.' },
  { icon: 'code', title: 'API for every stack', text: 'REST + API keys, OpenAPI spec, webhooks and an embeddable widget. Examples for JS, Python, PHP, C#, Java, Go.' },
  { icon: 'shield', title: 'Roles & permissions', text: 'Users, usertypes and permissions in PostgreSQL. Admins see every event in a live console.' },
  { icon: 'zap', title: 'Free. Really.', text: 'Core signing, templates and API are free. A Pro plan with advanced features is on the way.' },
]
const STEPS = [
  ['01', 'Upload your PDF', 'Drag & drop any PDF. It opens instantly as interactive HTML pages.'],
  ['02', 'Place your signature', 'Draw, type or upload — then drag it exactly where it belongs. Add text and dates too.'],
  ['03', 'Download signed PDF', 'We stamp everything into the original PDF so the layout stays perfect.'],
]

export default function Landing() {
  const t = useT()
  return (
    <>
      <section className="hero container">
        <span className="pill"><span className="pill-dot" /> {t('Free e-signatures · no credit card')}</span>
        <h1>
          {t('Sign any PDF in')} <span className="gradient-text">{t('seconds')}</span>{t(', from anywhere.')}
        </h1>
        <p className="lead">{t('Upload a document, place your signature, download the signed PDF. Create templates for your clients and plug E1000Signer into your own apps via API.')}</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link to="/demo" className="btn btn-primary btn-lg"><Icon name="sparkles" /> {t('Try the demo — no signup')}</Link>
          <Link to="/register" className="btn btn-ghost btn-lg">{t('Create free account')} <Icon name="arrow" /></Link>
        </div>

        <div className="hero-visual">
          <div className="mock-doc glow-border">
            <div className="row-between" style={{ marginBottom: 22 }}>
              <b style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>{t('Service Agreement')}</b>
              <span className="badge badge-success"><Icon name="check" size={13} /> {t('Ready to sign')}</span>
            </div>
            {[92, 100, 86, 97, 72, 100, 64].map((w, i) => <div key={i} className="mock-line" style={{ width: `${w}%` }} />)}
            <div style={{ height: 110 }} />
            <div className="mock-sign"><span>Elena Rivers</span></div>
          </div>
          <div className="floating-chip float" style={{ left: -18, top: 70 }}><span className="stat-icon"><Icon name="pen" size={15} /></span> {t('Drawn signature')}</div>
          <div className="floating-chip float" style={{ right: -14, top: -22, animationDelay: '-2s' }}><span className="stat-icon"><Icon name="stamp" size={15} /></span> {t('Company seal')}</div>
          <div className="floating-chip float" style={{ left: 40, bottom: -18, animationDelay: '-4s' }}><span className="stat-icon"><Icon name="code" size={15} /></span> POST /api/v1/sign</div>
        </div>
      </section>

      <section className="section container">
        <div className="section-title">
          <span className="step-num">{t('WHY E1000SIGNER')}</span>
          <h2>{t('Everything you need to get documents signed')}</h2>
        </div>
        <div className="grid grid-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card card-hover">
              <div className="feature-icon"><Icon name={f.icon} size={22} /></div>
              <h3>{t(f.title)}</h3>
              <p className="muted" style={{ margin: 0 }}>{t(f.text)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section container">
        <div className="section-title">
          <span className="step-num">{t('HOW IT WORKS')}</span>
          <h2>{t('Three steps. Zero friction.')}</h2>
        </div>
        <div className="grid grid-3">
          {STEPS.map(([n, title, d]) => (
            <div key={n} className="card">
              <div className="step-num">{n}</div>
              <h3 className="mt-1">{t(title)}</h3>
              <p className="muted" style={{ margin: 0 }}>{t(d)}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="section container">
        <div className="section-title">
          <span className="step-num">{t('PRICING')}</span>
          <h2>{t('Free today. Pro tomorrow.')}</h2>
        </div>
        <div className="grid grid-3" style={{ maxWidth: 980, margin: '0 auto' }}>
          <div className="card plan">
            <h3>{t('Guest')}</h3>
            <div className="price">$0</div>
            <p className="muted small">{t('No account needed')}</p>
            <ul><li>{t('Demo signer')}</li><li>{t('Draw / type / upload')}</li><li>{t('Download signed PDF')}</li><li>{t('Nothing stored on our servers')}</li></ul>
            <Link to="/demo" className="btn btn-ghost btn-block">{t('Try demo')}</Link>
          </div>
          <div className="card plan glow-border">
            <span className="badge" style={{ position: 'absolute', top: 18, right: 18 }}>{t('Most popular')}</span>
            <h3>{t('Free account')}</h3>
            <div className="price">$0</div>
            <p className="muted small">{t('Forever free')}</p>
            <ul><li>{t('Document library')}</li><li>{t('Templates & share links')}</li><li>{t('Choose client signature types')}</li><li>{t('REST API, webhooks & embed')}</li></ul>
            <Link to="/register" className="btn btn-primary btn-block">{t('Create account')}</Link>
          </div>
          <div className="card plan">
            <span className="badge badge-pro" style={{ position: 'absolute', top: 18, right: 18 }}>{t('Coming soon')}</span>
            <h3>Pro</h3>
            <div className="price">—</div>
            <p className="muted small">{t('For growing teams')}</p>
            <ul><li>{t('Everything in Free')}</li><li>{t('AI legal analysis of documents')}</li><li>{t('Bulk send (planned)')}</li><li>{t('Custom branding (planned)')}</li><li>{t('Audit certificate (planned)')}</li></ul>
            <button className="btn btn-ghost btn-block" disabled>{t('Notify me')}</button>
          </div>
        </div>
      </section>
    </>
  )
}
