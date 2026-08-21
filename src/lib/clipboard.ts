/**
 * Copia texto al portapapeles y lo borra automáticamente pasados `clearAfterMs`
 * (si el contenido del portapapeles sigue siendo el mismo que copiamos), para
 * reducir el riesgo de que una contraseña quede pegada por accidente en otro
 * lugar tiempo después.
 */
export async function copyWithAutoClear(text: string, clearAfterMs = 20_000): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    return false
  }

  setTimeout(async () => {
    try {
      const current = await navigator.clipboard.readText()
      if (current === text) {
        await navigator.clipboard.writeText('')
      }
    } catch {
      // Algunos navegadores bloquean la lectura del portapapeles sin foco: no es crítico, se ignora.
    }
  }, clearAfterMs)

  return true
}
