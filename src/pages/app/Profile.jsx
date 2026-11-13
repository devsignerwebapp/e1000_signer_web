import { useRef, useState } from 'react'
import { api } from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useT } from '../../i18n/index.jsx'
import { PageHead, useUsertypeLabel } from '../../components/Layout.jsx'
import LanguageSwitcher from '../../components/LanguageSwitcher.jsx'
import Avatar from '../../components/Avatar.jsx'
import Icon from '../../components/Icon.jsx'
import { squareAvatar } from '../../lib/image.js'
import { fmtDate } from '../../lib/format.js'

/** "My profile": photo, personal info, language, password, plan. Used at /app/profile and /admin/profile. */
export default function Profile() {
  const { user, setUser } = useAuth()
  const t = useT()
  const typeLabel = useUsertypeLabel()
  const toast = useToast()
  const fileRef = useRef(null)
  const [form, setForm] = useState({ fullName: user.fullName, company: user.company || '' })
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [busy, setBusy] = useState('')

  const saveProfile = async (e) => {
    e.preventDefault()
    setBusy('profile')
    try {
      const r = await api('/api/account/profile', { method: 'PATCH', body: { fullName: form.fullName, company: form.company || null } })
      setUser({ ...user, ...r.user })
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err)
    } finally {
      setBusy('')
    }
  }

  const uploadPhoto = async (file) => {
    if (!file) return
    setBusy('photo')
    try {
      const image = await squareAvatar(file)
      const r = await api('/api/account/avatar', { method: 'PUT', body: { image } })
      setUser({ ...user, avatarUrl: r.avatarUrl })
      toast.success('Profile photo updated')
    } catch (err) {
      toast.error(err.message ? err : t('Could not read this image'))
    } finally {
      setBusy('')
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const removePhoto = async () => {
    setBusy('photo')
    try {
      await api('/api/account/avatar', { method: 'DELETE' })
      setUser({ ...user, avatarUrl: null })
      toast.success('Profile photo removed')
    } catch (err) {
      toast.error(err)
    } finally {
      setBusy('')
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    if (pw.next !== pw.confirm) return toast.error(t('The new passwords do not match'))
    setBusy('password')
    try {
      await api('/api/account/password', { method: 'POST', body: { currentPassword: pw.current, newPassword: pw.next } })
      setPw({ current: '', next: '', confirm: '' })
      setUser({ ...user, passwordChangedAt: new Date().toISOString() })
      toast.success('Password changed')
    } catch (err) {
      toast.error(err)
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      <PageHead title={t('My profile')} subtitle={t('Manage your photo, personal details, language and password.')} />

      <div className="card glow-border profile-hero" style={{ marginBottom: 18 }}>
        <Avatar url={user.avatarUrl} name={user.fullName} size={88} />
        <div className="grow">
          <h2 style={{ margin: 0, fontSize: 22 }}>{user.fullName}</h2>
          <div className="muted">{user.email}</div>
          <div className="row mt-1" style={{ gap: 6 }}>
            <span className={`badge ${user.usertype === 'pro' ? 'badge-pro' : ''}`}>{typeLabel(user.usertype, user.usertypeName)}</span>
            {user.company && <span className="badge badge-muted">{user.company}</span>}
          </div>
        </div>
        <div className="row">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => uploadPhoto(e.target.files?.[0])} />
          <button className="btn btn-primary" disabled={busy === 'photo'} onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={16} /> {user.avatarUrl ? t('Change photo') : t('Upload photo')}
          </button>
          {user.avatarUrl && <button className="btn btn-ghost" disabled={busy === 'photo'} onClick={removePhoto}>{t('Remove')}</button>}
        </div>
      </div>

      <div className="grid grid-2">
        <form className="card" onSubmit={saveProfile}>
          <h3>{t('Personal information')}</h3>
          <div className="field"><label>{t('Email')}</label><input className="input" value={user.email} disabled /></div>
          <div className="field"><label htmlFor="fn">{t('Full name')}</label><input id="fn" className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} minLength={2} required /></div>
          <div className="field"><label htmlFor="co">{t('Company')}</label><input id="co" className="input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
          <div className="field">
            <label>{t('Language (interface & emails)')}</label>
            <div><LanguageSwitcher /></div>
          </div>
          <button className="btn btn-primary" disabled={busy === 'profile'}>{t('Save changes')}</button>
        </form>

        <form className="card" onSubmit={changePassword}>
          <h3>{t('Change password')}</h3>
          <div className="field"><label htmlFor="cp">{t('Current password')}</label><input id="cp" className="input" type="password" autoComplete="current-password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></div>
          <div className="field"><label htmlFor="np">{t('New password')}</label><input id="np" className="input" type="password" autoComplete="new-password" minLength={8} required placeholder={t('At least 8 characters')} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
          <div className="field"><label htmlFor="np2">{t('Confirm new password')}</label><input id="np2" className="input" type="password" autoComplete="new-password" minLength={8} required value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></div>
          <button className="btn btn-primary" disabled={busy === 'password'}><Icon name="lock" size={16} /> {t('Update password')}</button>
          <p className="small muted mt-1" style={{ marginBottom: 0 }}>{t('Last changed:')} {user.passwordChangedAt ? fmtDate(user.passwordChangedAt) : t('never')}</p>
        </form>
      </div>

      <div className="grid grid-2 mt-3">
        <div className="card">
          <h3>{t('Account')}</h3>
          <dl className="kv">
            <dt>{t('Member since')}</dt><dd>{fmtDate(user.createdAt)}</dd>
            <dt>{t('Last sign-in')}</dt><dd>{user.lastLoginAt ? fmtDate(user.lastLoginAt) : '—'}</dd>
            <dt>{t('Account type')}</dt><dd>{typeLabel(user.usertype, user.usertypeName)}</dd>
          </dl>
          <details className="mt-2">
            <summary className="small" style={{ cursor: 'pointer' }}>{t('Your permissions ({n})', { n: user.permissions.length })}</summary>
            <div className="row mt-1" style={{ gap: 6 }}>{user.permissions.map((p) => <span key={p} className="badge badge-muted mono">{p}</span>)}</div>
          </details>
        </div>
        {user.usertype !== 'pro' && user.usertype !== 'admin' ? (
          <div className="card">
            <div className="row" style={{ gap: 10 }}><span className="feature-icon" style={{ margin: 0, width: 38, height: 38 }}><Icon name="crown" size={18} /></span><h3 style={{ margin: 0 }}>{t('Pro is coming')}</h3></div>
            <p className="muted mt-1">{t("We're building advanced features for teams (bulk sending, custom branding, audit certificates). Free features stay free.")}</p>
            <button className="btn btn-ghost" disabled>{t('Upgrade — coming soon')}</button>
          </div>
        ) : (
          <div className="card">
            <h3>{t('Current plan')}</h3>
            <p className="muted" style={{ margin: 0 }}>{t('All core features are free: documents, templates, client links, API & webhooks.')}</p>
          </div>
        )}
      </div>
    </>
  )
}
