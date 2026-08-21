import { DragEvent, useState } from 'react'
import type { Category, Credential, Profile } from '../types'
import { copyWithAutoClear } from '../lib/clipboard'
import { categoryBadgeClasses } from '../lib/colors'

function profileName(profiles: Profile[], id: string | null) {
  if (!id) return '—'
  return profiles.find((p) => p.id === id)?.full_name ?? '—'
}

function categoryColor(categories: Category[], name: string) {
  return categories.find((c) => c.name === name)?.color ?? 'slate'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function CredentialCard({
  credential,
  profiles,
  categories,
  currentUserId,
  isAdmin,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onReveal,
  onHide,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  credential: Credential
  profiles: Profile[]
  categories: Category[]
  currentUserId: string | undefined
  isAdmin: boolean
  draggable?: boolean
  onDragStart?: (e: DragEvent<HTMLDivElement>) => void
  onDragOver?: (e: DragEvent<HTMLDivElement>) => void
  onDrop?: (e: DragEvent<HTMLDivElement>) => void
  onReveal: (id: string) => void
  onHide: (id: string) => void
  onEdit: (c: Credential) => void
  onDelete: (c: Credential) => void
  onToggleFavorite: (id: string, value: boolean) => void
}) {
  const [copied, setCopied] = useState<'email' | 'password' | null>(null)
  const [revealing, setRevealing] = useState(false)

  const canDelete = credential.created_by === currentUserId || isAdmin
  const isRestricted = credential.shared_with.length > 0

  const handleToggleReveal = async () => {
    if (credential.password !== null) {
      onHide(credential.id)
      return
    }
    setRevealing(true)
    await onReveal(credential.id)
    setRevealing(false)
  }

  const handleCopy = async (kind: 'email' | 'password') => {
    const value = kind === 'email' ? credential.email : credential.password
    if (kind === 'password' && value === null) {
      setRevealing(true)
      await onReveal(credential.id)
      setRevealing(false)
      return // el usuario puede copiar en el segundo click, ya revelada
    }
    if (!value) return
    const ok = await copyWithAutoClear(value)
    if (ok) {
      setCopied(kind)
      setTimeout(() => setCopied(null), 1500)
    }
  }

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {draggable && <span className="text-slate-300">⠿</span>}
            <h3 className="truncate text-sm font-semibold text-slate-900">{credential.title}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${categoryBadgeClasses(categoryColor(categories, credential.category))}`}>
              {credential.category}
            </span>
            {isRestricted && (
              <span title="Solo personas específicas pueden ver esta contraseña" className="text-xs">
                🔒
              </span>
            )}
          </div>
          {credential.url && (
            <a
              href={credential.url.startsWith('http') ? credential.url : `https://${credential.url}`}
              target="_blank"
              rel="noreferrer noopener"
              className="text-xs text-brand-600 hover:underline"
            >
              {credential.url}
            </a>
          )}
        </div>

        <button
          onClick={() => onToggleFavorite(credential.id, !credential.is_favorite)}
          title="Marcar como favorito (solo para ti)"
          className="text-lg leading-none"
        >
          {credential.is_favorite ? '⭐' : '☆'}
        </button>
      </div>

      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-slate-600">✉️ {credential.email || '—'}</span>
          <button
            onClick={() => handleCopy('email')}
            className="shrink-0 rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-50"
          >
            {copied === 'email' ? 'Copiado ✓' : 'Copiar'}
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-slate-600">
            {credential.password !== null ? credential.password : '••••••••••••'}
          </span>
          <div className="flex shrink-0 gap-1">
            <button
              onClick={handleToggleReveal}
              disabled={revealing}
              className="rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            >
              {revealing ? '…' : credential.password !== null ? 'Ocultar' : 'Ver'}
            </button>
            <button
              onClick={() => handleCopy('password')}
              className="rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-50"
            >
              {copied === 'password' ? 'Copiado ✓' : 'Copiar'}
            </button>
          </div>
        </div>

        {credential.linked_to && (
          <div className="text-xs text-slate-500">
            🔗 Atado a: <span className="text-slate-700">{credential.linked_to}</span>
          </div>
        )}
        <div className="text-xs text-slate-500">
          👤 Titular: <span className="text-slate-700">{profileName(profiles, credential.owner_id)}</span>
        </div>
        {isRestricted && (
          <div className="text-xs text-slate-500">
            🔒 Compartida con:{' '}
            <span className="text-slate-700">
              {profileName(profiles, credential.created_by)}
              {credential.shared_with
                .filter((id) => id !== credential.created_by)
                .map((id) => `, ${profileName(profiles, id)}`)}
            </span>
          </div>
        )}
        {credential.notes && <p className="text-xs italic text-slate-400">{credential.notes}</p>}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
        <span className="text-[11px] text-slate-400">
          Actualizado {formatDate(credential.updated_at)} · Creado por {profileName(profiles, credential.created_by)}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(credential)}
            className="rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
          >
            Editar
          </button>
          {canDelete && (
            <button
              onClick={() => onDelete(credential)}
              className="rounded-md px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
