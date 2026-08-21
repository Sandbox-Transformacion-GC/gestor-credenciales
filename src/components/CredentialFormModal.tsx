import { FormEvent, useEffect, useState } from 'react'
import { Category, Credential, CredentialFormValues, Profile, emptyFormValues } from '../types'
import { estimatePasswordStrength, generatePassword } from '../lib/crypto'
import { inputClass, labelClass, modalCardClass, modalOverlayClass, primaryButtonClass, secondaryButtonClass, selectClass } from '../lib/ui'

const STRENGTH_COLORS = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500']

export default function CredentialFormModal({
  editing,
  profiles,
  categories,
  currentUserId,
  isAdmin,
  onSave,
  onClose,
}: {
  editing: Credential | null
  profiles: Profile[]
  categories: Category[]
  currentUserId: string | undefined
  isAdmin: boolean
  onSave: (values: CredentialFormValues, canEditSharing: boolean) => Promise<string | null>
  onClose: () => void
}) {
  const [values, setValues] = useState<CredentialFormValues>(emptyFormValues)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loadingPlain, setLoadingPlain] = useState(false)

  // Al crear una credencial nueva, el creador siempre puede definir con quién compartirla.
  // Al editar una existente, solo el creador original o el admin pueden cambiar esa lista.
  const canEditSharing = !editing || editing.created_by === currentUserId || isAdmin

  useEffect(() => {
    if (editing) {
      setValues({
        title: editing.title,
        email: editing.email,
        password: editing.password ?? '',
        category: editing.category,
        links: editing.links.length > 0 ? editing.links : [{ label: '', value: '' }],
        notes: editing.notes ?? '',
        owner_id: editing.owner_id,
        shared_with: editing.shared_with,
      })
      setLoadingPlain(editing.password === null)
    } else {
      setValues({ ...emptyFormValues, owner_id: currentUserId ?? null })
    }
  }, [editing, currentUserId])

  const set = <K extends keyof CredentialFormValues>(key: K, v: CredentialFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: v }))

  const setLink = (index: number, field: 'label' | 'value', v: string) => {
    setValues((prev) => ({
      ...prev,
      links: prev.links.map((l, i) => (i === index ? { ...l, [field]: v } : l)),
    }))
  }

  const addLink = () => setValues((prev) => ({ ...prev, links: [...prev.links, { label: '', value: '' }] }))

  const removeLink = (index: number) =>
    setValues((prev) => ({ ...prev, links: prev.links.filter((_, i) => i !== index) }))

  const toggleViewer = (profileId: string) => {
    set(
      'shared_with',
      values.shared_with.includes(profileId)
        ? values.shared_with.filter((id) => id !== profileId)
        : [...values.shared_with, profileId],
    )
  }

  const handleGenerate = () => {
    const pwd = generatePassword({ length: 16, uppercase: true, lowercase: true, numbers: true, symbols: true })
    set('password', pwd)
    setShowPassword(true)
  }

  const strength = values.password ? estimatePasswordStrength(values.password) : null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!values.password) {
      setError('La contraseña no puede estar vacía.')
      return
    }
    setSaving(true)
    const err = await onSave(values, canEditSharing)
    setSaving(false)
    if (err) setError(err)
    else onClose()
  }

  return (
    <div className={`${modalOverlayClass} py-8`}>
      <div className={`max-h-full w-full max-w-lg overflow-y-auto p-6 ${modalCardClass}`}>
        <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">
          {editing ? 'Editar credencial' : 'Nueva credencial'}
        </h3>

        {editing && loadingPlain && (
          <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            Cargando la contraseña actual descifrada… si no aparece, ábrela primero con "Ver" en la tarjeta.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label htmlFor="cred-title" className={labelClass}>
                Servicio / Nombre *
              </label>
              <input
                id="cred-title"
                name="title"
                required
                value={values.title}
                onChange={(e) => set('title', e.target.value)}
                className={inputClass}
                placeholder="Ej: Netflix, Banco Pichincha, Gmail principal…"
              />
            </div>

            <div className="col-span-2">
              <label htmlFor="cred-email" className={labelClass}>
                Correo / usuario
              </label>
              <input
                id="cred-email"
                name="email"
                autoComplete="off"
                value={values.email}
                onChange={(e) => set('email', e.target.value)}
                className={inputClass}
                placeholder="correo@dominio.com"
              />
            </div>

            <div className="col-span-2">
              <label htmlFor="cred-password" className={labelClass}>
                Contraseña *
              </label>
              <div className="flex gap-2">
                <input
                  id="cred-password"
                  name="password"
                  required
                  autoComplete="off"
                  type={showPassword ? 'text' : 'password'}
                  value={values.password}
                  onChange={(e) => set('password', e.target.value)}
                  className={`${inputClass} font-mono`}
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className={`shrink-0 ${secondaryButtonClass} px-2 py-2`}>
                  {showPassword ? 'Ocultar' : 'Ver'}
                </button>
                <button type="button" onClick={handleGenerate} className={`shrink-0 ${secondaryButtonClass} px-2 py-2`}>
                  🎲 Generar
                </button>
              </div>
              {strength && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex h-1.5 flex-1 gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className={`h-full flex-1 rounded-full ${i <= strength.score ? STRENGTH_COLORS[strength.score] : 'bg-slate-200 dark:bg-slate-700'}`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{strength.label}</span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="cred-category" className={labelClass}>
                Categoría
              </label>
              <select
                id="cred-category"
                name="category"
                value={values.category}
                onChange={(e) => set('category', e.target.value)}
                className={selectClass}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
                {/* por si la credencial tiene una categoría que ya fue borrada por el admin */}
                {!categories.some((c) => c.name === values.category) && values.category && (
                  <option value={values.category}>{values.category} (eliminada)</option>
                )}
              </select>
            </div>

            <div>
              <label htmlFor="cred-owner" className={labelClass}>
                Titular / Responsable
              </label>
              <select
                id="cred-owner"
                name="owner"
                value={values.owner_id ?? ''}
                onChange={(e) => set('owner_id', e.target.value || null)}
                className={selectClass}
              >
                <option value="">Sin asignar</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <span className={labelClass}>Enlaces / a qué está atado</span>
              <div className="space-y-2">
                {values.links.map((link, i) => (
                  <div key={i} className="flex gap-2">
                    <label htmlFor={`link-label-${i}`} className="sr-only">
                      Nombre del enlace {i + 1}
                    </label>
                    <input
                      id={`link-label-${i}`}
                      name={`link-label-${i}`}
                      autoComplete="off"
                      value={link.label}
                      onChange={(e) => setLink(i, 'label', e.target.value)}
                      className={`${inputClass} w-2/5`}
                      placeholder="Ej: Sitio web, Panel admin, Tarjeta…"
                    />
                    <label htmlFor={`link-value-${i}`} className="sr-only">
                      Valor del enlace {i + 1}
                    </label>
                    <input
                      id={`link-value-${i}`}
                      name={`link-value-${i}`}
                      autoComplete="off"
                      value={link.value}
                      onChange={(e) => setLink(i, 'value', e.target.value)}
                      className={inputClass}
                      placeholder="https://… o cualquier dato"
                    />
                    <button
                      type="button"
                      onClick={() => removeLink(i)}
                      title="Quitar este campo"
                      className="shrink-0 rounded-lg border border-slate-300 px-2 text-sm text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addLink} className="mt-2 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                + Agregar otro campo
              </button>
            </div>

            <div className="col-span-2">
              <label htmlFor="cred-notes" className={labelClass}>
                Notas
              </label>
              <textarea
                id="cred-notes"
                name="notes"
                value={values.notes}
                onChange={(e) => set('notes', e.target.value)}
                rows={2}
                className={inputClass}
              />
            </div>

            <div className="col-span-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <p className="mb-2 text-xs font-medium text-slate-700 dark:text-slate-300">¿Quién puede ver esta contraseña?</p>
              {!canEditSharing && (
                <p className="mb-2 text-[11px] text-slate-400 dark:text-slate-500">
                  Solo quien creó esta credencial o un administrador pueden cambiar esto.
                </p>
              )}
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  id="sharing-everyone"
                  name="sharing"
                  type="radio"
                  disabled={!canEditSharing}
                  checked={values.shared_with.length === 0}
                  onChange={() => set('shared_with', [])}
                />
                Todo el equipo
              </label>
              <label className="mt-1 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  id="sharing-specific"
                  name="sharing"
                  type="radio"
                  disabled={!canEditSharing}
                  checked={values.shared_with.length > 0}
                  onChange={() => set('shared_with', profiles.filter((p) => p.id !== currentUserId).map((p) => p.id))}
                />
                Solo personas específicas
              </label>

              {values.shared_with.length > 0 && (
                <div className="ml-6 mt-2 space-y-1">
                  {profiles.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <input
                        id={`sharing-viewer-${p.id}`}
                        name={`sharing-viewer-${p.id}`}
                        type="checkbox"
                        disabled={!canEditSharing || p.id === currentUserId}
                        checked={p.id === currentUserId || values.shared_with.includes(p.id)}
                        onChange={() => toggleViewer(p.id)}
                      />
                      {p.full_name}
                      {p.id === currentUserId && <span className="text-[11px] text-slate-400 dark:text-slate-500">(tú, siempre incluido)</span>}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className={secondaryButtonClass}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className={primaryButtonClass}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
