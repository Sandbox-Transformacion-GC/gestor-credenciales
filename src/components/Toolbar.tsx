import { Category, Profile } from '../types'
import type { ViewMode } from '../hooks/useViewMode'

export interface Filters {
  search: string
  category: string
  ownerId: string
  onlyFavorites: boolean
  sortBy: 'updated_desc' | 'title_asc' | 'created_desc' | 'custom'
}

export const defaultFilters: Filters = {
  search: '',
  category: 'Todas',
  ownerId: 'Todos',
  onlyFavorites: false,
  sortBy: 'updated_desc',
}

const selectClass =
  'rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'

export default function Toolbar({
  filters,
  onChange,
  profiles,
  categories,
  viewMode,
  onViewModeChange,
  total,
  shown,
  onAdd,
}: {
  filters: Filters
  onChange: (f: Filters) => void
  profiles: Profile[]
  categories: Category[]
  viewMode: ViewMode
  onViewModeChange: (v: ViewMode) => void
  total: number
  shown: number
  onAdd: () => void
}) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value })

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <label htmlFor="toolbar-search" className="sr-only">
            Buscar credenciales
          </label>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            🔎
          </span>
          <input
            id="toolbar-search"
            name="search"
            autoComplete="off"
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
            placeholder="Buscar por servicio, correo, a qué está atado…"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
          />
        </div>
        <button
          onClick={onAdd}
          className="whitespace-nowrap rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + Nueva credencial
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="toolbar-category" className="sr-only">
          Filtrar por categoría
        </label>
        <select id="toolbar-category" name="category" value={filters.category} onChange={(e) => set('category', e.target.value)} className={selectClass}>
          <option>Todas</option>
          {categories.map((c) => (
            <option key={c.id}>{c.name}</option>
          ))}
        </select>

        <label htmlFor="toolbar-owner" className="sr-only">
          Filtrar por titular
        </label>
        <select id="toolbar-owner" name="owner" value={filters.ownerId} onChange={(e) => set('ownerId', e.target.value)} className={selectClass}>
          <option value="Todos">Titular: todos</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              Titular: {p.full_name}
            </option>
          ))}
        </select>

        <label htmlFor="toolbar-sort" className="sr-only">
          Ordenar por
        </label>
        <select
          id="toolbar-sort"
          name="sort"
          value={filters.sortBy}
          onChange={(e) => set('sortBy', e.target.value as Filters['sortBy'])}
          className={selectClass}
        >
          <option value="updated_desc">Más recientes primero</option>
          <option value="title_asc">Nombre (A-Z)</option>
          <option value="created_desc">Fecha de creación</option>
          <option value="custom">Mi orden (arrastrar para ordenar)</option>
        </select>

        <label className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
          <input
            id="toolbar-favorites"
            name="onlyFavorites"
            type="checkbox"
            checked={filters.onlyFavorites}
            onChange={(e) => set('onlyFavorites', e.target.checked)}
          />
          ⭐ Solo mis favoritos
        </label>

        <div className="flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
          <button
            onClick={() => onViewModeChange('grid')}
            title="Vista de tarjetas"
            className={`px-2.5 py-1.5 text-sm ${viewMode === 'grid' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
          >
            ▦
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            title="Vista de lista"
            className={`px-2.5 py-1.5 text-sm ${viewMode === 'list' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
          >
            ☰
          </button>
        </div>

        <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
          Mostrando {shown} de {total}
        </span>
      </div>

      {filters.sortBy === 'custom' && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          🖐️ Arrastra para ordenar a tu gusto — este orden es solo tuyo, nadie más lo ve.
        </p>
      )}
    </div>
  )
}
