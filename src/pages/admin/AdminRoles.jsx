import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useT } from '../../i18n/index.jsx'
import { Loading, PageHead, useUsertypeLabel } from '../../components/Layout.jsx'
import Modal from '../../components/Modal.jsx'
import Icon from '../../components/Icon.jsx'

const LOCKED = new Set(['admin:admin.dashboard.view', 'admin:admin.rbac.manage'])

/** Create (usertype = null) or edit a user type. */
function TypeForm({ usertype, types, onClose, onSaved }) {
  const t = useT()
  const typeLabel = useUsertypeLabel()
  const toast = useToast()
  const [f, setF] = useState({
    code: usertype?.code || '',
    name: usertype?.name || '',
    description: usertype?.description || '',
    isPaid: usertype?.is_paid || false,
    copyFromId: usertype ? '' : String(types.find((x) => x.code === 'user')?.id || ''),
  })
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (usertype) {
        await api(`/api/admin/usertypes/${usertype.id}`, { method: 'PATCH', body: { name: f.name, description: f.description || null, isPaid: f.isPaid } })
        toast.success('User type updated')
      } else {
        await api('/api/admin/usertypes', { method: 'POST', body: { code: f.code, name: f.name, description: f.description || null, isPaid: f.isPaid, copyFromId: f.copyFromId ? Number(f.copyFromId) : null } })
        toast.success('User type created')
      }
      onSaved()
    } catch (err) {
      toast.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={usertype ? t('Edit user type') : t('New user type')} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <div className="field">
            <label htmlFor="ut-name">{t('Name')}</label>
            <input id="ut-name" className="input" required minLength={2} maxLength={64} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, code: usertype ? f.code : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32) })} placeholder={t('e.g. Team member')} />
          </div>
          <div className="field">
            <label htmlFor="ut-code">{t('Code')}</label>
            <input id="ut-code" className="input mono" required pattern="[a-z][a-z0-9_]{1,31}" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toLowerCase() })} disabled={!!usertype} placeholder="team_member" />
            {!usertype && <span className="small muted">{t('Lowercase letters, digits and _. Cannot be changed later.')}</span>}
          </div>
        </div>
        <div className="field"><label htmlFor="ut-desc">{t('Description')}</label><textarea id="ut-desc" className="textarea" style={{ minHeight: 70 }} maxLength={500} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        {!usertype && (
          <div className="field">
            <label htmlFor="ut-copy">{t('Start with the permissions of')}</label>
            <select id="ut-copy" className="select" value={f.copyFromId} onChange={(e) => setF({ ...f, copyFromId: e.target.value })}>
              <option value="">{t('No permissions (set them in the matrix)')}</option>
              {types.map((x) => <option key={x.id} value={x.id}>{typeLabel(x.code, x.name)}</option>)}
            </select>
          </div>
        )}
        <label className="checkbox" style={{ marginBottom: 16 }}><input type="checkbox" checked={f.isPaid} onChange={(e) => setF({ ...f, isPaid: e.target.checked })} /> {t('Paid plan')}</label>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('Cancel')}</button>
          <button className="btn btn-primary" disabled={busy}><Icon name="check" size={16} /> {usertype ? t('Save changes') : t('Create user type')}</button>
        </div>
      </form>
    </Modal>
  )
}

