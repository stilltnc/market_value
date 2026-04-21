'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronDown, ChevronUp, Calculator, Save, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  formatCurrency,
  formatPercent,
  calculateAcquisitionCosts,
  calculateMonthlyScenarios,
  getVerdictLabel,
  getVerdictColor,
} from '@/lib/calculations'
import type { ViabilityScenario, MarketConsolidation, MonthlyScenarioResult, Verdict } from '@/types'

// ----------------------------------------------------------------
// Block component (expandable section)
// ----------------------------------------------------------------

function Block({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  )
}

// Numeric input helper
function NumField({
  label,
  value,
  onChange,
  prefix = 'R$',
  suffix,
  step = '1',
  min = '0',
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  prefix?: string | null
  suffix?: string
  step?: string
  min?: string
  hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-sm text-gray-400 shrink-0">{prefix}</span>}
        <input
          type="number" step={step} min={min}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {suffix && <span className="text-sm text-gray-400 shrink-0">{suffix}</span>}
      </div>
      {hint && <p className="text-[10px] text-blue-600 mt-0.5">{hint}</p>}
    </div>
  )
}

// Derived result row
function CalcRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between py-2 border-b border-gray-100 last:border-0', highlight && 'bg-blue-50 rounded px-2 -mx-2')}>
      <span className={cn('text-xs', highlight ? 'font-semibold text-blue-800' : 'text-gray-600')}>{label}</span>
      <span className={cn('text-xs font-semibold', highlight ? 'text-blue-700' : 'text-gray-900')}>{value}</span>
    </div>
  )
}

// Verdict color for table rows
const verdictRowColor: Record<Verdict, string> = {
  viavel: 'bg-green-50',
  limitrofe: 'bg-amber-50',
  revisar: 'bg-red-50',
  indefinido: 'bg-gray-50',
}

const verdictBadgeColor: Record<Verdict, string> = {
  viavel: 'bg-green-100 text-green-700',
  limitrofe: 'bg-amber-100 text-amber-700',
  revisar: 'bg-red-100 text-red-700',
  indefinido: 'bg-gray-100 text-gray-600',
}

// ----------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------

interface Props {
  analysisId: string
}

