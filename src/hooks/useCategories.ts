import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Category } from '../types'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('categories').select('*').order('sort_order', { ascending: true })
    setCategories(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Si el admin agrega/edita/borra una categoría, se refleja en vivo para todo el equipo.
  useEffect(() => {
    const channel = supabase
      .channel('categories-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        refresh()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [refresh])

  const create = useCallback(
    async (name: string, color: string) => {
      const sort_order = categories.length ? Math.max(...categories.map((c) => c.sort_order)) + 1 : 1
      const { error } = await supabase.from('categories').insert({ name, color, sort_order })
      if (error) return error.message
      await refresh()
      return null
    },
    [categories, refresh],
  )

  const rename = useCallback(
    async (id: string, name: string, color: string) => {
      const { error } = await supabase.from('categories').update({ name, color }).eq('id', id)
      if (error) return error.message
      await refresh()
      return null
    },
    [refresh],
  )

  const move = useCallback(
    async (id: string, direction: 'up' | 'down') => {
      const idx = categories.findIndex((c) => c.id === id)
      const swapWith = direction === 'up' ? idx - 1 : idx + 1
      if (idx < 0 || swapWith < 0 || swapWith >= categories.length) return
      const a = categories[idx]
      const b = categories[swapWith]
      await Promise.all([
        supabase.from('categories').update({ sort_order: b.sort_order }).eq('id', a.id),
        supabase.from('categories').update({ sort_order: a.sort_order }).eq('id', b.id),
      ])
      await refresh()
    },
    [categories, refresh],
  )

  const remove = useCallback(
    async (id: string) => {
      // Las credenciales que usaban esta categoría quedan con el texto tal cual (no se borran ni se
      // reasignan solas); simplemente esa categoría deja de aparecer como opción para nuevas credenciales.
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) return error.message
      await refresh()
      return null
    },
    [refresh],
  )

  return { categories, loading, create, rename, move, remove, refresh }
}
