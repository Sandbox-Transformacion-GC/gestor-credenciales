// Paleta fija de colores para categorías. Tailwind necesita ver las clases
// completas escritas literalmente en el código (no se pueden armar
// dinámicamente con `bg-${color}-100`), así que el admin elige un color de
// esta lista cerrada en vez de escribir uno libre.
export const CATEGORY_COLOR_OPTIONS = [
  'slate',
  'sky',
  'emerald',
  'fuchsia',
  'pink',
  'amber',
  'indigo',
  'orange',
  'red',
  'lime',
  'cyan',
  'violet',
] as const

export type CategoryColor = (typeof CATEGORY_COLOR_OPTIONS)[number]

const BADGE_CLASSES: Record<CategoryColor, string> = {
  slate: 'bg-slate-100 text-slate-700',
  sky: 'bg-sky-100 text-sky-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  fuchsia: 'bg-fuchsia-100 text-fuchsia-700',
  pink: 'bg-pink-100 text-pink-700',
  amber: 'bg-amber-100 text-amber-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  orange: 'bg-orange-100 text-orange-700',
  red: 'bg-red-100 text-red-700',
  lime: 'bg-lime-100 text-lime-700',
  cyan: 'bg-cyan-100 text-cyan-700',
  violet: 'bg-violet-100 text-violet-700',
}

const DOT_CLASSES: Record<CategoryColor, string> = {
  slate: 'bg-slate-400',
  sky: 'bg-sky-400',
  emerald: 'bg-emerald-400',
  fuchsia: 'bg-fuchsia-400',
  pink: 'bg-pink-400',
  amber: 'bg-amber-400',
  indigo: 'bg-indigo-400',
  orange: 'bg-orange-400',
  red: 'bg-red-400',
  lime: 'bg-lime-400',
  cyan: 'bg-cyan-400',
  violet: 'bg-violet-400',
}

export function categoryBadgeClasses(color: string): string {
  return BADGE_CLASSES[color as CategoryColor] ?? BADGE_CLASSES.slate
}

export function categoryDotClasses(color: string): string {
  return DOT_CLASSES[color as CategoryColor] ?? DOT_CLASSES.slate
}
