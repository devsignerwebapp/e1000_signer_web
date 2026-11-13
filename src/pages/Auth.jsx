import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useI18n } from '../i18n/index.jsx'
import OtpInput from '../components/OtpInput.jsx'
import Icon from '../components/Icon.jsx'

function useNext() {
  const [sp] = useSearchParams()
  const next = sp.get('next')
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/app'
}

function useCountdown(initial = 0) {
  const [left, setLeft] = useState(initial)
  useEffect(() => {
    if (left <= 0) return
    const timer = setTimeout(() => setLeft((l) => l - 1), 1000)
    return () => clearTimeout(timer)
  }, [left])
  return [left, setLeft]
}

/** Step 2 of registration (also used when an unverified user signs in). */
function VerifyStep({ email, onBack, initialCooldown = 60 }) {
  const { applySession } = useAuth()
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const next = useNext()
  const toast = useToast()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [left, setLeft] = useCountdown(initialCooldown)

  const verify = async (c = code) => {
    if (c.length !== 4) return
    setBusy(true)
    setError('')
    try {
      applySession(await api('/api/auth/verify-otp', { method: 'POST', body: { email, code: c } }))
      toast.success('Email confirmed — welcome aboard!')
      navigate(next, { replace: true })
    } catch (e) {
      setError(e.message)
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    try {
      const r = await api('/api/auth/resend-otp', { method: 'POST', body: { email, locale: lang } })
      setLeft(r.resendAfter || 60)
      toast.success('A new code is on its way')
    } catch (e) {
      if (e.details?.retryAfter) setLeft(e.details.retryAfter)
      toast.error(e)
    }
  }

  return (
    <div className="center">
      <div className="empty-icon"><Icon name="mail" size={28} /></div>
      <h1>{t('Check your inbox')}</h1>
      <p className="muted">{t('We sent a 4-digit code to')} <b style={{ color: 'var(--ink)' }}>{email}</b></p>
      <OtpInput value={code} onChange={setCode} onComplete={verify} disabled={busy} />
      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
      <button className="btn btn-primary btn-block btn-lg" disabled={busy || code.length !== 4} onClick={() => verify()}>
        {busy ? t('Verifying…') : t('Verify & continue')}
      </button>
      <p className="small muted mt-2">
        {t("Didn't get it?")} {left > 0 ? t('Resend in {n}s', { n: left }) : <button className="btn btn-text btn-sm" onClick={resend}>{t('Resend code')}</button>}
        {onBack && <> · <button className="btn btn-text btn-sm" onClick={onBack}>{t('Change email')}</button></>}
      </p>
    </div>
  )
}

export function Register() {
  const toast = useToast()
  const { t, lang } = useI18n()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', company: '' })
  const [step, setStep] = useState('form')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(60)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const r = await api('/api/auth/register', { method: 'POST', body: { ...form, company: form.company || undefined, locale: lang } })
      if (!r.emailSent) toast.error('We could not send the email right now — try "Resend code" shortly.')
      setCooldown(r.resendAfter || 60)
      setStep('verify')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card glow-border">
        {step === 'verify' ? (
          <VerifyStep email={form.email.trim().toLowerCase()} onBack={() => setStep('form')} initialCooldown={cooldown} />
        ) : (
          <form onSubmit={submit}>
            <h1>{t('Create your account')}</h1>
            <p className="muted">{t("Free forever. We'll email you a 4-digit code to confirm.")}</p>
            <div className="field"><label htmlFor="fn">{t('Full name')}</label><input id="fn" className="input" required minLength={2} value={form.fullName} onChange={set('fullName')} autoComplete="name" /></div>
            <div className="field"><label htmlFor="em">{t('Email')}</label><input id="em" className="input" type="email" required value={form.email} onChange={set('email')} autoComplete="email" /></div>
            <div className="field"><label htmlFor="pw">{t('Password')}</label><input id="pw" className="input" type="password" required minLength={8} value={form.password} onChange={set('password')} autoComplete="new-password" placeholder={t('At least 8 characters')} /></div>
            <div className="field"><label htmlFor="co">{t('Company')} <span className="muted">({t('optional')})</span></label><input id="co" className="input" value={form.company} onChange={set('company')} autoComplete="organization" /></div>
            {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
            <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? t('Creating…') : t('Create account')}</button>
            <p className="small muted center mt-2">{t('Already have an account?')} <Link to="/login">{t('Sign in')}</Link></p>
          </form>
        )}
      </div>
    </div>
  )
}

export function Login() {
  const { applySession, user } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const next = useNext()
  const [form, setForm] = useState({ email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [verifyEmail, setVerifyEmail] = useState(null)

  useEffect(() => { if (user) navigate(next, { replace: true }) }, [user, next, navigate])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      applySession(await api('/api/auth/login', { method: 'POST', body: form }))
    } catch (err) {
      if (err.code === 'EMAIL_NOT_VERIFIED') setVerifyEmail(err.details?.email || form.email)
      else setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card glow-border">
        {verifyEmail ? (
          <VerifyStep email={verifyEmail} onBack={() => setVerifyEmail(null)} />
        ) : (
          <form onSubmit={submit}>
            <h1>{t('Welcome back')}</h1>
            <p className="muted">{t('Sign in to your E1000Signer workspace.')}</p>
            <div className="field"><label htmlFor="em">{t('Email')}</label><input id="em" className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" /></div>
            <div className="field">
              <div className="row-between"><label htmlFor="pw">{t('Password')}</label><Link to="/forgot-password" className="small">{t('Forgot?')}</Link></div>
              <input id="pw" className="input" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" />
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
            <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? t('Signing in…') : t('Sign in')}</button>
            <p className="small muted center mt-2">{t('New here?')} <Link to="/register">{t('Create a free account')}</Link> · <Link to="/demo">{t('Try demo')}</Link></p>
          </form>
        )}
      </div>
    </div>
  )
}

export function ForgotPassword() {
  const { applySession } = useAuth()
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const request = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api('/api/auth/forgot-password', { method: 'POST', body: { email, locale: lang } })
      setStep('reset')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const reset = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      applySession(await api('/api/auth/reset-password', { method: 'POST', body: { email, code, password } }))
      toast.success('Password updated')
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card glow-border">
        {step === 'email' ? (
          <form onSubmit={request}>
            <h1>{t('Reset password')}</h1>
            <p className="muted">{t("Enter your email and we'll send you a 4-digit code.")}</p>
            <div className="field"><label htmlFor="em">{t('Email')}</label><input id="em" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
            <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{t('Send code')}</button>
            <p className="small muted center mt-2"><Link to="/login">{t('Back to sign in')}</Link></p>
          </form>
        ) : (
          <form onSubmit={reset}>
            <h1>{t('Enter code')}</h1>
            <p className="muted">{t('If an account exists for {email}, a code has been sent.', { email })}</p>
            <OtpInput value={code} onChange={setCode} />
            <div className="field"><label htmlFor="np">{t('New password')}</label><input id="np" className="input" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></div>
            {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
            <button className="btn btn-primary btn-block btn-lg" disabled={busy || code.length !== 4}>{t('Update password')}</button>
          </form>
        )}
      </div>
    </div>
  )
}
