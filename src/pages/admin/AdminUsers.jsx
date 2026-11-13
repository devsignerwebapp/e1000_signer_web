import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useT } from '../../i18n/index.jsx'
import { Loading, PageHead, useUsertypeLabel } from '../../components/Layout.jsx'
import Avatar from '../../components/Avatar.jsx'
import Modal from '../../components/Modal.jsx'
import Icon from '../../components/Icon.jsx'
import { fmtDate, timeAgo } from '../../lib/format.js'

/** Create or edit a user. `user` = null → create. */
function UserForm({ user, types, onClose, onSaved }) {
  const t = useT()
  const typeLabel = useUsertypeLabel()
  const toast = useToast()
  const { user: me } = useAuth()
  const self = user?.id === me.id
  const assignable = types.filter((x) => x.code !== 'guest')
  const [f, setF] = useState(() => ({
    email: user?.email || '',
    fullName: user?.full_name || '',
    company: user?.company || '',
    usertypeId: user?.usertype_id || assignable.find((x) => x.code === 'user')?.id || assignable[0]?.id,
    isActive: user ? user.is_active : true,
    isVerified: user ? user.is_verified : true,
    password: '',
  }))
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (user) {
        const body = { fullName: f.fullName, company: f.company || null, isVerified: f.isVerified }
        if (!self) Object.assign(body, { usertypeId: Number(f.usertypeId), isActive: f.isActive })
        if (f.password) body.password = f.password
        await api(`/api/admin/users/${user.id}`, { method: 'PATCH', body })
        toast.success('User updated')
      } else {
        await api('/api/admin/users', { method: 'POST', body: { email: f.email, fullName: f.fullName, company: f.company || null, usertypeId: Number(f.usertypeId), isVerified: f.isVerified, password: f.password } })
        toast.success('User created')
      }
      onSaved()
    } catch (err) {
      toast.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={user ? t('Edit user') : t('Add user')} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="u-em">{t('Email')}</label><input id="u-em" className="input" type="email" required value={f.email} onChange={set('email')} disabled={!!user} /></div>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <div className="field"><label htmlFor="u-fn">{t('Full name')}</label><input id="u-fn" className="input" required minLength={2} value={f.fullName} onChange={set('fullName')} /></div>
          <div className="field"><label htmlFor="u-co">{t('Company')}</label><input id="u-co" className="input" value={f.company} onChange={set('company')} /></div>
        </div>
        <div className="field">
          <label htmlFor="u-ty">{t('User type')}</label>
          <select id="u-ty" className="select" value={f.usertypeId} onChange={set('usertypeId')} disabled={self}>
            {assignable.map((x) => <option key={x.id} value={x.id}>{typeLabel(x.code, x.name)}</option>)}
          </select>
          {self && <span className="small muted">{t('You cannot change your own role or status')}</span>}
        </div>
        <div className="field">
          <label htmlFor="u-pw">{user ? t('Set a new password') : t('Password')}</label>
          <input id="u-pw" className="input" type="password" autoComplete="new-password" minLength={8} required={!user} value={f.password} onChange={set('password')} placeholder={user ? t('Leave empty to keep the current password') : t('At least 8 characters')} />
        </div>
        <div className="row" style={{ gap: 20, marginBottom: 16 }}>
          {user && <label className="checkbox"><input type="checkbox" checked={f.isActive} onChange={set('isActive')} disabled={self} /> {t('Active')}</label>}
          <label className="checkbox"><input type="checkbox" checked={f.isVerified} onChange={set('isVerified')} /> {t('Email verified')}</label>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('Cancel')}</button>
          <button className="btn btn-primary" disabled={busy}><Icon name="check" size={16} /> {user ? t('Save changes') : t('Create user')}</button>
        </div>
      </form>
    </Modal>
  )
}

