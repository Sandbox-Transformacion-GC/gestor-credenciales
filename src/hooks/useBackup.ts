import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import { BACKUP_APP_ID, BACKUP_VERSION, BackupFile, downloadJson, isBackupFile } from '../lib/backup'
import type { CredentialLink } from '../types'

export interface ImportSummary {
  imported: number
  skippedCategories: number
  warnings: string[]
}

export function useBackup(currentUserEmail: string | undefined) {
  const [working, setWorking] = useState(false)

  const exportBackup = useCallback(async (): Promise<string | null> => {
    setWorking(true)
    try {
      const [{ data: rows, error: credError }, { data: profiles, error: profError }, { data: categories, error: catError }] =
        await Promise.all([
          supabase
            .from('credentials')
            .select('title, email, password_cipher, password_iv, category, links, notes, owner_id, created_by, created_at, updated_at, credential_viewers(profile_id)')
            .is('deleted_at', null),
          supabase.from('profiles').select('id, email'),
          supabase.from('categories').select('name, color, sort_order'),
        ])

      if (credError) return credError.message
      if (profError) return profError.message
      if (catError) return catError.message

      const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]))

      const file: BackupFile = {
        app: BACKUP_APP_ID,
        version: BACKUP_VERSION,
        exported_at: new Date().toISOString(),
        exported_by_email: currentUserEmail ?? '',
        categories: categories ?? [],
        credentials: (rows ?? []).map((r) => ({
          title: r.title,
          email: r.email,
          password_cipher: r.password_cipher,
          password_iv: r.password_iv,
          category: r.category,
          links: (r.links ?? []) as CredentialLink[],
          notes: r.notes,
          owner_email: r.owner_id ? emailById.get(r.owner_id) ?? null : null,
          created_by_email: emailById.get(r.created_by) ?? null,
          shared_with_emails: (r.credential_viewers ?? [])
            .map((v: { profile_id: string }) => emailById.get(v.profile_id))
            .filter((e): e is string => !!e),
          created_at: r.created_at,
          updated_at: r.updated_at,
        })),
      }

      const stamp = file.exported_at.slice(0, 10)
      downloadJson(`gestor-credenciales-backup-${stamp}.json`, file)
      return null
    } finally {
      setWorking(false)
    }
  }, [currentUserEmail])

  const importBackup = useCallback(
    async (file: File, currentUserId: string): Promise<{ error: string | null; summary: ImportSummary | null }> => {
      setWorking(true)
      try {
        let parsed: unknown
        try {
          parsed = JSON.parse(await file.text())
        } catch {
          return { error: 'El archivo no es un JSON válido.', summary: null }
        }
        if (!isBackupFile(parsed)) {
          return { error: 'Este archivo no es una copia de seguridad de esta app.', summary: null }
        }

        const [{ data: profiles }, { data: existingCategories }] = await Promise.all([
          supabase.from('profiles').select('id, email'),
          supabase.from('categories').select('name, sort_order'),
        ])

        const idByEmail = new Map((profiles ?? []).map((p) => [p.email.toLowerCase(), p.id]))
        const existingCategoryNames = new Set((existingCategories ?? []).map((c) => c.name))
        const warnings: string[] = []

        // Crea las categorías del respaldo que todavía no existan.
        let nextSortOrder = (existingCategories ?? []).reduce((max, c) => Math.max(max, c.sort_order), 0) + 1
        let skippedCategories = 0
        for (const c of parsed.categories) {
          if (existingCategoryNames.has(c.name)) {
            skippedCategories++
            continue
          }
          await supabase.from('categories').insert({ name: c.name, color: c.color, sort_order: nextSortOrder++ })
          existingCategoryNames.add(c.name)
        }

        let imported = 0
        for (const c of parsed.credentials) {
          const ownerId = c.owner_email ? idByEmail.get(c.owner_email.toLowerCase()) ?? null : null
          if (c.owner_email && !ownerId) warnings.push(`"${c.title}": no se encontró al titular (${c.owner_email}), se dejó sin asignar.`)

          // La política de la base de datos exige que el creador seas tú (quien restaura); si el
          // creador original era otra persona, se deja constancia en las notas para no perder el dato.
          let notes = c.notes ?? ''
          if (c.created_by_email && idByEmail.get(c.created_by_email.toLowerCase()) !== currentUserId) {
            notes = `${notes}\n(Restaurada desde copia de seguridad; creador original: ${c.created_by_email})`.trim()
          }

          const { data: inserted, error: insertError } = await supabase
            .from('credentials')
            .insert({
              title: c.title,
              email: c.email,
              password_cipher: c.password_cipher,
              password_iv: c.password_iv,
              category: c.category,
              links: c.links ?? [],
              notes,
              owner_id: ownerId,
              created_by: currentUserId,
            })
            .select('id')
            .single()

          if (insertError || !inserted) {
            warnings.push(`"${c.title}": no se pudo restaurar (${insertError?.message ?? 'error desconocido'}).`)
            continue
          }

          const viewerIds = c.shared_with_emails
            .map((e) => idByEmail.get(e.toLowerCase()))
            .filter((id): id is string => !!id)
          if (viewerIds.length > 0) {
            await supabase
              .from('credential_viewers')
              .insert(viewerIds.map((profile_id) => ({ credential_id: inserted.id, profile_id, added_by: currentUserId })))
          }

          imported++
        }

        return { error: null, summary: { imported, skippedCategories, warnings } }
      } finally {
        setWorking(false)
      }
    },
    [],
  )

  return { working, exportBackup, importBackup }
}
