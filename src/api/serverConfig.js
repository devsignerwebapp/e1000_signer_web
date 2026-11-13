import { useEffect, useState } from 'react'
import { api } from './client.js'

// Server feature flags (GET /api/public/config), fetched once per page load.
// { mailEnabled, passwordReset, otpFallbackCode }
const DEFAULTS = { mailEnabled: true, passwordReset: true, otpFallbackCode: null }
let cache = null
let pending = null

export function loadServerConfig() {
  if (cache) return Promise.resolve(cache)
  pending ||= api('/api/public/config')
    .then((c) => (cache = { ...DEFAULTS, ...c }))
    .catch(() => DEFAULTS) // unreachable server → assume normal behaviour; errors surface elsewhere
    .finally(() => { pending = null })
  return pending
}

/** Returns the server config, or null while it is loading. */
export function useServerConfig() {
  const [config, setConfig] = useState(cache)
  useEffect(() => {
    if (cache) return
    let alive = true
    loadServerConfig().then((c) => alive && setConfig(c))
    return () => { alive = false }
  }, [])
  return config
}
