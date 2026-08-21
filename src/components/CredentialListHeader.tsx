import { LIST_GRID_COLS } from '../lib/listGrid'

export default function CredentialListHeader() {
  return (
    <div
      className={`grid ${LIST_GRID_COLS} items-center gap-x-3 border-b border-slate-200 px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:text-slate-500`}
    >
      <span />
      <span>Servicio</span>
      <span>Correo</span>
      <span>Contraseña</span>
      <span>Enlaces</span>
      <span>Titular</span>
      <span>Actualizado</span>
      <span className="text-right">Acciones</span>
    </div>
  )
}
