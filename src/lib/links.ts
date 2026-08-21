/** Heurística simple: ¿este valor parece un link como para volverlo clicable? */
export function isLikelyUrl(value: string): boolean {
  return /^(https?:\/\/|www\.)/i.test(value.trim()) || /^[a-z0-9-]+\.[a-z]{2,}(\/|$)/i.test(value.trim())
}

export function toHref(value: string): string {
  const v = value.trim()
  return v.startsWith('http') ? v : `https://${v}`
}
