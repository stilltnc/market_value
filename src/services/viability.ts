/**
 * Serviço de CRUD para Viabilidade
 */

import { createClient } from '@/lib/supabase/client'
import type { ViabilityScenario, CostItem, ViabilityMonthlyScenario } from '@/types'
import {
  calculateMonthlyScenarios,
  type ViabilityParams,
} from '@/lib/calculations'
import { getConsolidation } from './consolidation'
import { getAnalysis } from './analyses'

export async function getViabilityScenario(
  analysisId: string
): Promise<ViabilityScenario | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('viability_scenarios')
    .select(`
      *,
      monthly_scenarios: viability_monthly_scenarios (*),
      cost_items (*)
    `)
    .eq('analysis_id', analysisId)
    .maybeSingle()

  if (error) {
    throw new Error(`Erro ao buscar cenário de viabilidade: ${error.message}`)
  }

  return data as unknown as ViabilityScenario | null
}

export async function upsertViabilityScenario(
  analysisId: string,
  data: Partial<ViabilityScenario>
): Promise<ViabilityScenario> {
  const supabase = createClient()

  const existing = await getViabilityScenario(analysisId)

  if (existing) {
    const { data: updated, error } = await supabase
      .from('viability_scenarios')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('analysis_id', analysisId)
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao atualizar cenário de viabilidade: ${error.message}`)
    }

    return updated as ViabilityScenario
  } else {
    const { data: created, error } = await supabase
      .from('viability_scenarios')
      .insert({ ...data, analysis_id: analysisId })
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao criar cenário de viabilidade: ${error.message}`)
    }

    return created as ViabilityScenario
  }
}

export async function getCostItems(
  analysisId: string,
  viabilityScenarioId?: string
): Promise<CostItem[]> {
  const supabase = createClient()

  let query = supabase
    .from('cost_items')
    .select('*')
    .eq('analysis_id', analysisId)
    .order('created_at', { ascending: true })

  if (viabilityScenarioId) {
    query = query.eq('viability_scenario_id', viabilityScenarioId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Erro ao buscar itens de custo: ${error.message}`)
  }

  return (data as CostItem[]) ?? []
}

export async function upsertCostItem(data: Partial<CostItem>): Promise<CostItem> {
  const supabase = createClient()

  if (data.id) {
    const { data: updated, error } = await supabase
      .from('cost_items')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', data.id)
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao atualizar item de custo: ${error.message}`)
    }

    return updated as CostItem
  } else {
    const { data: created, error } = await supabase
      .from('cost_items')
      .insert(data)
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao criar item de custo: ${error.message}`)
    }

    return created as CostItem
  }
}

export async function deleteCostItem(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('cost_items')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Erro ao excluir item de custo: ${error.message}`)
  }
}

export async function recalculateViability(
  analysisId: string
): Promise<ViabilityScenario | null> {
  const [scenario, consolidation, analysis] = await Promise.all([
    getViabilityScenario(analysisId),
    getConsolidation(analysisId),
    getAnalysis(analysisId),
  ])

  if (!scenario) return null

  const bidValue = scenario.bid_value ?? 0
  const advisory = Math.max(
    bidValue * scenario.advisory_percentage,
    scenario.advisory_minimum
  )
  const auctioneerCommission = bidValue * scenario.auctioneer_percentage

  // Buscar itens de custo
  const costItems = await getCostItems(analysisId, scenario.id)

  const acquisitionItems = costItems.filter((i) => i.category === 'aquisicao' && !i.is_monthly)
  const possessionItems = costItems.filter((i) => i.category === 'imissao_posse' && !i.is_monthly)
  const managementItems = costItems.filter((i) => i.category === 'gestao_reforma' && !i.is_monthly)
  const monthlyItems = costItems.filter((i) => i.is_monthly)
  const saleItems = costItems.filter((i) => i.category === 'venda' && !i.is_monthly)

  const sumItems = (items: CostItem[]) =>
    items.reduce((sum, item) => {
      const amount = item.amount ?? (item.percentage ?? 0) * (item.base_amount ?? bidValue)
      return sum + amount
    }, 0)

  const acquisitionTotal = sumItems(acquisitionItems)
  const possessionTotal = sumItems(possessionItems)
  const fixedManagementTotal = sumItems(managementItems)
  const monthlyCarryingCost = sumItems(monthlyItems)

  const pfv = consolidation?.pfv ?? scenario.pfv ?? 0
  const saleCostsTotal = sumItems(saleItems)

  const params: ViabilityParams = {
    bidValue,
    advisory,
    auctioneerCommission,
    acquisitionTotal,
    possessionTotal,
    fixedManagementTotal,
    monthlyCarryingCost,
    pfv,
    brokerCommissionRate: 0.06,
    acquisitionCostForIR: bidValue + advisory + auctioneerCommission + acquisitionTotal,
    otherSaleCosts: saleCostsTotal,
  }

  const monthlyScenarios = calculateMonthlyScenarios(params)

  // Cenário principal (6 meses por padrão)
  const mainScenario = monthlyScenarios.find((s) => s.months === 6) ?? monthlyScenarios[0]

  // Salvar cenário principal
  const updated = await upsertViabilityScenario(analysisId, {
    immediate_disbursement: bidValue + advisory + auctioneerCommission,
    acquisition_total: acquisitionTotal,
    possession_total: possessionTotal,
    fixed_management_total: fixedManagementTotal,
    monthly_carrying_cost: monthlyCarryingCost,
    pfv,
    sale_costs_total: saleCostsTotal,
    total_investment: mainScenario.total_cost,
    expected_sale_months: mainScenario.months,
    net_profit: mainScenario.net_profit,
    roi: mainScenario.roi,
    annualized_return: mainScenario.annualized_return,
    verdict: mainScenario.verdict,
  })

  // Salvar cenários mensais
  const supabase = createClient()

  // Apagar cenários anteriores
  await supabase
    .from('viability_monthly_scenarios')
    .delete()
    .eq('viability_scenario_id', scenario.id)

  // Inserir novos cenários
  const monthlyRows: Omit<ViabilityMonthlyScenario, 'id' | 'created_at'>[] = monthlyScenarios.map(
    (s) => ({
      viability_scenario_id: scenario.id,
      months: s.months,
      carrying_cost: s.carrying_cost,
      total_cost: s.total_cost,
      net_profit: s.net_profit,
      roi: s.roi,
      annualized_return: s.annualized_return,
      verdict: s.verdict,
    })
  )

  await supabase.from('viability_monthly_scenarios').insert(monthlyRows)

  return updated
}
