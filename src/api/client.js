// Thin fetch wrapper. In dev, Vite proxies /api → http://localhost:4000.
import { getLang, translate } from '../i18n/index.jsx'

export const API_BASE = import.meta.env.VITE_API_URL || ''
const TOKEN_KEY = 'e1k_token'

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
  },
  set: (t) => {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t)
      else localStorage.removeItem(TOKEN_KEY)
    } catch { /* ignore */ }
  },
}

// Error codes whose server message is dynamic or worth localising.
const CODE_MESSAGES = {
  SERVER_UNREACHABLE: 'Cannot reach the E1000Signer server. Please make sure the API is running and try again.',
  INVALID_CREDENTIALS: 'Incorrect email or password',
  EMAIL_TAKEN: 'An account with this email already exists. Please sign in.',
  EMAIL_NOT_VERIFIED: 'Please confirm your email. We sent you a 4-digit code.',
  ACCOUNT_DISABLED: 'This account has been deactivated',
  OTP_INVALID: 'Incorrect code. Please try again.',
  OTP_EXPIRED: 'This code has expired. Please request a new one.',
  OTP_LOCKED: 'Too many attempts. Please request a new code.',
  OTP_MISSING: 'No active code. Please request a new one.',
  OTP_COOLDOWN: 'Please wait a moment before requesting a new code.',
  ALREADY_VERIFIED: 'This email is already verified. Please sign in.',
  INVALID_PDF: 'The file is not a valid PDF',
  ENCRYPTED_PDF: 'Password-protected PDFs are not supported',
  INVALID_FILE_TYPE: 'Only PDF files are accepted',
  PAYLOAD_TOO_LARGE: 'The file is too large',
  TOO_MANY_REQUESTS: 'Too many requests. Please try again later.',
  FIELD_REQUIRED: 'Please complete all required fields',
  SIGN_TYPE_NOT_ALLOWED: 'This signature type is not allowed for this document',
  MISSING_PERMISSION: 'You do not have permission to do this',
  WRONG_PASSWORD: 'Current password is incorrect',
  SAME_PASSWORD: 'The new password must be different',
  USERTYPE_IN_USE: 'Some users still have this type. Choose another type to move them to.',
}

export class ApiError extends Error {
  constructor(status, body) {
    const code = body?.error?.code || (status >= 502 && status <= 504 ? 'SERVER_UNREACHABLE' : undefined)
    const serverMsg = body?.error?.message
    // In English keep the precise server message (e.g. "4 attempts left"); otherwise localise by code.
    const msg = getLang() === 'en'
      ? serverMsg || (code && CODE_MESSAGES[code]) || `Request failed (${status})`
      : translate((code && CODE_MESSAGES[code]) || serverMsg || 'Request failed ({status})', { status })
    super(msg)
    this.status = status
    this.code = code
    this.details = body?.error?.details
  }
}

let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn }

export async function api(path, { method = 'GET', body, form, raw, headers = {} } = {}) {
  const token = tokenStore.get()
  const h = { 'X-Lang': getLang(), ...headers }
  if (token) h.Authorization = `Bearer ${token}`
  let payload
  if (form) payload = form
  else if (body !== undefined) {
    h['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, { method, headers: h, body: payload })
  } catch {
    throw new ApiError(503, { error: { code: 'SERVER_UNREACHABLE' } })
  }
  if (!res.ok) {
    let data = null
    try { data = await res.json() } catch { /* non-json (e.g. proxy error page) */ }
    if (res.status === 401 && token) onUnauthorized()
    throw new ApiError(res.status, data)
  }
  if (raw) return res
  if (res.status === 204) return null
  return res.json()
}

export const apiBlob = async (path, opts) => (await api(path, { ...opts, raw: true })).blob()
export const apiBuffer = async (path, opts) => (await api(path, { ...opts, raw: true })).arrayBuffer()

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export async function downloadFromApi(path, fallbackName = 'document.pdf') {
  const res = await api(path, { raw: true })
  const cd = res.headers.get('Content-Disposition') || ''
  const m = /filename="([^"]+)"/.exec(cd)
  saveBlob(await res.blob(), m ? decodeURIComponent(m[1]) : fallbackName)
}
