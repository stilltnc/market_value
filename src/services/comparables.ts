/**
 * Serviço de CRUD para Comparáveis
 */

import { createClient } from '@/lib/supabase/client'
import type { ComparableListing } from '@/types'

const COMPARABLE_SELECT = `
  *,
  condominium: condominiums (*)
`

export async function getComparables(analysisId: string): Promise<ComparableListing[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('comparable_listings')
    .select(COMPARABLE_SELECT)
    .eq('analysis_id', analysisId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Erro ao buscar comparáveis: ${error.message}`)
  }

  return (data as unknown as ComparableListing[]) ?? []
}

export async function getComparable(id: string): Promise<ComparableListing> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('comparable_listings')
    .select(COMPARABLE_SELECT)
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Erro ao buscar comparável: ${error.message}`)
  }

  return data as unknown as ComparableListing
}

export async function createComparable(
  data: Partial<ComparableListing>
): Promise<ComparableListing> {
  const supabase = createClient()

  const { data: created, error } = await supabase
    .from('comparable_listings')
    .insert(data)
    .select(COMPARABLE_SELECT)
    .single()

  if (error) {
    throw new Error(`Erro ao criar comparável: ${error.message}`)
  }

  return created as unknown as ComparableListing
}

export async function updateComparable(
  id: string,
  data: Partial<ComparableListing>
): Promise<ComparableListing> {
  const supabase = createClient()

  const { data: updated, error } = await supabase
    .from('comparable_listings')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(COMPARABLE_SELECT)
    .single()

  if (error) {
    throw new Error(`Erro ao atualizar comparável: ${error.message}`)
  }

  return updated as unknown as ComparableListing
}

export async function deleteComparable(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('comparable_listings')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Erro ao excluir comparável: ${error.message}`)
  }
}

export async function bulkUpdateComparables(
  ids: string[],
  data: Partial<ComparableListing>
): Promise<void> {
  if (ids.length === 0) return

  const supabase = createClient()

  const { error } = await supabase
    .from('comparable_listings')
    .update({ ...data, updated_at: new Date().toISOString() })
    .in('id', ids)

  if (error) {
    throw new Error(`Erro ao atualizar comparáveis em lote: ${error.message}`)
  }
}
