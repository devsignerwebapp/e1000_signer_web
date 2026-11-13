import { API_BASE } from '../api/client.js'

const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((p) => p[0] || '').join('').toUpperCase() || '?'

/** Round profile photo, or coloured initials when the user has no photo. */
export default function Avatar({ url, name, size = 36, className = '' }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) }
  return url ? (
    <img src={`${API_BASE}${url}`} alt="" className={`avatar ${className}`} style={style} />
  ) : (
    <span className={`avatar avatar-initials ${className}`} style={style} aria-hidden>{initials(name)}</span>
  )
}