export function ViabilityView({ analysisId }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scenarios, setScenarios] = useState<MonthlyScenarioResult[]>([])
  const [viabilityScenario, setViabilityScenario] = useState<ViabilityScenario | null>(null)
  const [consolidation, setConsolidation] = useState<MarketConsolidation | null>(null)

  // ---- Bloco A: Leilão ----
  const [bidValue, setBidValue] = useState('500000')
  const [advisoryPct, setAdvisoryPct] = useState('5')
  const [advisoryMin, setAdvisoryMin] = useState('5000')
  const [auctioneerPct, setAuctioneerPct] = useState('5')

  // ---- Bloco B: Aquisição ----
  const [cartaArrematacao, setCartaArrematacao] = useState('500')
  const [baixaGravame, setBaixaGravame] = useState('1500')
  const [certidoes, setCertidoes] = useState('800')
  const [itbiBase, setItbiBase] = useState('')
  const [aliquotaItbi, setAliquotaItbi] = useState('3')
  const [escritura, setEscritura] = useState('3000')
  const [registro, setRegistro] = useState('2000')
  const [dividaIptu, setDividaIptu] = useState('0')
  const [dividaCondominio, setDividaCondominio] = useState('0')
  const [outrosAquisicao, setOutrosAquisicao] = useState('0')

  // ---- Bloco C: Imissão ----
  const [diligencia, setDiligencia] = useState('500')
  const [ajudaCusto, setAjudaCusto] = useState('0')
  const [gestaoDesocupacao, setGestaoDesocupacao] = useState('0')
  const [acaoJudicial, setAcaoJudicial] = useState('0')
  const [outrosImissao, setOutrosImissao] = useState('0')

  // ---- Bloco D: Gestão/Reforma ----
  const [condominioMensal, setCondominioMensal] = useState('1000')
  const [iptuMensal, setIptuMensal] = useState('300')
  const [reforma, setReforma] = useState('20000')
  const [outrosMensais, setOutrosMensais] = useState('0')
  const [outrosFixos, setOutrosFixos] = useState('0')

  // ---- Bloco E: Venda ----
  const [pfvOverride, setPfvOverride] = useState('')
  const [pfvJustificativa, setPfvJustificativa] = useState('')
  const [usePfvOverride, setUsePfvOverride] = useState(false)
  const [corretorPct, setCorretorPct] = useState('6')
  const [custoAquisicaoIR, setCustoAquisicaoIR] = useState('')
  const [aliquotaIR, setAliquotaIR] = useState('15')
  const [cbsPct, setCbsPct] = useState('0')
  const [ibsPct, setIbsPct] = useState('0')

  // Expected sale months
  const [expectedMonths, setExpectedMonths] = useState('6')

  const supabase = createClient()

  // ----------------------------------------------------------------
  // Derived calculations
  // ----------------------------------------------------------------
  const bid = parseFloat(bidValue) || 0
  const advisory_pct = (parseFloat(advisoryPct) || 0) / 100
  const advisory_min = parseFloat(advisoryMin) || 0
  const auctioneer_pct = (parseFloat(auctioneerPct) || 0) / 100

  const acqCosts = calculateAcquisitionCosts({
    bidValue: bid,
    advisoryPercentage: advisory_pct,
    advisoryMinimum: advisory_min,
    auctioneerPercentage: auctioneer_pct,
    auctionCertificate: parseFloat(cartaArrematacao) || 0,
    lienRelease: parseFloat(baixaGravame) || 0,
    certificates: parseFloat(certidoes) || 0,
    itbiBase: parseFloat(itbiBase || (bid > 0 ? bid.toString() : '0')) || 0,
    itbiRate: (parseFloat(aliquotaItbi) || 0) / 100,
    deed: parseFloat(escritura) || 0,
    registration: parseFloat(registro) || 0,
    iptuDebt: parseFloat(dividaIptu) || 0,
    condoDebt: parseFloat(dividaCondominio) || 0,
    otherAcquisitionCosts: parseFloat(outrosAquisicao) || 0,
  })

  const possessionTotal =
    (parseFloat(diligencia) || 0) +
    (parseFloat(ajudaCusto) || 0) +
    (parseFloat(gestaoDesocupacao) || 0) +
    (parseFloat(acaoJudicial) || 0) +
    (parseFloat(outrosImissao) || 0)

  const fixedManagement = (parseFloat(reforma) || 0) + (parseFloat(outrosFixos) || 0)
  const monthlyCarrying = (parseFloat(condominioMensal) || 0) + (parseFloat(iptuMensal) || 0) + (parseFloat(outrosMensais) || 0)

  const pfvFromConsolidation = consolidation?.pfv ?? 0
  const pfvFinal = usePfvOverride ? (parseFloat(pfvOverride) || 0) : pfvFromConsolidation
  const capitalGain = pfvFinal - (parseFloat(custoAquisicaoIR || bidValue) || 0)

  // ----------------------------------------------------------------
  // Fetch
  // ----------------------------------------------------------------
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [viabilityRes, consolidationRes] = await Promise.all([
        supabase.from('viability_scenarios').select('*, cost_items(*)').eq('analysis_id', analysisId).maybeSingle(),
        supabase.from('market_consolidations').select('*').eq('analysis_id', analysisId).maybeSingle(),
      ])
      if (viabilityRes.error) throw viabilityRes.error
      if (consolidationRes.error) throw consolidationRes.error

      setViabilityScenario(viabilityRes.data as ViabilityScenario | null)
      setConsolidation(consolidationRes.data as MarketConsolidation | null)

      // Pre-fill from saved data
      const v = viabilityRes.data as ViabilityScenario | null
      if (v) {
        if (v.bid_value) setBidValue(v.bid_value.toString())
        setAdvisoryPct((v.advisory_percentage * 100).toFixed(1))
        setAdvisoryMin(v.advisory_minimum.toString())
        setAuctioneerPct((v.auctioneer_percentage * 100).toFixed(1))
        if (v.expected_sale_months) setExpectedMonths(v.expected_sale_months.toString())
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [analysisId])

  useEffect(() => { fetchData() }, [fetchData])

  // ----------------------------------------------------------------
  // Calculate scenarios
  // ----------------------------------------------------------------
  function handleCalculate() {
    const result = calculateMonthlyScenarios(
      {
        bidValue: bid,
        advisory: acqCosts.advisory,
        auctioneerCommission: acqCosts.auctioneerCommission,
        acquisitionTotal: acqCosts.acquisitionTotal,
        possessionTotal,
        fixedManagementTotal: fixedManagement,
        monthlyCarryingCost: monthlyCarrying,
        pfv: pfvFinal,
        brokerCommissionRate: (parseFloat(corretorPct) || 0) / 100,
        acquisitionCostForIR: parseFloat(custoAquisicaoIR || bidValue) || 0,
        irRate: (parseFloat(aliquotaIR) || 15) / 100,
        cbsRate: (parseFloat(cbsPct) || 0) / 100,
        ibsRate: (parseFloat(ibsPct) || 0) / 100,
      },
      [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    )
    setScenarios(result)
  }

  // ----------------------------------------------------------------
  // Save
  // ----------------------------------------------------------------
  async function handleSave() {
    setSaving(true)
    try {
      const targetScenario = scenarios.find((s) => s.months === parseInt(expectedMonths)) ?? scenarios[0]
      const payload = {
        analysis_id: analysisId,
        bid_value: bid,
        advisory_percentage: advisory_pct,
        advisory_minimum: advisory_min,
        auctioneer_percentage: auctioneer_pct,
        immediate_disbursement: acqCosts.immediatePayment,
        acquisition_total: acqCosts.acquisitionTotal,
        possession_total: possessionTotal,
        fixed_management_total: fixedManagement,
        monthly_carrying_cost: monthlyCarrying,
        pfv: pfvFinal,
        expected_sale_months: parseInt(expectedMonths) || 6,
        net_profit: targetScenario?.net_profit,
        roi: targetScenario?.roi,
        annualized_return: targetScenario?.annualized_return,
        verdict: targetScenario?.verdict,
        updated_at: new Date().toISOString(),
      }

      if (viabilityScenario?.id) {
        const { error: err } = await supabase.from('viability_scenarios').update(payload).eq('id', viabilityScenario.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('viability_scenarios').insert(payload)
        if (err) throw err
      }
      alert('Viabilidade salva com sucesso!')
      await fetchData()
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
        Carregando viabilidade...
      </div>
    )
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
  }

  const targetScenario = scenarios.find((s) => s.months === parseInt(expectedMonths))
  const finalVerdict: Verdict = targetScenario?.verdict ?? 'indefinido'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Análise de Viabilidade</h2>
        <div className="flex gap-2">
          <button
            onClick={handleCalculate}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            <Calculator size={14} />
            Calcular
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* PFV notice */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-medium text-blue-800">PFV do Consolidado</p>
          <p className="text-lg font-bold text-blue-700">{formatCurrency(pfvFromConsolidation)}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-blue-800 cursor-pointer">
            <input
              type="checkbox"
              checked={usePfvOverride}
              onChange={(e) => setUsePfvOverride(e.target.checked)}
              className="rounded"
            />
            Substituir PFV
          </label>
          {usePfvOverride && (
            <>
              <input
                type="number" min="0"
                value={pfvOverride}
                onChange={(e) => setPfvOverride(e.target.value)}
                placeholder="R$ PFV"
                className="w-36 rounded-md border border-blue-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={pfvJustificativa}
                onChange={(e) => setPfvJustificativa(e.target.value)}
                placeholder="Justificativa"
                className="w-48 rounded-md border border-blue-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </>
          )}
        </div>
      </div>

      {/* Cost Blocks */}
      <Block title="A. Bloco Leilão" defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4">
          <NumField label="Lance (R$)" value={bidValue} onChange={setBidValue} />
          <NumField label="Honorário assessoria (%)" value={advisoryPct} onChange={setAdvisoryPct} prefix="%" suffix="" step="0.1" />
          <NumField label="Mínimo assessoria (R$)" value={advisoryMin} onChange={setAdvisoryMin} />
          <NumField label="Comissão leiloeiro (%)" value={auctioneerPct} onChange={setAuctioneerPct} prefix="%" suffix="" step="0.1" />
        </div>
        <div className="mt-4 space-y-0 bg-gray-50 rounded-lg p-3">
          <CalcRow label="Honorário calculado" value={formatCurrency(acqCosts.advisory)} />
          <CalcRow label="Comissão leiloeiro" value={formatCurrency(acqCosts.auctioneerCommission)} />
          <CalcRow label="Desembolso imediato" value={formatCurrency(acqCosts.immediatePayment)} highlight />
        </div>
      </Block>

      <Block title="B. Bloco Aquisição">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4">
          <NumField label="Carta arrematação" value={cartaArrematacao} onChange={setCartaArrematacao} />
          <NumField label="Baixa gravame" value={baixaGravame} onChange={setBaixaGravame} />
          <NumField label="Certidões" value={certidoes} onChange={setCertidoes} />
          <NumField label="Base ITBI (R$)" value={itbiBase} onChange={setItbiBase} hint={`Deixe em branco para usar lance (${formatCurrency(bid)})`} />
          <NumField label="Alíquota ITBI (%)" value={aliquotaItbi} onChange={setAliquotaItbi} prefix="%" step="0.1" />
          <NumField label="Escritura" value={escritura} onChange={setEscritura} />
          <NumField label="Registro" value={registro} onChange={setRegistro} />
          <NumField label="Dívida IPTU" value={dividaIptu} onChange={setDividaIptu} />
          <NumField label="Dívida Condomínio" value={dividaCondominio} onChange={setDividaCondominio} />
          <NumField label="Outros" value={outrosAquisicao} onChange={setOutrosAquisicao} />
        </div>
        <div className="mt-4 bg-gray-50 rounded-lg p-3 space-y-0">
          <CalcRow label="ITBI calculado" value={formatCurrency(acqCosts.itbi)} />
          <CalcRow label="Total aquisição" value={formatCurrency(acqCosts.acquisitionTotal)} highlight />
        </div>
      </Block>

      <Block title="C. Bloco Imissão de Posse">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4">
          <NumField label="Diligência" value={diligencia} onChange={setDiligencia} />
          <NumField label="Ajuda de custo" value={ajudaCusto} onChange={setAjudaCusto} />
          <NumField label="Gestão desocupação" value={gestaoDesocupacao} onChange={setGestaoDesocupacao} />
          <NumField label="Ação judicial" value={acaoJudicial} onChange={setAcaoJudicial} />
          <NumField label="Outros" value={outrosImissao} onChange={setOutrosImissao} />
        </div>
        <div className="mt-4 bg-gray-50 rounded-lg p-3">
          <CalcRow label="Total imissão" value={formatCurrency(possessionTotal)} highlight />
        </div>
      </Block>

      <Block title="D. Bloco Gestão / Reforma">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4">
          <NumField label="Condomínio mensal" value={condominioMensal} onChange={setCondominioMensal} />
          <NumField label="IPTU mensal" value={iptuMensal} onChange={setIptuMensal} />
          <NumField label="Reforma" value={reforma} onChange={setReforma} />
          <NumField label="Outros mensais" value={outrosMensais} onChange={setOutrosMensais} />
          <NumField label="Outros fixos" value={outrosFixos} onChange={setOutrosFixos} />
        </div>
        <div className="mt-4 bg-gray-50 rounded-lg p-3 space-y-0">
          <CalcRow label="Total fixo gestão" value={formatCurrency(fixedManagement)} />
          <CalcRow label="Custo mensal de carregamento" value={formatCurrency(monthlyCarrying)} highlight />
        </div>
      </Block>

      <Block title="E. Bloco Venda">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4">
          <div className="sm:col-span-2 md:col-span-3">
            <p className="text-xs text-gray-500 mb-1">PFV utilizado: <strong>{formatCurrency(pfvFinal)}</strong>{usePfvOverride && ' (substituído manualmente)'}</p>
          </div>
          <NumField label="Comissão corretor (%)" value={corretorPct} onChange={setCorretorPct} prefix="%" step="0.5" />
          <NumField label="Custo aquisição para IR (R$)" value={custoAquisicaoIR} onChange={setCustoAquisicaoIR} hint={`Padrão: lance (${formatCurrency(bid)})`} />
          <NumField label="Alíquota IR (%)" value={aliquotaIR} onChange={setAliquotaIR} prefix="%" step="0.5" />
          <NumField label="CBS (%)" value={cbsPct} onChange={setCbsPct} prefix="%" step="0.1" />
          <NumField label="IBS (%)" value={ibsPct} onChange={setIbsPct} prefix="%" step="0.1" />
        </div>
        <div className="mt-4 bg-gray-50 rounded-lg p-3 space-y-0">
          <CalcRow label="Ganho de capital estimado" value={formatCurrency(Math.max(capitalGain, 0))} />
          <CalcRow label="IR estimado" value={formatCurrency(Math.max(capitalGain, 0) * (parseFloat(aliquotaIR) || 15) / 100)} />
          <CalcRow label="Comissão corretor" value={formatCurrency(pfvFinal * (parseFloat(corretorPct) || 0) / 100)} highlight />
        </div>
      </Block>

      {/* Scenarios Table */}
      {scenarios.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp size={15} className="text-blue-600" />
              Cenários por Prazo de Venda
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Prazo estimado:</span>
              <select
                value={expectedMonths}
                onChange={(e) => setExpectedMonths(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                  <option key={m} value={m}>{m} meses</option>
                ))}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Meses</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Custo carregamento</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Custo total</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Lucro líquido</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">ROI</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Retorno anualizado</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Veredito</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {scenarios.map((s) => {
                  const isTarget = s.months === parseInt(expectedMonths)
                  return (
                    <tr
                      key={s.months}
                      className={cn(
                        'transition-colors',
                        isTarget ? 'ring-2 ring-inset ring-blue-400 bg-blue-50' : verdictRowColor[s.verdict]
                      )}
                    >
                      <td className="text-center px-4 py-3 text-xs font-medium text-gray-800">
                        {s.months}
                        {isTarget && <span className="ml-1 text-[10px] text-blue-600">← estimado</span>}
                      </td>
                      <td className="text-right px-4 py-3 text-xs text-gray-700">{formatCurrency(s.carrying_cost)}</td>
                      <td className="text-right px-4 py-3 text-xs text-gray-700">{formatCurrency(s.total_cost)}</td>
                      <td className={cn('text-right px-4 py-3 text-xs font-semibold', s.net_profit >= 0 ? 'text-green-700' : 'text-red-700')}>
                        {formatCurrency(s.net_profit)}
                      </td>
                      <td className="text-right px-4 py-3 text-xs font-semibold">{formatPercent(s.roi)}</td>
                      <td className="text-right px-4 py-3 text-xs">{formatPercent(s.annualized_return)}</td>
                      <td className="text-center px-4 py-3">
                        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', verdictBadgeColor[s.verdict])}>
                          {getVerdictLabel(s.verdict)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Final Verdict */}
      {targetScenario && (
        <div className={cn(
          'rounded-xl border p-6 flex items-center gap-4',
          verdictRowColor[finalVerdict],
          finalVerdict === 'viavel' ? 'border-green-200' : finalVerdict === 'limitrofe' ? 'border-amber-200' : 'border-red-200'
        )}>
          <div className={cn('h-4 w-4 rounded-full shrink-0', {
            'bg-green-500': finalVerdict === 'viavel',
            'bg-amber-500': finalVerdict === 'limitrofe',
            'bg-red-500': finalVerdict === 'revisar',
            'bg-gray-400': finalVerdict === 'indefinido',
          })} />
          <div>
            <p className="text-base font-bold text-gray-900">
              Veredito final: {getVerdictLabel(finalVerdict)}
            </p>
            <p className="text-sm text-gray-600">
              Em {expectedMonths} meses — Lucro: {formatCurrency(targetScenario.net_profit)} · ROI: {formatPercent(targetScenario.roi)} · Retorno anual: {formatPercent(targetScenario.annualized_return)}
            </p>
          </div>
        </div>
      )}

      {scenarios.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-500">Preencha os blocos acima e clique em <strong>Calcular</strong> para ver os cenários.</p>
        </div>
      )}
    </div>
  )
}
