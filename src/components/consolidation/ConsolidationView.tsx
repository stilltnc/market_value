'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Save, AlertTriangle, TrendingUp, ChevronDown, ChevronUp, ToggleLeft, ToggleRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  formatCurrency,
  formatPercent,
  formatPricePerSqm,
  calculateWeightedMarketValue,
  getVerdictColor,
} from '@/lib/calculations'
import type {
  MarketConsolidation,
  ComparableListing,
  BrokerOpinion,
  CalculatedConsolidation,
  ConsolidationSource,
} from '@/types'

// ----------------------------------------------------------------
// Source Card
// ----------------------------------------------------------------

function SourceCard({
  source,
  weight,
  onWeightChange,
}: {
  source: ConsolidationSource
  weight: number
  onWeightChange: (val: number) => void
}) {
  const hasData = source.avg_price_per_sqm !== undefined

  return (
    <div className={cn(
      'rounded-xl border p-4 flex flex-col gap-3 transition-all',
      hasData ? 'border-gray-200 bg-white' : 'border-dashed border-gray-200 bg-gray-50'
    )}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">{source.label}</h3>
        <span className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
          hasData ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
        )}>
          {source.count} imóvel{source.count !== 1 ? 'is' : ''}
        </span>
      </div>

      {hasData ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Médio</p>
            <p className="text-sm font-semibold text-gray-900">{formatPricePerSqm(source.avg_price_per_sqm)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Mediano</p>
            <p className="text-sm font-semibold text-gray-900">{formatPricePerSqm(source.median_price_per_sqm)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Mínimo</p>
            <p className="text-xs text-gray-600">{formatPricePerSqm(source.min_price_per_sqm)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Máximo</p>
            <p className="text-xs text-gray-600">{formatPricePerSqm(source.max_price_per_sqm)}</p>
          </div>
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-xs text-gray-400">Sem dados suficientes</p>
        </div>
      )}

      {/* Weight slider */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Peso</p>
          <p className="text-xs font-semibold text-blue-700">{(weight * 100).toFixed(0)}%</p>
        </div>
        <input
          type="range" min="0" max="100" step="1"
          value={Math.round(weight * 100)}
          onChange={(e) => onWeightChange(parseInt(e.target.value) / 100)}
          className="w-full h-1.5 appearance-none rounded-full bg-blue-100 accent-blue-600"
          disabled={!hasData}
        />
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------

interface Props {
  analysisId: string
}

export function ConsolidationView({ analysisId }: Props) {
  const [consolidation, setConsolidation] = useState<MarketConsolidation | null>(null)
  const [comparables, setComparables] = useState<ComparableListing[]>([])
  const [brokerOpinions, setBrokerOpinions] = useState<BrokerOpinion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Local state for weights & params
  const [condoWeight, setCondoWeight] = useState(0.35)
  const [neighborhoodWeight, setNeighborhoodWeight] = useState(0.25)
  const [radiusWeight, setRadiusWeight] = useState(0.20)
  const [brokerWeight, setBrokerWeight] = useState(0.20)
  const [normalizeWeights, setNormalizeWeights] = useState(true)
  const [discount, setDiscount] = useState(0.11)
  const [targetArea, setTargetArea] = useState(80)

  // Calculated result
  const [calc, setCalc] = useState<CalculatedConsolidation | null>(null)

  const supabase = createClient()

  // ----------------------------------------------------------------
  // Fetch data
  // ----------------------------------------------------------------
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [consolidationRes, comparablesRes, brokersRes, analysisRes] = await Promise.all([
        supabase
          .from('market_consolidations')
          .select('*')
          .eq('analysis_id', analysisId)
          .maybeSingle(),
        supabase
          .from('comparable_listings')
          .select('*')
          .eq('analysis_id', analysisId),
        supabase
          .from('broker_opinions')
          .select('*, broker: brokers(*)')
          .eq('analysis_id', analysisId),
        supabase
          .from('target_properties')
          .select('private_area')
          .eq('analysis_id', analysisId)
          .maybeSingle(),
      ])

      if (consolidationRes.error) throw consolidationRes.error
      if (comparablesRes.error) throw comparablesRes.error
      if (brokersRes.error) throw brokersRes.error

      const con = consolidationRes.data as MarketConsolidation | null
      setConsolidation(con)
      setComparables((comparablesRes.data as unknown as ComparableListing[]) ?? [])
      setBrokerOpinions((brokersRes.data as unknown as BrokerOpinion[]) ?? [])

      if (con) {
        setCondoWeight(con.condo_weight)
        setNeighborhoodWeight(con.neighborhood_weight)
        setRadiusWeight(con.radius_weight)
        setBrokerWeight(con.broker_weight)
        setNormalizeWeights(con.normalize_weights)
        setDiscount(con.negotiation_discount)
      }

      if (analysisRes.data?.private_area) {
        setTargetArea(analysisRes.data.private_area)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [analysisId])

  useEffect(() => { fetchData() }, [fetchData])

  // ----------------------------------------------------------------
  // Calculate
  // ----------------------------------------------------------------
  function recalculate() {
    const condoListings = comparables.filter((c) => c.scope === 'mesmo_condominio')
    const neighborhoodListings = comparables.filter((c) => c.scope === 'bairro')
    const radiusListings = comparables.filter((c) => c.scope === 'raio_5km')

    const result = calculateWeightedMarketValue({
      condoListings,
      neighborhoodListings,
      radiusListings,
      brokerOpinions,
      targetArea,
      condoWeight,
      neighborhoodWeight,
      radiusWeight,
      brokerWeight,
      normalizeWeights_: normalizeWeights,
      negotiationDiscount: discount,
      conservativeInterval: 0.92,
      optimisticInterval: 1.08,
    })
    setCalc(result)
  }

  useEffect(() => {
    if (!loading) recalculate()
  }, [loading, comparables, brokerOpinions, condoWeight, neighborhoodWeight, radiusWeight, brokerWeight, normalizeWeights, discount, targetArea])

  // ----------------------------------------------------------------
  // Save
  // ----------------------------------------------------------------
  async function handleSave() {
    if (!calc) return
    setSaving(true)
    try {
      const payload = {
        analysis_id: analysisId,
        condo_avg_price_per_sqm: calc.sources[0].avg_price_per_sqm,
        neighborhood_avg_price_per_sqm: calc.sources[1].avg_price_per_sqm,
        radius_avg_price_per_sqm: calc.sources[2].avg_price_per_sqm,
        broker_avg_price_per_sqm: calc.sources[3].avg_price_per_sqm,
        condo_weight: condoWeight,
        neighborhood_weight: neighborhoodWeight,
        radius_weight: radiusWeight,
        broker_weight: brokerWeight,
        normalize_weights: normalizeWeights,
        weighted_price_per_sqm: calc.weighted_price_per_sqm,
        estimated_value: calc.estimated_value,
        negotiation_discount: discount,
        pfv: calc.pfv,
        conservative_value: calc.conservative_value,
        optimistic_value: calc.optimistic_value,
        updated_at: new Date().toISOString(),
      }

      if (consolidation?.id) {
        const { error: err } = await supabase
          .from('market_consolidations')
          .update(payload)
          .eq('id', consolidation.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase
          .from('market_consolidations')
          .insert(payload)
        if (err) throw err
      }
      await fetchData()
      alert('Consolidado salvo com sucesso!')
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        Carregando consolidado...
      </div>
    )
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Consolidado de Mercado</h2>
        <div className="flex gap-2">
          <button
            onClick={recalculate}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={14} />
            Recalcular
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !calc}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Salvando...' : 'Salvar consolidado'}
          </button>
        </div>
      </div>

      {/* Target Area Input */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Área do imóvel alvo (m²):</label>
        <input
          type="number"
          min="1"
          step="0.01"
          value={targetArea}
          onChange={(e) => setTargetArea(parseFloat(e.target.value) || 80)}
          className="w-28 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {/* Normalize toggle */}
        <button
          onClick={() => setNormalizeWeights((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 ml-4"
        >
          {normalizeWeights ? <ToggleRight size={18} className="text-blue-600" /> : <ToggleLeft size={18} />}
          Normalizar pesos automaticamente
        </button>
      </div>

      {/* Source Cards */}
      {calc && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {calc.sources.map((source, idx) => {
            const weightSetters = [setCondoWeight, setNeighborhoodWeight, setRadiusWeight, setBrokerWeight]
            const weights = [condoWeight, neighborhoodWeight, radiusWeight, brokerWeight]
            return (
              <SourceCard
                key={source.name}
                source={source}
                weight={weights[idx]}
                onWeightChange={weightSetters[idx]}
              />
            )
          })}
        </div>
      )}

      {/* Warnings */}
      {calc && calc.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-1.5">
          <p className="text-sm font-medium text-amber-800 flex items-center gap-1.5">
            <AlertTriangle size={15} />
            Alertas
          </p>
          {calc.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-700 pl-5">· {w}</p>
          ))}
        </div>
      )}

      {/* Results Card */}
      {calc && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-600" />
            Resultado do Consolidado
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">R$/m² ponderado</p>
              <p className="text-xl font-bold text-gray-900">{formatPricePerSqm(calc.weighted_price_per_sqm)}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Valor estimado</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(calc.estimated_value)}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Deságio</p>
              <div className="flex items-center gap-2">
                <input
                  type="number" min="0" max="50" step="0.5"
                  value={(discount * 100).toFixed(1)}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) / 100)}
                  className="w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">PFV</p>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(calc.pfv)}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Intervalo conservador</p>
              <p className="text-lg font-semibold text-gray-700">{formatCurrency(calc.conservative_value)}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Intervalo otimista</p>
              <p className="text-lg font-semibold text-gray-700">{formatCurrency(calc.optimistic_value)}</p>
            </div>
          </div>

          {/* Verdict */}
          <div className={cn(
            'rounded-lg p-4 flex items-center gap-3',
            calc.has_sufficient_data ? 'bg-blue-50 border border-blue-200' : 'bg-amber-50 border border-amber-200'
          )}>
            <div className={cn('h-3 w-3 rounded-full', calc.has_sufficient_data ? 'bg-blue-500' : 'bg-amber-500')} />
            <div>
              <p className={cn('text-sm font-semibold', calc.has_sufficient_data ? 'text-blue-800' : 'text-amber-800')}>
                {calc.has_sufficient_data ? 'PFV calculado' : 'PFV preliminar — dados insuficientes'}
              </p>
              <p className={cn('text-xs', calc.has_sufficient_data ? 'text-blue-600' : 'text-amber-600')}>
                {calc.has_sufficient_data
                  ? `Baseado em ${comparables.filter((c) => c.use_in_calculation === 'usar').length} comparáveis e ${brokerOpinions.length} opinião(ões) de corretores`
                  : 'Adicione mais comparáveis ou opiniões de corretores para melhorar a confiabilidade'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {!calc && !loading && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-500">Nenhum dado disponível para calcular. Adicione comparáveis primeiro.</p>
        </div>
      )}
    </div>
  )
}
