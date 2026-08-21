import { useState } from 'react'
import { estimatePasswordStrength, generatePassword, PasswordOptions } from '../lib/crypto'
import { copyWithAutoClear } from '../lib/clipboard'

const STRENGTH_COLORS = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500']

export default function PasswordGeneratorModal({ onClose }: { onClose: () => void }) {
  const [options, setOptions] = useState<PasswordOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  })
  const [password, setPassword] = useState(() => generatePassword(options))
  const [copied, setCopied] = useState(false)

  const regenerate = (next: PasswordOptions) => {
    setOptions(next)
    setPassword(generatePassword(next))
  }

  const strength = estimatePasswordStrength(password)

  const handleCopy = async () => {
    const ok = await copyWithAutoClear(password)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">Generador de contraseñas</h3>

        <div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
          <span className="flex-1 break-all font-mono text-sm text-slate-800 dark:text-slate-100">{password}</span>
          <button onClick={() => setPassword(generatePassword(options))} title="Regenerar" className="text-lg">
            🔄
          </button>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-1.5 flex-1 gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`h-full flex-1 rounded-full ${i <= strength.score ? STRENGTH_COLORS[strength.score] : 'bg-slate-200 dark:bg-slate-700'}`}
              />
            ))}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">{strength.label}</span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="mb-1 flex justify-between text-xs text-slate-600 dark:text-slate-300">
              <span>Longitud</span>
              <span>{options.length}</span>
            </div>
            <input
              type="range"
              min={8}
              max={32}
              value={options.length}
              onChange={(e) => regenerate({ ...options, length: Number(e.target.value) })}
              className="w-full"
            />
          </div>

          {(
            [
              ['uppercase', 'Mayúsculas (A-Z)'],
              ['lowercase', 'Minúsculas (a-z)'],
              ['numbers', 'Números (0-9)'],
              ['symbols', 'Símbolos (!@#…)'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
              {label}
              <input
                type="checkbox"
                checked={options[key]}
                onChange={(e) => regenerate({ ...options, [key]: e.target.checked })}
              />
            </label>
          ))}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Cerrar
          </button>
          <button
            onClick={handleCopy}
            className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {copied ? 'Copiado ✓' : 'Copiar'}
          </button>
        </div>
      </div>
    </div>
  )
}
