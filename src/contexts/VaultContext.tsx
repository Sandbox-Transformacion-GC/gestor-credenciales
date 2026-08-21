import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { createVaultCheck, unlockVault as unlockVaultKey } from '../lib/crypto'
import { useIdleLock } from '../hooks/useIdleLock'
import type { Profile } from '../types'

const IDLE_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutos de inactividad -> auto-bloqueo

interface VaultMetaRow {
  salt: string
  check_cipher: string
  check_iv: string
}

interface VaultContextValue {
  // sesión (login con email/contraseña vía Supabase Auth)
  session: Session | null
  authLoading: boolean
  profile: Profile | null
  profiles: Profile[]
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>

  // bóveda (desbloqueo con la clave maestra del equipo)
  vaultReady: boolean // ya sabemos si vault_meta existe o no
  vaultInitialized: boolean // true si ya hay una clave maestra configurada
  vaultKey: CryptoKey | null
  vaultLocked: boolean
  setupVault: (passphrase: string) => Promise<string | null>
  unlock: (passphrase: string) => Promise<string | null>
  lock: () => void
}

const VaultContext = createContext<VaultContextValue | undefined>(undefined)

export function VaultProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])

  const [vaultReady, setVaultReady] = useState(false)
  const [vaultMeta, setVaultMeta] = useState<VaultMetaRow | null>(null)
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null)

  // --- sesión de Supabase Auth ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (!newSession) {
        setVaultKey(null)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // --- cargar profiles + vault_meta una vez autenticado ---
  useEffect(() => {
    if (!session) {
      setProfile(null)
      setProfiles([])
      setVaultMeta(null)
      setVaultReady(false)
      return
    }

    let cancelled = false
    ;(async () => {
      const [{ data: profilesData }, { data: metaData }] = await Promise.all([
        supabase.from('profiles').select('id, email, full_name, role'),
        supabase.from('vault_meta').select('salt, check_cipher, check_iv').maybeSingle(),
      ])
      if (cancelled) return
      setProfiles(profilesData ?? [])
      setProfile((profilesData ?? []).find((p) => p.id === session.user.id) ?? null)
      setVaultMeta(metaData ?? null)
      setVaultReady(true)
    })()

    return () => {
      cancelled = true
    }
  }, [session])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return error.message
    return null
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setVaultKey(null)
  }, [])

  const setupVault = useCallback(
    async (passphrase: string) => {
      if (passphrase.length < 10) {
        return 'Usa una clave maestra de al menos 10 caracteres: la comparten las 3 personas y protege TODAS las contraseñas guardadas.'
      }
      const { salt, checkCipher, checkIv } = await createVaultCheck(passphrase)
      const { error } = await supabase.from('vault_meta').insert({
        id: true,
        salt,
        check_cipher: checkCipher,
        check_iv: checkIv,
        updated_by: session?.user.id,
      })
      if (error) return `No se pudo inicializar la bóveda: ${error.message}`

      const key = await unlockVaultKey(passphrase, salt, checkCipher, checkIv)
      setVaultMeta({ salt, check_cipher: checkCipher, check_iv: checkIv })
      setVaultKey(key)
      return null
    },
    [session],
  )

  const unlock = useCallback(
    async (passphrase: string) => {
      if (!vaultMeta) return 'La bóveda todavía no se ha inicializado.'
      const key = await unlockVaultKey(passphrase, vaultMeta.salt, vaultMeta.check_cipher, vaultMeta.check_iv)
      if (!key) return 'Clave maestra incorrecta.'
      setVaultKey(key)
      return null
    },
    [vaultMeta],
  )

  const lock = useCallback(() => setVaultKey(null), [])

  useIdleLock(lock, IDLE_TIMEOUT_MS, !!vaultKey)

  const value = useMemo<VaultContextValue>(
    () => ({
      session,
      authLoading,
      profile,
      profiles,
      isAdmin: profile?.role === 'admin',
      signIn,
      signOut,
      vaultReady,
      vaultInitialized: !!vaultMeta,
      vaultKey,
      vaultLocked: !vaultKey,
      setupVault,
      unlock,
      lock,
    }),
    [session, authLoading, profile, profiles, signIn, signOut, vaultReady, vaultMeta, vaultKey, setupVault, unlock, lock],
  )

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
}

export function useVault() {
  const ctx = useContext(VaultContext)
  if (!ctx) throw new Error('useVault debe usarse dentro de <VaultProvider>')
  return ctx
}
