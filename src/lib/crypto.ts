// ======================================================================
// Cifrado del lado del cliente (Web Crypto API, nativo del navegador).
//
// Idea: las contraseñas guardadas se cifran en TU navegador con
// AES-256-GCM usando una clave derivada de una "clave maestra del
// equipo" (una frase que solo conocen las 3 personas). Esa clave nunca
// se envía a Supabase ni se guarda en ningún lado: vive solo en memoria
// mientras la bóveda está "desbloqueada". Aunque alguien accediera a la
// base de datos directamente, solo vería texto cifrado.
//
// vault_meta guarda una "sal" (no es secreta) y un valor de verificación
// cifrado, para poder confirmar que la clave maestra ingresada es
// correcta sin necesidad de almacenarla.
// ======================================================================

const PBKDF2_ITERATIONS = 250_000
const VAULT_CHECK_PLAINTEXT = 'VAULT_OK_v1'

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  for (let i = 0; i < arr.byteLength; i++) binary += String.fromCharCode(arr[i])
  return btoa(binary)
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function generateSaltBase64(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return toBase64(salt)
}

/** Deriva una clave AES-256-GCM a partir de la frase maestra + sal (PBKDF2-SHA256). */
export async function deriveVaultKey(passphrase: string, saltB64: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: fromBase64(saltB64) as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptText(
  plaintext: string,
  key: CryptoKey,
): Promise<{ cipher: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext))
  return { cipher: toBase64(cipherBuf), iv: toBase64(iv) }
}

export async function decryptText(cipherB64: string, ivB64: string, key: CryptoKey): Promise<string> {
  const dec = new TextDecoder()
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(ivB64) as BufferSource },
    key,
    fromBase64(cipherB64) as BufferSource,
  )
  return dec.decode(plainBuf)
}

/** Cifra el valor de verificación para guardar junto con una sal nueva (primera vez que se configura la bóveda). */
export async function createVaultCheck(passphrase: string): Promise<{
  salt: string
  checkCipher: string
  checkIv: string
}> {
  const salt = generateSaltBase64()
  const key = await deriveVaultKey(passphrase, salt)
  const { cipher, iv } = await encryptText(VAULT_CHECK_PLAINTEXT, key)
  return { salt, checkCipher: cipher, checkIv: iv }
}

/** Verifica que la frase maestra ingresada es correcta y, si lo es, devuelve la clave lista para usar. */
export async function unlockVault(
  passphrase: string,
  salt: string,
  checkCipher: string,
  checkIv: string,
): Promise<CryptoKey | null> {
  try {
    const key = await deriveVaultKey(passphrase, salt)
    const decrypted = await decryptText(checkCipher, checkIv, key)
    if (decrypted !== VAULT_CHECK_PLAINTEXT) return null
    return key
  } catch {
    // AES-GCM falla la autenticación si la clave es incorrecta -> frase maestra incorrecta.
    return null
  }
}

// ----------------------------------------------------------------------
// Generador de contraseñas seguras (usa crypto.getRandomValues, no Math.random).
// ----------------------------------------------------------------------
export interface PasswordOptions {
  length: number
  uppercase: boolean
  lowercase: boolean
  numbers: boolean
  symbols: boolean
}

const CHARSETS = {
  uppercase: 'ABCDEFGHJKLMNPQRSTUVWXYZ', // sin I/O para evitar confusión visual
  lowercase: 'abcdefghijkmnpqrstuvwxyz',
  numbers: '23456789',
  symbols: '!@#$%^&*()-_=+[]{}?',
}

export function generatePassword(options: PasswordOptions): string {
  const pools = Object.entries(options)
    .filter(([key, enabled]) => key !== 'length' && enabled)
    .map(([key]) => CHARSETS[key as keyof typeof CHARSETS])

  if (pools.length === 0) return ''

  const allChars = pools.join('')
  const randomValues = crypto.getRandomValues(new Uint32Array(options.length))
  let result = ''
  for (let i = 0; i < options.length; i++) {
    result += allChars[randomValues[i] % allChars.length]
  }
  return result
}

export function estimatePasswordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4
  label: string
} {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 14) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++

  const labels = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Muy fuerte']
  return { score: score as 0 | 1 | 2 | 3 | 4, label: labels[score] }
}
