import { useEffect, useRef } from 'react'

/**
 * Llama a onIdle() tras `timeoutMs` sin actividad del usuario (mouse, teclado,
 * toques, scroll). Se usa para bloquear la bóveda automáticamente y borrar la
 * clave de cifrado de la memoria si alguien se aleja del equipo.
 */
export function useIdleLock(onIdle: () => void, timeoutMs: number, enabled: boolean) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) return

    const reset = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(onIdle, timeoutMs)
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    reset()

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset))
      if (timer.current) clearTimeout(timer.current)
    }
  }, [onIdle, timeoutMs, enabled])
}