/** Delete a custom user type; when users still have it, pick a type to move them to. */
function DeleteType({ usertype, types, onClose, onDeleted }) {
  const t = useT()
  const typeLabel = useUsertypeLabel()
  const toast = useToast()
  const targets = types.filter((x) => x.id !== usertype.id && x.code !== 'guest')
  const [moveTo, setMoveTo] = useState(String(targets.find((x) => x.code === 'user')?.id || targets[0]?.id || ''))
  const [busy, setBusy] = useState(false)
  const del = async () => {
    setBusy(true)
    try {
      await api(`/api/admin/usertypes/${usertype.id}${usertype.user_count ? `?reassignTo=${moveTo}` : ''}`, { method: 'DELETE' })
      toast.success('User type deleted')
      onDeleted()
    } catch (err) {
      toast.error(err)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title={t('Delete user type')} onClose={onClose}>
      <p>{t('Delete the user type "{name}"? Its permission settings will be removed.', { name: usertype.name })}</p>
      {usertype.user_count > 0 && (
        <div className="field">
          <label htmlFor="mv">{t('{n} user(s) have this type. Move them to:', { n: usertype.user_count })}</label>
          <select id="mv" className="select" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
            {targets.map((x) => <option key={x.id} value={x.id}>{typeLabel(x.code, x.name)}</option>)}
          </select>
        </div>
      )}
      <div className="row mt-2" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>{t('Cancel')}</button>
        <button className="btn btn-danger" disabled={busy} onClick={del}><Icon name="trash" size={15} /> {t('Delete')}</button>
      </div>
    </Modal>
  )
}

export default function AdminRoles() {
  const { can } = useAuth()
  const t = useT()
  const typeLabel = useUsertypeLabel()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [form, setForm] = useState(undefined) // undefined closed · null new · object edit
  const [deleting, setDeleting] = useState(null)
  const editable = can('admin.rbac.manage')

  const load = useCallback(() => api('/api/admin/rbac').then(setData).catch(toast.error), [toast])
  useEffect(() => { load() }, [load])

  const granted = useMemo(() => new Set((data?.links || []).map((l) => `${l.usertype_id}:${l.permission_id}`)), [data])
  const groups = useMemo(() => {
    const g = {}
    for (const p of data?.permissions || []) (g[p.category] ||= []).push(p)
    return g
  }, [data])

  const toggle = async (ut, p, on) => {
    try {
      await api(`/api/admin/rbac/${ut.id}/${p.id}`, { method: 'PUT', body: { granted: on } })
      setData((d) => ({ ...d, links: on ? [...d.links, { usertype_id: ut.id, permission_id: p.id }] : d.links.filter((l) => !(l.usertype_id === ut.id && l.permission_id === p.id)) }))
      toast.success(on ? 'Granted {perm} for {type}' : 'Revoked {perm} for {type}', { perm: p.code, type: typeLabel(ut.code, ut.name) })
    } catch (e) {
      toast.error(e)
    }
  }
  const countFor = (ut) => data.links.filter((l) => l.usertype_id === ut.id).length

  if (!data) return <Loading />
  return (
    <>
      <PageHead title={t('Roles & permissions')} subtitle={t('The usertypes ⟷ permissions matrix stored in PostgreSQL. Changes apply within ~30 seconds.')}>
        {editable && <button className="btn btn-primary" onClick={() => setForm(null)}><Icon name="plus" size={16} /> {t('New user type')}</button>}
      </PageHead>
      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        {data.usertypes.map((u) => (
          <div key={u.id} className="card card-tight type-card">
            <div className="row-between"><b>{typeLabel(u.code, u.name)}</b>{u.is_paid && <span className="badge badge-pro">{t('Paid')}</span>}</div>
            <div className="mono muted small">{u.code}{u.builtin && ` · ${t('built-in')}`}</div>
            <p className="small muted" style={{ margin: '6px 0 0' }}>{u.description ? t(u.description) : '—'}</p>
            <div className="small mt-1">{t('{n} users', { n: u.user_count })} · {t('{n} permissions', { n: countFor(u) })}</div>
            {editable && (
              <div className="actions">
                <button className="btn btn-ghost btn-sm" onClick={() => setForm(u)}><Icon name="pen" size={13} /> {t('Edit')}</button>
                {!u.builtin && <button className="btn btn-danger btn-sm" onClick={() => setDeleting(u)}><Icon name="trash" size={13} /> {t('Delete')}</button>}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 8 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>{t('Permission')}</th>{data.usertypes.map((u) => <th key={u.id} className="center">{typeLabel(u.code, u.name)}</th>)}</tr>
            </thead>
            <tbody>
              {Object.entries(groups).map(([cat, perms]) => (
                <Fragment key={cat}>
                  <tr><td colSpan={data.usertypes.length + 1} style={{ background: 'rgba(91,108,255,.05)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-3)' }}>{cat}</td></tr>
                  {perms.map((p) => (
                    <tr key={p.id}>
                      <td><span className="mono">{p.code}</span><div className="small muted">{t(p.description)}</div></td>
                      {data.usertypes.map((u) => {
                        const on = granted.has(`${u.id}:${p.id}`)
                        const locked = LOCKED.has(`${u.code}:${p.code}`)
                        return (
                          <td key={u.id} className="center">
                            <label className="switch" title={locked ? t('Locked to prevent admin lockout') : ''}>
                              <input type="checkbox" checked={on} disabled={!editable || locked} onChange={(e) => toggle(u, p, e.target.checked)} aria-label={`${p.code} — ${typeLabel(u.code, u.name)}`} />
                              <span />
                            </label>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {form !== undefined && <TypeForm usertype={form} types={data.usertypes} onClose={() => setForm(undefined)} onSaved={() => { setForm(undefined); load() }} />}
      {deleting && <DeleteType usertype={deleting} types={data.usertypes} onClose={() => setDeleting(null)} onDeleted={() => { setDeleting(null); load() }} />}
    </>
  )
}
