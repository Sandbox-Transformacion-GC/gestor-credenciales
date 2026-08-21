import type { CredentialLink } from '../types'

// Formato del archivo de respaldo. IMPORTANTE: password_cipher/password_iv se guardan TAL CUAL
// están en la base de datos — siguen cifrados con la clave maestra del equipo vigente al momento
// de exportar. Este archivo nunca contiene una contraseña en texto plano; es tan seguro como la
// base de datos misma (inútil sin la clave maestra correspondiente).
export const BACKUP_APP_ID = 'gestor-credenciales'
export const BACKUP_VERSION = 1

export interface BackupCredential {
  title: string
  email: string
  password_cipher: string
  password_iv: string
  category: string
  links: CredentialLink[]
  notes: string | null
  owner_email: string | null
  created_by_email: string | null
  shared_with_emails: string[]
  created_at: string
  updated_at: string
}

export interface BackupCategory {
  name: string
  color: string
  sort_order: number
}

export interface BackupFile {
  app: typeof BACKUP_APP_ID
  version: typeof BACKUP_VERSION
  exported_at: string
  exported_by_email: string
  categories: BackupCategory[]
  credentials: BackupCredential[]
}

export function isBackupFile(data: unknown): data is BackupFile {
  return (
    !!data &&
    typeof data === 'object' &&
    (data as Record<string, unknown>).app === BACKUP_APP_ID &&
    Array.isArray((data as Record<string, unknown>).credentials)
  )
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
