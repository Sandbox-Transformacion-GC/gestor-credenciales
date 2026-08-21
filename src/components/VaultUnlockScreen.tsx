import { FormEvent, useState } from 'react'
import { useVault } from '../contexts/VaultContext'

export default function VaultUnlockScreen() {
  const { vaultInitialized, setupVault, unlock, signOut, profile } = useVault()
  const [passphrase, setPassphrase] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!vaultInitialized && passphrase !== confirm) {
      setError('Las dos claves no coinciden.')
      return
    }

    setLoading(true)
    const err = vaultInitialized ? await unlock(passphrase) : await setupVault(passphrase)
    setLoading(false)
    if (err) setError(err)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-slate-900">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg dark:bg-slate-800">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl dark:bg-amber-950">
            🔒
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {vaultInitialized ? 'Desbloquear bóveda' : 'Configurar bóveda por primera vez'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Hola {profile?.full_name ?? ''}. {vaultInitialized
              ? 'Ingresa la clave maestra del equipo para ver las contraseñas.'
              : 'Aún no existe una clave maestra. Créala ahora: la usarán las 3 personas.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="vault-passphrase" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Clave maestra del equipo
            </label>
            <input
              id="vault-passphrase"
              name="vault-passphrase"
              type="password"
              required
              autoFocus
              autoComplete="off"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              placeholder="Frase larga y fácil de recordar entre los 3"
            />
          </div>

          {!vaultInitialized && (
            <div>
              <label htmlFor="vault-passphrase-confirm" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Confirmar clave maestra
              </label>
              <input
                id="vault-passphrase-confirm"
                name="vault-passphrase-confirm"
                type="password"
                required
                autoComplete="off"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          {!vaultInitialized && (
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              ⚠️ Esta clave <strong>no se guarda en ningún lado</strong>: cifra las contraseñas en tu
              navegador. Compártela con las otras 2 personas por un medio seguro (en persona, llamada).
              Si se pierde, las contraseñas guardadas <strong>no se podrán recuperar</strong>.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? 'Procesando…' : vaultInitialized ? 'Desbloquear' : 'Crear clave maestra'}
          </button>
        </form>

        <button
          onClick={() => signOut()}
          className="mt-4 w-full text-center text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
