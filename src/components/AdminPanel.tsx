import { useState } from 'react'
import type { Category } from '../types'
import { CATEGORY_COLOR_OPTIONS, categoryBadgeClasses } from '../lib/colors'
import { useCategories } from '../hooks/useCategories'

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const { categories, loading, create, rename, move, remove } = useCategories()
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState<string>('slate')
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

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

  const handleDelete = async (c: Category) => {
    if (!confirm(`¿Eliminar la categoría "${c.name}"? Las credenciales que ya la usan conservan el texto, pero dejará de aparecer como opción.`)) return
    const err = await remove(c.id)
    if (err) setError(err)
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">⚙️ Configuración — Categorías</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

        {loading ? (
          <p className="text-sm text-slate-400">Cargando…</p>
        ) : (
          <ul className="mb-4 space-y-1.5">
            {categories.map((c, i) => (
              <li key={c.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <div className="flex flex-col">
                  <button
                    disabled={i === 0}
                    onClick={() => move(c.id, 'up')}
                    className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-20"
                  >
                    ▲
                  </button>
                  <button
                    disabled={i === categories.length - 1}
                    onClick={() => move(c.id, 'down')}
                    className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-20"
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
                        className="rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
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

        <div className="rounded-lg border border-dashed border-slate-300 p-3">
          <p className="mb-2 text-xs font-medium text-slate-700">Nueva categoría</p>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
            <select
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              {CATEGORY_COLOR_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              onClick={handleCreate}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Agregar
            </button>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      </div>
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
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm"
      />
      <select value={color} onChange={(e) => setColor(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1 text-sm">
        {CATEGORY_COLOR_OPTIONS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <button onClick={() => onSave(name, color)} className="text-xs font-medium text-brand-600">
        Guardar
      </button>
      <button onClick={onCancel} className="text-xs text-slate-400">
        Cancelar
      </button>
    </div>
  )
}
