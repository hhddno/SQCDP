import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import { setApiAccessToken } from '../lib/api/authBridge'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  isConfigured: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const isConfigured = isSupabaseConfigured()

  useEffect(() => {
    if (!isConfigured) {
      setApiAccessToken(null)
      setLoading(false)
      return
    }
    const supabase = getSupabase()
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      setApiAccessToken(s?.access_token ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      setApiAccessToken(s?.access_token ?? null)
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [isConfigured])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await getSupabase().auth.signInWithPassword({ email, password })
      return { error: error?.message ?? null }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Erreur de connexion' }
    }
  }

  const signOut = async () => {
    await getSupabase().auth.signOut()
    setApiAccessToken(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut, isConfigured }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
