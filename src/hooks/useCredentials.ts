import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { decryptText, encryptText } from '../lib/crypto'
import type { Credential, CredentialFormValues, CredentialLink, CredentialRow } from '../types'

/** Quita los pares nombre+link que quedaron completamente vacíos antes de guardar. */
function cleanLinks(links: CredentialLink[]): CredentialLink[] {
  return links
    .map((l) => ({ label: l.label.trim(), value: l.value.trim() }))
    .filter((l) => l.label || l.value)
}

export function useCredentials(vaultKey: CryptoKey | null, userId: string | undefined) {
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)

    const [{ data, error: fetchError }, { data: favData }, { data: posData }] = await Promise.all([
      supabase
        .from('credentials')
        .select('*, credential_viewers(profile_id)')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false }),
      supabase.from('credential_favorites').select('credential_id').eq('profile_id', userId),
      supabase.from('credential_positions').select('credential_id, position').eq('profile_id', userId),
    ])

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const favoriteIds = new Set((favData ?? []).map((f) => f.credential_id))
    const positions = new Map((posData ?? []).map((p) => [p.credential_id, p.position]))

    const rows = (data ?? []) as CredentialRow[]
    setCredentials(
      rows.map((r) => ({
        ...r,
        password: null,
        is_favorite: favoriteIds.has(r.id),
        position: positions.get(r.id) ?? null,
        shared_with: (r.credential_viewers ?? []).map((v) => v.profile_id),
      })),
    )
    setLoading(false)
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Actualizaciones en vivo: si otra persona (o tú mismo desde otra pestaña) crea, edita o
  // elimina una credencial, se refleja acá sin tener que recargar la página. Realtime respeta
  // las políticas de RLS, así que una credencial restringida no llega a quien no debería verla.
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('credentials-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credentials' }, () => {
        refresh()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, refresh])

  /** Descifra la contraseña de una credencial puntual (bajo demanda, no todas de golpe). */
  const reveal = useCallback(
    async (id: string): Promise<string | null> => {
      if (!vaultKey) return null
      const target = credentials.find((c) => c.id === id)
      if (!target) return null
      if (target.password !== null) return target.password
      try {
        const plain = await decryptText(target.password_cipher, target.password_iv, vaultKey)
        setCredentials((prev) => prev.map((c) => (c.id === id ? { ...c, password: plain } : c)))
        return plain
      } catch {
        setError('No se pudo descifrar esta contraseña con la clave maestra actual.')
        return null
      }
    },
    [credentials, vaultKey],
  )

  const hide = useCallback((id: string) => {
    setCredentials((prev) => prev.map((c) => (c.id === id ? { ...c, password: null } : c)))
  }, [])

  /** Registro simple de auditoría (no bloquea la acción si falla; solo queda para consulta). */
  const logAction = useCallback(
    async (action: string, credentialId: string, detail?: string) => {
      if (!userId) return
      await supabase.from('audit_log').insert({ actor_id: userId, action, credential_id: credentialId, detail })
    },
    [userId],
  )

  const syncViewers = useCallback(
    async (credentialId: string, sharedWith: string[]) => {
      // Reemplaza la lista completa: borra la anterior y mete la nueva (más simple y menos propenso
      // a errores que calcular el diff; el volumen de datos es mínimo para 3 usuarios).
      await supabase.from('credential_viewers').delete().eq('credential_id', credentialId)
      if (sharedWith.length > 0) {
        await supabase
          .from('credential_viewers')
          .insert(sharedWith.map((profile_id) => ({ credential_id: credentialId, profile_id, added_by: userId })))
      }
      await logAction(
        'sharing_changed',
        credentialId,
        sharedWith.length > 0 ? `restringida a ${sharedWith.length} persona(s)` : 'abierta a todo el equipo',
      )
    },
    [userId, logAction],
  )

  const create = useCallback(
    async (values: CredentialFormValues) => {
      if (!vaultKey || !userId) return 'La bóveda debe estar desbloqueada.'
      const { cipher, iv } = await encryptText(values.password, vaultKey)
      const { data, error: insertError } = await supabase
        .from('credentials')
        .insert({
          title: values.title,
          email: values.email,
          password_cipher: cipher,
          password_iv: iv,
          category: values.category,
          links: cleanLinks(values.links),
          notes: values.notes,
          owner_id: values.owner_id,
          created_by: userId,
        })
        .select('id')
        .single()
      if (insertError) return insertError.message
      if (values.shared_with.length > 0) await syncViewers(data.id, values.shared_with)
      await logAction('created', data.id, values.title)
      await refresh()
      return null
    },
    [vaultKey, userId, refresh, syncViewers, logAction],
  )

  const update = useCallback(
    async (id: string, values: CredentialFormValues, canEditSharing: boolean) => {
      if (!vaultKey) return 'La bóveda debe estar desbloqueada.'
      const { cipher, iv } = await encryptText(values.password, vaultKey)
      const { error: updateError } = await supabase
        .from('credentials')
        .update({
          title: values.title,
          email: values.email,
          password_cipher: cipher,
          password_iv: iv,
          category: values.category,
          links: cleanLinks(values.links),
          notes: values.notes,
          owner_id: values.owner_id,
        })
        .eq('id', id)
      if (updateError) return updateError.message
      // Solo el creador o el admin pueden cambiar con quién está compartida (la política de la base
      // de datos también lo exige; esto evita además una llamada de red innecesaria a quien no puede).
      if (canEditSharing) await syncViewers(id, values.shared_with)
      await refresh()
      return null
    },
    [vaultKey, refresh, syncViewers],
  )

  const toggleFavorite = useCallback(
    async (id: string, value: boolean) => {
      if (!userId) return
      if (value) {
        await supabase.from('credential_favorites').insert({ profile_id: userId, credential_id: id })
      } else {
        await supabase.from('credential_favorites').delete().eq('profile_id', userId).eq('credential_id', id)
      }
      setCredentials((prev) => prev.map((c) => (c.id === id ? { ...c, is_favorite: value } : c)))
    },
    [userId],
  )

  /** Guarda el orden personalizado (arrastrar y soltar) de una lista de IDs, solo para el usuario actual. */
  const reorder = useCallback(
    async (orderedIds: string[]) => {
      if (!userId) return
      const rows = orderedIds.map((credential_id, i) => ({
        profile_id: userId,
        credential_id,
        position: (i + 1) * 100,
      }))
      setCredentials((prev) => {
        const posMap = new Map(rows.map((r) => [r.credential_id, r.position]))
        return prev.map((c) => (posMap.has(c.id) ? { ...c, position: posMap.get(c.id)! } : c))
      })
      await supabase.from('credential_positions').upsert(rows, { onConflict: 'profile_id,credential_id' })
    },
    [userId],
  )

  /** Soft delete: mueve el registro a "papelera" en vez de borrarlo físicamente. Solo el creador o el admin pasan la policy de la base de datos. */
  const remove = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase
        .from('credentials')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (deleteError) return deleteError.message
      await logAction('deleted', id)
      setCredentials((prev) => prev.filter((c) => c.id !== id))
      return null
    },
    [logAction],
  )

  return { credentials, loading, error, refresh, reveal, hide, create, update, toggleFavorite, remove, reorder }
}