export default function AdminUsers() {
  const { user: me, can } = useAuth()
  const t = useT()
  const typeLabel = useUsertypeLabel()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [types, setTypes] = useState([])
  const [editing, setEditing] = useState(undefined) // undefined = closed, null = new user, object = edit
  const manage = can('admin.users.manage')

  const load = useCallback(() => {
    const p = new URLSearchParams({ page, limit: 50 })
    if (q) p.set('q', q)
    if (typeFilter) p.set('usertypeId', typeFilter)
    api(`/api/admin/users?${p}`).then(setData).catch(toast.error)
  }, [q, typeFilter, page, toast])
  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer) }, [load])
  useEffect(() => { api('/api/admin/rbac').then((d) => setTypes(d.usertypes)).catch(() => {}) }, [])

  const quickPatch = async (u, body) => {
    try {
      await api(`/api/admin/users/${u.id}`, { method: 'PATCH', body })
      toast.success('User updated')
      load()
    } catch (e) {
      toast.error(e)
    }
  }
  const remove = async (u) => {
    if (!confirm(t('Delete {email}? Their documents, templates and signatures will be permanently removed.', { email: u.email }))) return
    try {
      await api(`/api/admin/users/${u.id}`, { method: 'DELETE' })
      toast.success('User deleted')
      load()
    } catch (e) {
      toast.error(e)
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1
  return (
    <>
      <PageHead title={t('Users')} subtitle={t('Manage user types (roles) and account status.')}>
        {manage && <button className="btn btn-primary" onClick={() => setEditing(null)}><Icon name="plus" size={16} /> {t('Add user')}</button>}
      </PageHead>
      <div className="card card-tight row" style={{ marginBottom: 16 }}>
        <input className="input" style={{ maxWidth: 320 }} placeholder={t('Search name, email, company…')} value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
        <select className="select" style={{ maxWidth: 220 }} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}>
          <option value="">{t('All user types')}</option>
          {types.filter((x) => x.code !== 'guest').map((x) => <option key={x.id} value={x.id}>{typeLabel(x.code, x.name)}</option>)}
        </select>
        <span className="grow" />
        {data && <span className="small muted">{t('{n} users', { n: data.total })}</span>}
      </div>
      <div className="card" style={{ padding: 8 }}>
        {!data ? <Loading /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('User')}</th><th>{t('Type')}</th><th>{t('Status')}</th><th className="num">{t('Docs')}</th><th>{t('Last sign-in')}</th><th>{t('Joined')}</th>{manage && <th />}</tr></thead>
              <tbody>
                {data.users.map((u) => {
                  const self = u.id === me.id
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="row" style={{ gap: 10, flexWrap: 'nowrap' }}>
                          <Avatar url={u.avatar_url} name={u.full_name} size={34} />
                          <div><b>{u.full_name}</b>{self && <span className="badge" style={{ marginLeft: 6 }}>{t('you')}</span>}<div className="small muted">{u.email}{u.company ? ` · ${u.company}` : ''}</div></div>
                        </div>
                      </td>
                      <td>
                        {manage && !self ? (
                          <select className="select" style={{ padding: '6px 10px', fontSize: 13, width: 160 }} value={u.usertype_id} onChange={(e) => quickPatch(u, { usertypeId: Number(e.target.value) })} aria-label={t('User type')}>
                            {types.filter((x) => x.code !== 'guest').map((x) => <option key={x.id} value={x.id}>{typeLabel(x.code, x.name)}</option>)}
                          </select>
                        ) : <span className="badge">{typeLabel(u.usertype, u.usertype_name)}</span>}
                      </td>
                      <td>
                        <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                          {manage && !self && (
                            <label className="switch" title={u.is_active ? t('Active') : t('Disabled')}><input type="checkbox" checked={u.is_active} onChange={(e) => quickPatch(u, { isActive: e.target.checked })} /><span /></label>
                          )}
                          {!u.is_verified ? <span className="badge badge-warning">{t('Unverified')}</span> : u.is_active ? <span className="badge badge-success">{t('Active')}</span> : <span className="badge badge-danger">{t('Disabled')}</span>}
                        </div>
                      </td>
                      <td className="num">{u.documents}</td>
                      <td className="small muted">{u.last_login_at ? timeAgo(u.last_login_at) : t('never')}</td>
                      <td className="small muted">{fmtDate(u.created_at)}</td>
                      {manage && (
                        <td>
                          <div className="row" style={{ gap: 6, flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(u)}><Icon name="pen" size={14} /> {t('Edit')}</button>
                            {!self && <button className="btn btn-danger btn-sm" onClick={() => remove(u)} aria-label={t('Delete user')} title={t('Delete user')}><Icon name="trash" size={14} /></button>}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="row mt-2" style={{ justifyContent: 'center' }}>
        <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← {t('Prev')}</button>
        <span className="small muted">{t('Page {n} / {total}', { n: page, total: pages })}</span>
        <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>{t('Next')} →</button>
      </div>
      {editing !== undefined && <UserForm user={editing} types={types} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); load() }} />}
    </>
  )
}
