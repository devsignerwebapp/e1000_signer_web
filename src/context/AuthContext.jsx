import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setUnauthorizedHandler, tokenStore } from '../api/client.js'
import { getLang } from '../i18n/index.jsx'

const AuthContext = createContext(null)

// Keep the account's email language in sync with the UI language.
const syncLocale = (user) => {
  if (user && user.locale !== getLang()) api('/api/account/profile', { method: 'PATCH', body: { locale: getLang() } }).catch(() => {})
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => !!tokenStore.get())

  const logout = useCallback(() => {
    tokenStore.set(null)
    setUser(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    if (!tokenStore.get()) return
    api('/api/auth/me')
      .then((d) => { setUser(d.user); syncLocale(d.user) })
      .catch(() => tokenStore.set(null))
      .finally(() => setLoading(false))
  }, [logout])

  const applySession = useCallback(({ token, user }) => {
    tokenStore.set(token)
    setUser(user)
    syncLocale(user)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      applySession,
      logout,
      setUser,
      can: (perm) => !!user?.permissions?.includes(perm),
    }),
    [user, loading, applySession, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export const useAuth = () => useContext(AuthContext)
