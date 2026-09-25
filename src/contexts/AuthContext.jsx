import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as api from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    api
      .getCurrentProfile()
      .then((p) => alive && setProfile(p))
      .finally(() => alive && setReady(true))
    const off = api.onAuthChange((p) => alive && setProfile(p))
    return () => {
      alive = false
      off()
    }
  }, [])

  const signIn = useCallback(async (identifier, password) => {
    const p = await api.signIn(identifier, password)
    setProfile(p)
    return p
  }, [])

  const signOut = useCallback(async () => {
    await api.signOut()
    setProfile(null)
  }, [])

  const value = useMemo(() => ({ profile, ready, signIn, signOut, setProfile }), [profile, ready, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
