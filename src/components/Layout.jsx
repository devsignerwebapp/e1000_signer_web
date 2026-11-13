import { Suspense, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useT } from '../i18n/index.jsx'
import Icon from './Icon.jsx'
import LanguageSwitcher from './LanguageSwitcher.jsx'
import Avatar from './Avatar.jsx'

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="E1000Signer">
      <img src="/favicon.svg" className="brand-mark" alt="" />
      <span><b>E1000</b><i>Signer</i></span>
    </Link>
  )
}

const USERTYPE_LABELS = { guest: 'Guest', user: 'User', pro: 'Pro', admin: 'Administrator' }
export function useUsertypeLabel() {
  const t = useT()
  return (code, fallback) => (USERTYPE_LABELS[code] ? t(USERTYPE_LABELS[code]) : fallback || code)
}

export function Navbar() {
  const { user, logout, can } = useAuth()
  const t = useT()
  const [open, setOpen] = useState(false)
  return (
    <header className="nav">
      <div className="container">
        <Brand />
        <nav className={`nav-links${open ? ' open' : ''}`} onClick={() => setOpen(false)}>
          <NavLink to="/demo">{t('Try demo')}</NavLink>
          <NavLink to="/developers">{t('Developers')}</NavLink>
          <a href="/#pricing">{t('Pricing')}</a>
          {user && <NavLink to="/app">{t('Dashboard')}</NavLink>}
          {can('admin.dashboard.view') && <NavLink to="/admin">{t('Admin')}</NavLink>}
        </nav>
        <div className="row" style={{ gap: 8, marginLeft: 'auto', flexWrap: 'nowrap' }}>
          <LanguageSwitcher />
          {user ? (
            <>
              <Link to="/app/profile" className="nav-user" title={t('My profile')}><Avatar url={user.avatarUrl} name={user.fullName} size={30} /><span className="hide-sm">{user.fullName.split(' ')[0]}</span></Link>
              <button className="btn btn-ghost btn-sm" onClick={logout}><Icon name="logout" size={15} /> <span className="hide-sm">{t('Sign out')}</span></button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-text btn-sm hide-sm">{t('Sign in')}</Link>
              <Link to="/register" className="btn btn-primary btn-sm">{t('Get started')}</Link>
            </>
          )}
          <button className="btn btn-ghost btn-icon nav-burger" onClick={() => setOpen((o) => !o)} aria-label={t('Menu')}><Icon name="menu" /></button>
        </div>
      </div>
    </header>
  )
}

export function Footer() {
  const t = useT()
  return (
    <footer className="footer">
      <div className="container row-between">
        <span>© {new Date().getFullYear()} E1000Signer · {t('Free forever for core signing')}</span>
        <span className="row" style={{ gap: 18 }}>
          <Link to="/demo">{t('Demo')}</Link>
          <Link to="/developers">API</Link>
          <Link to="/register">{t('Create account')}</Link>
        </span>
      </div>
    </footer>
  )
}

export function Loading() {
  return <div className="loading-screen"><div className="spinner spinner-lg" /></div>
}

export function PublicLayout() {
  return (
    <>
      <Navbar />
      <main><Suspense fallback={<Loading />}><Outlet /></Suspense></main>
      <Footer />
    </>
  )
}

export function RequireAuth({ perm, children }) {
  const { user, loading, can } = useAuth()
  const t = useT()
  const typeLabel = useUsertypeLabel()
  const loc = useLocation()
  if (loading) return <Loading />
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  if (perm && !can(perm)) {
    return (
      <div className="container page">
        <div className="card empty">
          <div className="empty-icon"><Icon name="lock" size={28} /></div>
          <h2>{t('Access restricted')}</h2>
          <p>{t('Your account type ({type}) does not include the {perm} permission.', { type: typeLabel(user.usertype, user.usertypeName), perm })}</p>
          <Link className="btn btn-primary" to="/app">{t('Back to dashboard')}</Link>
        </div>
      </div>
    )
  }
  return children
}

function Shell({ sections }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        {sections.map((s) => (
          <div key={s.title}>
            <div className="sidebar-title">{s.title}</div>
            {s.links.filter((l) => !l.hidden).map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}>
                <Icon name={l.icon} /> {l.label}
              </NavLink>
            ))}
          </div>
        ))}
      </aside>
      <section className="shell-main"><Suspense fallback={<Loading />}><Outlet /></Suspense></section>
    </div>
  )
}

export function AppShell() {
  const { can } = useAuth()
  const t = useT()
  return (
    <Shell
      sections={[
        {
          title: t('Workspace'),
          links: [
            { to: '/app', end: true, icon: 'home', label: t('Overview') },
            { to: '/app/documents', icon: 'file', label: t('Documents') },
            { to: '/app/templates', icon: 'layout', label: t('Templates'), hidden: !can('template.create') },
          ],
        },
        {
          title: t('Build'),
          links: [
            { to: '/app/developers', icon: 'code', label: t('API & Webhooks'), hidden: !can('api.keys.manage') },
            { to: '/app/profile', icon: 'users', label: t('My profile') },
            { to: '/admin', icon: 'shield', label: t('Admin console'), hidden: !can('admin.dashboard.view') },
          ],
        },
      ]}
    />
  )
}

export function AdminShell() {
  const { can } = useAuth()
  const t = useT()
  return (
    <Shell
      sections={[
        {
          title: t('Admin console'),
          links: [
            { to: '/admin', end: true, icon: 'chart', label: t('Overview') },
            { to: '/admin/events', icon: 'list', label: t('Events'), hidden: !can('admin.events.view') },
            { to: '/admin/users', icon: 'users', label: t('Users') },
            { to: '/admin/roles', icon: 'shield', label: t('Roles & permissions') },
          ],
        },
        { title: t('Account'), links: [{ to: '/admin/profile', icon: 'users', label: t('My profile') }, { to: '/app', end: true, icon: 'home', label: t('My workspace') }] },
      ]}
    />
  )
}

export function PageHead({ title, subtitle, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="row">{children}</div>}
    </div>
  )
}
