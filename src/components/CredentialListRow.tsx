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

export default function CredentialListRow({
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
      return
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
      className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800 ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {draggable && <span className="text-slate-300 dark:text-slate-600">⠿</span>}

      <button
        onClick={() => onToggleFavorite(credential.id, !credential.is_favorite)}
        title="Marcar como favorito (solo para ti)"
        className="text-base leading-none"
      >
        {credential.is_favorite ? '⭐' : '☆'}
      </button>

      <span className="w-36 shrink-0 truncate text-sm font-semibold text-slate-900 dark:text-slate-100" title={credential.title}>
        {credential.title}
      </span>

      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${categoryBadgeClasses(categoryColor(categories, credential.category))}`}>
        {credential.category}
      </span>

      {isRestricted && (
        <span title="Solo personas específicas pueden ver esta contraseña" className="shrink-0 text-xs">
          🔒
        </span>
      )}

      <div className="flex min-w-[10rem] flex-1 items-center gap-1.5">
        <span className="truncate text-sm text-slate-600 dark:text-slate-300" title={credential.email}>
          ✉️ {credential.email || '—'}
        </span>
        <button
          onClick={() => handleCopy('email')}
          className="shrink-0 rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          {copied === 'email' ? '✓' : 'Copiar'}
        </button>
      </div>

      <div className="flex min-w-[9rem] flex-1 items-center gap-1.5">
        <span className="truncate font-mono text-sm text-slate-600 dark:text-slate-300">
          {credential.password !== null ? credential.password : '••••••••••••'}
        </span>
        <button
          onClick={handleToggleReveal}
          disabled={revealing}
          className="shrink-0 rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-500 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          {revealing ? '…' : credential.password !== null ? 'Ocultar' : 'Ver'}
        </button>
        <button
          onClick={() => handleCopy('password')}
          className="shrink-0 rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          {copied === 'password' ? '✓' : 'Copiar'}
        </button>
      </div>

      <span className="hidden w-28 shrink-0 truncate text-xs text-slate-500 dark:text-slate-400 md:inline" title={credential.linked_to ?? ''}>
        {credential.linked_to ? `🔗 ${credential.linked_to}` : ''}
      </span>

      <span className="hidden w-24 shrink-0 truncate text-xs text-slate-500 dark:text-slate-400 lg:inline">
        👤 {profileName(profiles, credential.owner_id)}
      </span>

      <div className="ml-auto flex shrink-0 gap-1">
        <button
          onClick={() => onEdit(credential)}
          className="rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-slate-700"
        >
          Editar
        </button>
        {canDelete && (
          <button
            onClick={() => onDelete(credential)}
            className="rounded-md px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-slate-700"
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  )
}
