import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../api/client.js'
import { useServerConfig } from '../api/serverConfig.js'
import { useI18n } from '../i18n/index.jsx'
import Modal from './Modal.jsx'
import Icon from './Icon.jsx'

const SEVERITY = {
  high: { badge: 'badge-danger', icon: 'shield', label: 'High risk' },
  medium: { badge: 'badge-warning', icon: 'shield', label: 'Medium risk' },
  low: { badge: 'badge-success', icon: 'check', label: 'Low risk' },
}
const ORDER = { high: 0, medium: 1, low: 2 }

function SeverityBadge({ level }) {
  const { t } = useI18n()
  const s = SEVERITY[level] || SEVERITY.medium
  return <span className={`badge ${s.badge}`}><Icon name={s.icon} size={12} /> {t(s.label)}</span>
}

/** Renders the structured report returned by the backend (services/ai.js schema). */
export function AnalysisReport({ result }) {
  const { t } = useI18n()
  const risks = [...result.risks].sort((a, b) => ORDER[a.severity] - ORDER[b.severity])
  return (
    <div className="ai-report stack" style={{ gap: 18 }}>
      <div className="ai-overview">
        <div className="row-between">
          <div>
            <div className="small muted">{t('Document type')}</div>
            <b style={{ fontSize: 17 }}>{result.documentType}</b>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="small muted">{t('Overall risk')}</div>
            <SeverityBadge level={result.overallRisk} />
          </div>
        </div>
        <p style={{ margin: '12px 0 0' }}>{result.summary}</p>
        {result.overallRiskReason && <p className="small muted" style={{ margin: '8px 0 0' }}>{result.overallRiskReason}</p>}
      </div>

      {result.parties.length > 0 && (
        <section>
          <h4>{t('Parties')}</h4>
          <div className="row" style={{ gap: 8 }}>
            {result.parties.map((p, i) => <span key={i} className="pill"><b>{p.name}</b> · {p.role}</span>)}
          </div>
        </section>
      )}

      {risks.length > 0 && (
        <section>
          <h4>{t('Risks and points to check')} <span className="badge badge-muted">{risks.length}</span></h4>
          <div className="stack" style={{ gap: 10 }}>
            {risks.map((r, i) => (
              <div key={i} className={`ai-risk ai-risk-${r.severity}`}>
                <div className="row-between" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                  <b>{r.title}</b>
                  <SeverityBadge level={r.severity} />
                </div>
                {r.clause && <blockquote className="ai-clause">“{r.clause}”</blockquote>}
                <p className="small" style={{ margin: '6px 0 0' }}>{r.explanation}</p>
                {r.recommendation && <p className="small" style={{ margin: '6px 0 0' }}><b>{t('What to do:')}</b> {r.recommendation}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {result.keyTerms.length > 0 && (
        <section>
          <h4>{t('Key terms')}</h4>
          <dl className="kv ai-terms">
            {result.keyTerms.map((k, i) => [<dt key={`t${i}`}>{k.title}</dt>, <dd key={`d${i}`}>{k.detail}</dd>])}
          </dl>
        </section>
      )}

      {result.missingClauses.length > 0 && (
        <section>
          <h4>{t('Missing protections')}</h4>
          <ul className="ai-list">{result.missingClauses.map((m, i) => <li key={i}>{m}</li>)}</ul>
        </section>
      )}

      {result.questionsToAsk.length > 0 && (
        <section>
          <h4>{t('Questions to ask before signing')}</h4>
          <ul className="ai-list">{result.questionsToAsk.map((q, i) => <li key={i}>{q}</li>)}</ul>
        </section>
      )}

      <p className="small muted" style={{ margin: 0 }}>
        <Icon name="shield" size={12} /> {t('This AI analysis is general information to help you understand the document. It is not legal advice — for important decisions, consult a lawyer.')}
      </p>
    </div>
  )
}

function ProUpsell({ reason }) {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const next = encodeURIComponent(pathname)
  return (
    <div className="center stack" style={{ gap: 12, padding: '6px 0' }}>
      <div className="feature-icon" style={{ margin: '0 auto' }}><Icon name="sparkles" size={22} /></div>
      <h3 style={{ margin: 0 }}>{t('Deep AI legal analysis')} <span className="badge badge-pro">Pro</span></h3>
      <p className="muted" style={{ margin: 0 }}>{t('Before you sign, AI reads the whole document and explains it in plain language: the key terms, risky clauses with the exact wording, missing protections and the questions to ask.')}</p>
      {reason === 'guest' ? (
        <>
          <p className="small muted" style={{ margin: 0 }}>{t('AI analysis is part of E1000Signer Pro. Create a free account or sign in to get started.')}</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link to={`/login?next=${next}`} className="btn btn-ghost">{t('Sign in')}</Link>
            <Link to={`/register?next=${next}`} className="btn btn-primary">{t('Create free account')}</Link>
          </div>
        </>
      ) : (
        <>
          <p className="small muted" style={{ margin: 0 }}>{t('Your current plan does not include AI analysis. Upgrade to Pro to unlock it.')}</p>
          <button className="btn btn-primary" disabled style={{ alignSelf: 'center' }}><Icon name="crown" size={16} /> {t('Upgrade to Pro — coming soon')}</button>
        </>
      )}
    </div>
  )
}

function ComingSoon() {
  const { t } = useI18n()
  return (
    <div className="center stack" style={{ gap: 12, padding: '6px 0' }}>
      <div className="feature-icon" style={{ margin: '0 auto' }}><Icon name="sparkles" size={22} /></div>
      <h3 style={{ margin: 0 }}>{t('Deep AI legal analysis')} <span className="badge badge-pro">Pro</span></h3>
      <p className="muted" style={{ margin: 0 }}>{t('Before you sign, AI reads the whole document and explains it in plain language: the key terms, risky clauses with the exact wording, missing protections and the questions to ask.')}</p>
      <span className="badge" style={{ alignSelf: 'center' }}>{t('Coming soon')}</span>
    </div>
  )
}

/**
 * "AI legal analysis" button + modal.
 * startPath: POST endpoint that starts/returns the analysis (owner document or signing link).
 */
export default function AiAnalysisButton({ startPath, variant = 'ghost', block = false }) {
  const { t, lang } = useI18n()
  const config = useServerConfig()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState({ phase: 'idle' }) // idle|soon|upsell|running|done|failed
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const poll = (id, started) => {
    timer.current = setTimeout(async () => {
      try {
        const { analysis } = await api(`/api/ai/analyses/${id}`)
        if (analysis.status === 'completed') return setState({ phase: 'done', result: analysis.result })
        if (analysis.status === 'failed') return setState({ phase: 'failed', error: analysis.error })
        setState({ phase: 'running', started })
        poll(id, started)
      } catch (e) {
        setState({ phase: 'failed', error: e.message })
      }
    }, 3000)
  }

  const start = async () => {
    setOpen(true)
    clearTimeout(timer.current)
    if (config && !config.aiEnabled) return setState({ phase: 'soon' })
    const started = Date.now()
    setState({ phase: 'running', started })
    try {
      const { analysis } = await api(startPath, { method: 'POST', body: { lang } })
      if (analysis.status === 'completed') setState({ phase: 'done', result: analysis.result })
      else if (analysis.status === 'failed') setState({ phase: 'failed', error: analysis.error })
      else poll(analysis.id, started)
    } catch (e) {
      if (e.code === 'AI_UNAVAILABLE') setState({ phase: 'soon' })
      else if (e.status === 401) setState({ phase: 'upsell', reason: 'guest' })
      else if (e.code === 'MISSING_PERMISSION') setState({ phase: 'upsell', reason: 'plan' })
      else setState({ phase: 'failed', error: e.message })
    }
  }

  const close = () => { clearTimeout(timer.current); setOpen(false) }

  return (
    <>
      <button type="button" className={`btn btn-${variant}${block ? ' btn-block' : ''} ai-btn`} onClick={start}>
        <Icon name="sparkles" size={16} /> {t('AI legal analysis')} <span className="badge badge-pro">Pro</span>
      </button>
      {open && (
        <Modal title={t('AI legal analysis')} onClose={close} width={state.phase === 'done' ? 860 : 560}>
          {state.phase === 'soon' && <ComingSoon />}
          {state.phase === 'upsell' && <ProUpsell reason={state.reason} />}
          {state.phase === 'running' && (
            <div className="center stack" style={{ gap: 12, padding: '18px 0' }}>
              <div className="spinner spinner-lg" style={{ margin: '0 auto' }} />
              <b>{t('Reading and analysing the document…')}</b>
              <p className="small muted" style={{ margin: 0 }}>{t('This usually takes under a minute; long contracts can take a few minutes. You can keep this window open.')}</p>
            </div>
          )}
          {state.phase === 'failed' && (
            <div className="stack">
              <div className="alert alert-error">{state.error || t('AI analysis failed')}</div>
              <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={start}><Icon name="refresh" size={15} /> {t('Try again')}</button>
            </div>
          )}
          {state.phase === 'done' && <AnalysisReport result={state.result} />}
        </Modal>
      )}
    </>
  )
}
