export type Role = 'admin' | 'member'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
}

export interface Category {
  id: string
  name: string
  color: string
  sort_order: number
}

export interface CredentialLink {
  label: string
  value: string
}

// Fila cruda tal como viene de la base de datos (password aún cifrado).
// credential_viewers viene embebido vía PostgREST (join automático).
export interface CredentialRow {
  id: string
  title: string
  email: string
  password_cipher: string
  password_iv: string
  category: string
  links: CredentialLink[]
  notes: string | null
  owner_id: string | null
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  credential_viewers: { profile_id: string }[]
}

// Forma "de trabajo" en la UI: password se descifra bajo demanda (null = no revelada aún),
// is_favorite y position son PERSONALES (de quien está viendo la app en este momento).
export interface Credential extends CredentialRow {
  password: string | null
  is_favorite: boolean
  position: number | null
  shared_with: string[] // profile_id[] — vacío = visible para todo el equipo
}

export interface CredentialFormValues {
  title: string
  email: string
  password: string
  category: string
  links: CredentialLink[]
  notes: string
  owner_id: string | null
  shared_with: string[] // [] = todo el equipo puede verla
}

export const emptyFormValues: CredentialFormValues = {
  title: '',
  email: '',
  password: '',
  category: 'Otro',
  links: [{ label: '', value: '' }],
  notes: '',
  owner_id: null,
  shared_with: [],
}
