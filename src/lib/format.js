import { formatDate, getLocale, translate as t } from '../i18n/index.jsx'

export const fmtDate = (d) => (d ? formatDate(d, 'datetime') : '—')
export const fmtDay = (d) => (d ? formatDate(d, 'day') : '—')
export const fmtBytes = (b) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`)
export const fmtNum = (n) => new Intl.NumberFormat(getLocale()).format(n ?? 0)

export function timeAgo(d) {
  const s = (Date.now() - new Date(d).getTime()) / 1000
  if (s < 60) return t('just now')
  if (s < 3600) return t('{n}m ago', { n: Math.floor(s / 60) })
  if (s < 86400) return t('{n}h ago', { n: Math.floor(s / 3600) })
  if (s < 604800) return t('{n}d ago', { n: Math.floor(s / 86400) })
  return fmtDay(d)
}

const EVENT_LABELS = {
  'auth.registered': 'Account created',
  'auth.verified': 'Email verified',
  'auth.login': 'Signed in',
  'auth.login_failed': 'Failed sign-in',
  'auth.password_reset': 'Password reset',
  'document.uploaded': 'Document uploaded',
  'document.signed': 'Document signed',
  'document.deleted': 'Document deleted',
  'template.created': 'Template created',
  'template.updated': 'Template updated',
  'template.deleted': 'Template deleted',
  'template.sent': 'Signing link emailed',
  'template.link_rotated': 'Share link rotated',
  'submission.created': 'Client signed',
  'submission.link_opened': 'Signing link opened',
  'api.request': 'API request',
  'api.key_created': 'API key created',
  'api.key_revoked': 'API key revoked',
  'api.webhook_set': 'Webhook configured',
  'api.webhook_removed': 'Webhook removed',
  'api.webhook_delivered': 'Webhook delivered',
  'api.webhook_failed': 'Webhook failed',
  'demo.signed': 'Demo signature',
  'admin.user_updated': 'User updated by admin',
  'admin.rbac_changed': 'Permission changed',
  'admin.user_created': 'User created by admin',
  'admin.user_deleted': 'User deleted by admin',
  'admin.usertype_created': 'User type created',
  'admin.usertype_updated': 'User type updated',
  'admin.usertype_deleted': 'User type deleted',
  'auth.password_changed': 'Password changed',
  'auth.avatar_changed': 'Profile photo changed',
}
export const eventLabel = (type) => (EVENT_LABELS[type] ? t(EVENT_LABELS[type]) : type)

export const CATEGORY_BADGE = { auth: 'badge', document: 'badge badge-success', template: 'badge', submission: 'badge badge-success', api: 'badge badge-muted', admin: 'badge badge-warning', demo: 'badge badge-muted' }
