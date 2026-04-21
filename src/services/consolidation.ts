/**
 * Serviço de CRUD para Consolidado de Mercado
 */

import { createClient } from '@/lib/supabase/client'
import type { MarketConsolidation } from '@/types'
import {
  calculateWeightedMarketValue,
  type ConsolidationParams,
} from '@/lib/calculations'
import { getComparables } from './comparables'
import { getBrokerOpinions } from './brokers'
import { getAnalysis } from './analyses'

export async function getConsolidation(
  analysisId: string
): Promise<MarketConsolidation | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('market_consolidations')
    .select('*')
    .eq('analysis_id', analysisId)
    .maybeSingle()

  if (error) {
    throw new Error(`Erro ao buscar consolidado: ${error.message}`)
  }

  return data as MarketConsolidation | null
}

export async function upsertConsolidation(
  analysisId: string,
  data: Partial<MarketConsolidation>
): Promise<MarketConsolidation> {
  const supabase = createClient()

  const existing = await getConsolidation(analysisId)

  if (existing) {
    const { data: updated, error } = await supabase
      .from('market_consolidations')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('analysis_id', analysisId)
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao atualizar consolidado: ${error.message}`)
    }

    return updated as MarketConsolidation
  } else {
    const { data: created, error } = await supabase
      .from('market_consolidations')
      .insert({ ...data, analysis_id: analysisId })
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao criar consolidado: ${error.message}`)
    }

    return created as MarketConsolidation
  }
}

export async function recalculateConsolidation(
  analysisId: string
): Promise<MarketConsolidation> {
  // Buscar dados necessários
  const [analysis, allComparables, brokerOpinions, existing] = await Promise.all([
    getAnalysis(analysisId),
    getComparables(analysisId),
    getBrokerOpinions(analysisId),
    getConsolidation(analysisId),
  ])

  const targetArea = analysis.target_property?.private_area ?? 0

  const condoListings = allComparables.filter((c) => c.scope === 'mesmo_condominio')
  const neighborhoodListings = allComparables.filter((c) => c.scope === 'bairro')
  const radiusListings = allComparables.filter((c) => c.scope === 'raio_5km')

  const params: ConsolidationParams = {
    condoListings,
    neighborhoodListings,
    radiusListings,
    brokerOpinions,
    targetArea,
    condoWeight: existing?.condo_weight ?? 0.35,
    neighborhoodWeight: existing?.neighborhood_weight ?? 0.25,
    radiusWeight: existing?.radius_weight ?? 0.20,
    brokerWeight: existing?.broker_weight ?? 0.20,
    normalizeWeights_: existing?.normalize_weights ?? true,
    negotiationDiscount: existing?.negotiation_discount ?? 0.11,
  }

  const result = calculateWeightedMarketValue(params)

  const updateData: Partial<MarketConsolidation> = {
    condo_avg_price_per_sqm: result.sources.find((s) => s.name === 'condo')?.avg_price_per_sqm,
    neighborhood_avg_price_per_sqm: result.sources.find((s) => s.name === 'neighborhood')?.avg_price_per_sqm,
    radius_avg_price_per_sqm: result.sources.find((s) => s.name === 'radius')?.avg_price_per_sqm,
    broker_avg_price_per_sqm: result.sources.find((s) => s.name === 'broker')?.avg_price_per_sqm,
    weighted_price_per_sqm: result.weighted_price_per_sqm,
    estimated_value: result.estimated_value,
    pfv: result.pfv,
    conservative_value: result.conservative_value,
    optimistic_value: result.optimistic_value,
    confidence_score: result.has_sufficient_data ? 80 : 40,
  }

  return upsertConsolidation(analysisId, updateData)
}
