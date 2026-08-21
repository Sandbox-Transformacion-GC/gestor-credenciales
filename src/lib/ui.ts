// Clases de Tailwind reutilizadas en varios formularios/modales, con sus variantes de modo oscuro
// ya incluidas, para no repetir (y no olvidar) el mismo bloque en cada componente.
export const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500'

export const selectClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'

export const labelClass = 'mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300'

export const modalOverlayClass = 'fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4'

export const modalCardClass = 'rounded-xl bg-white shadow-xl dark:bg-slate-800 dark:text-slate-100'

export const secondaryButtonClass =
  'rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700'

export const primaryButtonClass =
  'rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60'
