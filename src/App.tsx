import { VaultProvider, useVault } from './contexts/VaultContext'
import { useTheme } from './hooks/useTheme'
import LoginScreen from './components/LoginScreen'
import VaultUnlockScreen from './components/VaultUnlockScreen'
import Dashboard from './components/Dashboard'

function Gate() {
  const { authLoading, session, vaultReady, vaultKey } = useVault()

  if (authLoading || (session && !vaultReady)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-400 dark:bg-slate-900 dark:text-slate-500">
        Cargando…
      </div>
    )
  }

  if (!session) return <LoginScreen />
  if (!vaultKey) return <VaultUnlockScreen />
  return <Dashboard />
}

export default function App() {
  // Aplica la preferencia de claro/oscuro guardada en este navegador desde el primer render,
  // antes incluso de iniciar sesión (el botón para cambiarla vive en el Header, ya logueado).
  useTheme()

  return (
    <VaultProvider>
      <Gate />
    </VaultProvider>
  )
}
