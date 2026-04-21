/**
 * Serviço de CRUD para Análises
 */

import { createClient } from '@/lib/supabase/client'
import type { Analysis, DashboardStats } from '@/types'

const ANALYSIS_SELECT = `
  *,
  target_property (
    *,
    condominium: condominiums (*)
  ),
  market_consolidation: market_consolidations (*),
  viability_scenario: viability_scenarios (*)
`

export async function getAnalyses(filters?: {
  status?: string
  city?: string
  neighborhood?: string
}): Promise<Analysis[]> {
  const supabase = createClient()

  let query = supabase
    .from('analyses')
    .select(ANALYSIS_SELECT)
    .order('updated_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.city) {
    query = query.eq('target_property.city', filters.city)
  }

  if (filters?.neighborhood) {
    query = query.eq('target_property.neighborhood', filters.neighborhood)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Erro ao buscar análises: ${error.message}`)
  }

  return (data as unknown as Analysis[]) ?? []
}

export async function getAnalysis(id: string): Promise<Analysis> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('analyses')
    .select(ANALYSIS_SELECT)
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Erro ao buscar análise: ${error.message}`)
  }

  return data as unknown as Analysis
}

export async function createAnalysis(data: Partial<Analysis>): Promise<Analysis> {
  const supabase = createClient()

  const { data: created, error } = await supabase
    .from('analyses')
    .insert(data)
    .select()
    .single()

  if (error) {
    throw new Error(`Erro ao criar análise: ${error.message}`)
  }

  return created as Analysis
}

export async function updateAnalysis(id: string, data: Partial<Analysis>): Promise<Analysis> {
  const supabase = createClient()

  const { data: updated, error } = await supabase
    .from('analyses')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(ANALYSIS_SELECT)
    .single()

  if (error) {
    throw new Error(`Erro ao atualizar análise: ${error.message}`)
  }

  return updated as unknown as Analysis
}

export async function deleteAnalysis(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('analyses')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Erro ao excluir análise: ${error.message}`)
  }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createClient()

  // Buscar todas as análises com os campos necessários
  const { data: analyses, error: analysesError } = await supabase
    .from('analyses')
    .select(`
      id,
      status,
      viability_scenario: viability_scenarios (
        roi,
        pfv,
        net_profit
      )
    `)

  if (analysesError) {
    throw new Error(`Erro ao buscar estatísticas: ${analysesError.message}`)
  }

  const { count: comparablesCount, error: compError } = await supabase
    .from('comparable_listings')
    .select('*', { count: 'exact', head: true })

  if (compError) {
    throw new Error(`Erro ao contar comparáveis: ${compError.message}`)
  }

  const { count: jobsCount, error: jobsError } = await supabase
    .from('search_jobs')
    .select('*', { count: 'exact', head: true })

  if (jobsError) {
    throw new Error(`Erro ao contar buscas: ${jobsError.message}`)
  }

  const list = (analyses ?? []) as Array<{
    id: string
    status: string
    viability_scenario?: { roi?: number; pfv?: number; net_profit?: number } | null
  }>

  const inProgress = list.filter((a) => a.status === 'em_analise').length
  const approved = list.filter((a) => a.status === 'aprovado').length
  const discarded = list.filter((a) => a.status === 'descartado').length
  const purchased = list.filter((a) => a.status === 'arrematado').length
  const sold = list.filter((a) => a.status === 'vendido').length

  const rois = list
    .map((a) => a.viability_scenario?.roi)
    .filter((r): r is number => typeof r === 'number' && !isNaN(r))

  const pfvs = list
    .map((a) => a.viability_scenario?.pfv)
    .filter((p): p is number => typeof p === 'number' && !isNaN(p))

  const profits = list
    .map((a) => a.viability_scenario?.net_profit)
    .filter((p): p is number => typeof p === 'number' && !isNaN(p))

  const avgRoi = rois.length > 0 ? rois.reduce((a, b) => a + b, 0) / rois.length : 0
  const avgPfv = pfvs.length > 0 ? pfvs.reduce((a, b) => a + b, 0) / pfvs.length : 0
  const totalProfit = profits.reduce((a, b) => a + b, 0)

  return {
    analyses_in_progress: inProgress,
    analyses_approved: approved,
    analyses_discarded: discarded,
    purchases_made: purchased,
    properties_sold: sold,
    avg_pfv: avgPfv,
    avg_roi: avgRoi,
    total_estimated_profit: totalProfit,
    total_comparables: comparablesCount ?? 0,
    total_search_jobs: jobsCount ?? 0,
  }
}
