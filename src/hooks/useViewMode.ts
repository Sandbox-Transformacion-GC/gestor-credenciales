import { useCallback, useState } from 'react'

export type ViewMode = 'grid' | 'list'

function getInitial(): ViewMode {
  const stored = localStorage.getItem('viewMode')
  return stored === 'list' ? 'list' : 'grid'
}

/** Vista de tarjetas o de lista, guardada solo en este navegador (cada quien la suya). */
export function useViewMode() {
  const [viewMode, setViewModeState] = useState<ViewMode>(getInitial)

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode)
    localStorage.setItem('viewMode', mode)
  }, [])

  return { viewMode, setViewMode }
}
