import { VaultProvider, useVault } from './contexts/VaultContext'
import LoginScreen from './components/LoginScreen'
import VaultUnlockScreen from './components/VaultUnlockScreen'
import Dashboard from './components/Dashboard'

function Gate() {
  const { authLoading, session, vaultReady, vaultKey } = useVault()

  if (authLoading || (session && !vaultReady)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
        Cargando…
      </div>
    )
  }

  if (!session) return <LoginScreen />
  if (!vaultKey) return <VaultUnlockScreen />
  return <Dashboard />
}

export default function App() {
  return (
    <VaultProvider>
      <Gate />
    </VaultProvider>
  )
}
