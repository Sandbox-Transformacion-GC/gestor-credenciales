import { DragEvent, useMemo, useRef, useState } from 'react'
import { useVault } from '../contexts/VaultContext'
import { useCredentials } from '../hooks/useCredentials'
import { useCategories } from '../hooks/useCategories'
import { useViewMode } from '../hooks/useViewMode'
import Header from './Header'
import Toolbar, { defaultFilters, Filters } from './Toolbar'
import CredentialCard from './CredentialCard'
import CredentialListRow from './CredentialListRow'
import CredentialFormModal from './CredentialFormModal'
import PasswordGeneratorModal from './PasswordGeneratorModal'
import AdminPanel from './AdminPanel'
import ChangePasswordModal from './ChangePasswordModal'
import ConfirmDialog from './ConfirmDialog'
import type { Credential, CredentialFormValues } from '../types'

export default function Dashboard() {
  const { vaultKey, profile, profiles, isAdmin, session } = useVault()
  const { credentials, loading, error, reveal, hide, create, update, toggleFavorite, remove, reorder } =
    useCredentials(vaultKey, session?.user.id)
  const { categories } = useCategories()
  const { viewMode, setViewMode } = useViewMode()

  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Credential | null>(null)
  const [showGenerator, setShowGenerator] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Credential | null>(null)
  const dragId = useRef<string | null>(null)

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    let list = credentials.filter((c) => {
      if (filters.category !== 'Todas' && c.category !== filters.category) return false
      if (filters.ownerId !== 'Todos' && c.owner_id !== filters.ownerId) return false
      if (filters.onlyFavorites && !c.is_favorite) return false
      if (q) {
        const haystack = `${c.title} ${c.email} ${c.linked_to ?? ''} ${c.notes ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })

    list = [...list].sort((a, b) => {
      if (filters.sortBy === 'title_asc') return a.title.localeCompare(b.title)
      if (filters.sortBy === 'created_desc') return b.created_at.localeCompare(a.created_at)
      if (filters.sortBy === 'custom') {
        if (a.position !== null && b.position !== null) return a.position - b.position
        if (a.position !== null) return -1
        if (b.position !== null) return 1
        return b.updated_at.localeCompare(a.updated_at)
      }
      return b.updated_at.localeCompare(a.updated_at)
    })

    return list
  }, [credentials, filters])

  const openNew = () => {
    setEditing(null)
    setShowForm(true)
  }

  const openEdit = async (c: Credential) => {
    if (c.password === null) {
      const plain = await reveal(c.id)
      setEditing({ ...c, password: plain })
    } else {
      setEditing(c)
    }
    setShowForm(true)
  }

  const handleSave = async (values: CredentialFormValues, canEditSharing: boolean) => {
    if (editing) return update(editing.id, values, canEditSharing)
    return create(values)
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    await remove(pendingDelete.id)
    setPendingDelete(null)
  }

  // Arrastrar y soltar para reordenar (solo activo cuando el filtro de orden es "custom");
  // funciona igual en la vista de tarjetas y en la de lista.
  const dragEnabled = filters.sortBy === 'custom'

  const handleDragStart = (id: string) => (e: DragEvent<HTMLDivElement>) => {
    dragId.current = id
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDrop = (targetId: string) => async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const sourceId = dragId.current
    dragId.current = null
    if (!sourceId || sourceId === targetId) return

    const ids = filtered.map((c) => c.id)
    const from = ids.indexOf(sourceId)
    const to = ids.indexOf(targetId)
    if (from === -1 || to === -1) return
    ids.splice(from, 1)
    ids.splice(to, 0, sourceId)
    await reorder(ids)
  }

  return (
    <div className="min-h-screen">
      <Header
        onOpenGenerator={() => setShowGenerator(true)}
        onOpenAdmin={() => setShowAdmin(true)}
        onOpenChangePassword={() => setShowChangePassword(true)}
      />

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Toolbar
          filters={filters}
          onChange={setFilters}
          profiles={profiles}
          categories={categories}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          total={credentials.length}
          shown={filtered.length}
          onAdd={openNew}
        />

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>
        )}

        {loading ? (
          <p className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">Cargando credenciales…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
            {credentials.length === 0
              ? 'Todavía no hay credenciales guardadas. Crea la primera con "+ Nueva credencial".'
              : 'Ningún resultado coincide con los filtros actuales.'}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <CredentialCard
                key={c.id}
                credential={c}
                profiles={profiles}
                categories={categories}
                currentUserId={profile?.id}
                isAdmin={isAdmin}
                draggable={dragEnabled}
                onDragStart={handleDragStart(c.id)}
                onDragOver={handleDragOver}
                onDrop={handleDrop(c.id)}
                onReveal={(id) => reveal(id)}
                onHide={hide}
                onEdit={openEdit}
                onDelete={setPendingDelete}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => (
              <CredentialListRow
                key={c.id}
                credential={c}
                profiles={profiles}
                categories={categories}
                currentUserId={profile?.id}
                isAdmin={isAdmin}
                draggable={dragEnabled}
                onDragStart={handleDragStart(c.id)}
                onDragOver={handleDragOver}
                onDrop={handleDrop(c.id)}
                onReveal={(id) => reveal(id)}
                onHide={hide}
                onEdit={openEdit}
                onDelete={setPendingDelete}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <CredentialFormModal
          editing={editing}
          profiles={profiles}
          categories={categories}
          currentUserId={profile?.id}
          isAdmin={isAdmin}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}

      {showGenerator && <PasswordGeneratorModal onClose={() => setShowGenerator(false)} />}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}

      {pendingDelete && (
        <ConfirmDialog
          title="Eliminar credencial"
          message={`¿Eliminar "${pendingDelete.title}"? Se moverá a la papelera lógica de la base de datos (no se pierde el historial en Supabase).`}
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
