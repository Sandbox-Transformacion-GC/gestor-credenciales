import { useVault } from '../contexts/VaultContext'
import { useTheme } from '../hooks/useTheme'

export default function Header({
  onOpenGenerator,
  onOpenAdmin,
  onOpenChangePassword,
}: {
  onOpenGenerator: () => void
  onOpenAdmin: () => void
  onOpenChangePassword: () => void
}) {
  const { profile, isAdmin, signOut, lock } = useVault()
  const { theme, toggle } = useTheme()

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur transition-colors dark:border-slate-700 dark:bg-slate-900/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔐</span>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Gestor de Credenciales</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {isAdmin && (
            <button
              onClick={onOpenAdmin}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              ⚙️ Configuración
            </button>
          )}
          <button
            onClick={onOpenGenerator}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            🎲 Generar contraseña
          </button>
          <button
            onClick={lock}
            title="Bloquear bóveda (mantiene la sesión)"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            🔒 Bloquear
          </button>
          <button
            onClick={onOpenChangePassword}
            title="Cambiar mi contraseña de acceso"
            className="flex items-center gap-2 rounded-lg pl-2 pr-1 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-200">
              {(profile?.full_name ?? '?').slice(0, 1).toUpperCase()}
            </div>
            <span className="hidden text-sm text-slate-600 dark:text-slate-300 sm:inline">{profile?.full_name}</span>
          </button>
          <button
            onClick={() => signOut()}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  )
}
