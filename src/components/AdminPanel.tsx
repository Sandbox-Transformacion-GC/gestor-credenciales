import { useRef, useState } from 'react'
import type { Category } from '../types'
import { CATEGORY_COLOR_OPTIONS, categoryBadgeClasses } from '../lib/colors'
import type { useCategories } from '../hooks/useCategories'
import { modalCardClass, modalOverlayClass, primaryButtonClass, secondaryButtonClass } from '../lib/ui'
import { useEscapeToClose } from '../hooks/useEscapeToClose'
import { useBackup, ImportSummary } from '../hooks/useBackup'
import ConfirmDialog from './ConfirmDialog'

// Recibe las categorías y sus funciones desde afuera (una sola instancia compartida con el resto
// de la app, en vez de que este panel tenga su propia copia separada) — así, apenas agregas o
// borras una categoría aquí, el filtro y el formulario de credenciales se enteran al instante,
// sin depender de Realtime ni de recargar la página.
export default function AdminPanel({
  categoriesApi,
  currentUserId,
  currentUserEmail,
  onClose,
}: {
  categoriesApi: ReturnType<typeof useCategories>
  currentUserId: string
  currentUserEmail: string | undefined
  onClose: () => void
}) {
  const { categories, loading, create, rename, move, remove } = categoriesApi
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState<string>('slate')
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null)

  const { working, exportBackup, importBackup } = useBackup(currentUserEmail)
  const [backupError, setBackupError] = useState<string | null>(null)
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEscapeToClose(onClose)

  const handleExport = async () => {
    setBackupError(null)
    const err = await exportBackup()
    if (err) setBackupError(err)
  }

  const handleImportFile = async (file: File) => {
    setBackupError(null)
    setImportSummary(null)
    const { error: err, summary } = await importBackup(file, currentUserId)
    if (err) setBackupError(err)
    else setImportSummary(summary)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setError(null)
    const err = await create(newName.trim(), newColor)
    if (err) setError(err)
    else {
      setNewName('')
      setNewColor('slate')
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    const err = await remove(pendingDelete.id)
    if (err) setError(err)
    setPendingDelete(null)
  }

  return (
    <div className={`${modalOverlayClass} py-8`}>
      <div className={`max-h-full w-full max-w-lg overflow-y-auto p-6 ${modalCardClass}`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">⚙️ Configuración</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
            ✕
          </button>
        </div>

        <h4 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Categorías</h4>

        {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

        {loading ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Cargando…</p>
        ) : (
          <ul className="mb-4 space-y-1.5">
            {categories.map((c, i) => (
              <li key={c.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                <div className="flex flex-col">
                  <button
                    disabled={i === 0}
                    onClick={() => move(c.id, 'up')}
                    className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-20 dark:text-slate-500 dark:hover:text-slate-200"
                  >
                    ▲
                  </button>
                  <button
                    disabled={i === categories.length - 1}
                    onClick={() => move(c.id, 'down')}
                    className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-20 dark:text-slate-500 dark:hover:text-slate-200"
                  >
                    ▼
                  </button>
                </div>

                {editingId === c.id ? (
                  <EditRow
                    category={c}
                    onCancel={() => setEditingId(null)}
                    onSave={async (name, color) => {
                      const err = await rename(c.id, name, color)
                      if (err) setError(err)
                      else setEditingId(null)
                    }}
                  />
                ) : (
                  <>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${categoryBadgeClasses(c.color)}`}>
                      {c.name}
                    </span>
                    <div className="ml-auto flex gap-1">
                      <button
                        onClick={() => setEditingId(c.id)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-slate-700"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setPendingDelete(c)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-slate-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-600">
          <label htmlFor="new-category-name" className="mb-2 block text-xs font-medium text-slate-700 dark:text-slate-300">
            Nueva categoría
          </label>
          <div className="flex gap-2">
            <input
              id="new-category-name"
              name="new-category-name"
              autoComplete="off"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
            <label htmlFor="new-category-color" className="sr-only">
              Color de la nueva categoría
            </label>
            <select
              id="new-category-color"
              name="new-category-color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              {CATEGORY_COLOR_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button onClick={handleCreate} className={primaryButtonClass}>
              Agregar
            </button>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
          <h4 className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-200">Copia de seguridad</h4>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            Exporta un archivo con toda la bóveda (por si Supabase llegara a fallar o perder datos).
            Las contraseñas quedan en el archivo <strong>tal como están cifradas</strong> — nunca en
            texto plano — así que es tan seguro como la base de datos misma, pero igual guárdalo en
            un lugar de confianza.
          </p>

          {backupError && (
            <p className="mb-2 rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{backupError}</p>
          )}
          {importSummary && (
            <div className="mb-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              <p>
                ✓ Restauradas {importSummary.imported} credenciales
                {importSummary.skippedCategories > 0 && ` (${importSummary.skippedCategories} categorías ya existían)`}.
              </p>
              {importSummary.warnings.length > 0 && (
                <ul className="mt-1 list-disc pl-4">
                  {importSummary.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button onClick={handleExport} disabled={working} className={secondaryButtonClass}>
              {working ? 'Procesando…' : '⬇️ Exportar copia de seguridad'}
            </button>

            <label htmlFor="backup-import-file" className={`${secondaryButtonClass} cursor-pointer`}>
              ⬆️ Restaurar desde copia
            </label>
            <input
              id="backup-import-file"
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              disabled={working}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImportFile(file)
              }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
            Restaurar AGREGA las credenciales del archivo (no borra ni reemplaza lo que ya tienes) —
            úsalo solo para recuperación ante desastres.
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className={secondaryButtonClass}>
            Cerrar
          </button>
        </div>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Eliminar categoría"
          message={`¿Eliminar la categoría "${pendingDelete.name}"? Las credenciales que ya la usan conservan el texto, pero dejará de aparecer como opción.`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}

function EditRow({
  category,
  onSave,
  onCancel,
}: {
  category: Category
  onSave: (name: string, color: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(category.name)
  const [color, setColor] = useState(category.color)
  return (
    <div className="flex flex-1 gap-2">
      <label htmlFor={`edit-category-name-${category.id}`} className="sr-only">
        Nombre de la categoría
      </label>
      <input
        id={`edit-category-name-${category.id}`}
        name={`edit-category-name-${category.id}`}
        autoComplete="off"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      />
      <label htmlFor={`edit-category-color-${category.id}`} className="sr-only">
        Color de la categoría
      </label>
      <select
        id={`edit-category-color-${category.id}`}
        name={`edit-category-color-${category.id}`}
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      >
        {CATEGORY_COLOR_OPTIONS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <button onClick={() => onSave(name, color)} className="text-xs font-medium text-brand-600 dark:text-brand-400">
        Guardar
      </button>
      <button onClick={onCancel} className="text-xs text-slate-400 dark:text-slate-500">
        Cancelar
      </button>
    </div>
  )
}
