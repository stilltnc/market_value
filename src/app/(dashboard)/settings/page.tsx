'use client'

import { useEffect, useState } from 'react'
import { Save, RotateCcw, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ----------------------------------------------------------------
// Settings type
// ----------------------------------------------------------------

interface AppSettings {
  // Pesos das fontes (0–100, somam 100)
  weight_condo: number
  weight_neighborhood: number
  weight_radius: number
  weight_broker: number

  // Parâmetros de PFV
  default_discount_pct: number
  conservative_interval_pct: number
  optimistic_interval_pct: number

  // Limiares de veredito
  roi_viable_threshold_pct: number
  roi_limitrofe_threshold_pct: number

  // Parâmetros de busca
  default_radius_km: number
  min_comparable_score: number

  // Parâmetros fiscais
  ir_rate_pct: number
  itbi_rate_pct: number
}

const DEFAULT_SETTINGS: AppSettings = {
  weight_condo: 35,
  weight_neighborhood: 25,
  weight_radius: 20,
  weight_broker: 20,
  default_discount_pct: 11,
  conservative_interval_pct: 8,
  optimistic_interval_pct: 8,
  roi_viable_threshold_pct: 25,
  roi_limitrofe_threshold_pct: 15,
  default_radius_km: 1,
  min_comparable_score: 50,
  ir_rate_pct: 15,
  itbi_rate_pct: 3,
}

const STORAGE_KEY = 'leilao_analytics_settings'

// ----------------------------------------------------------------
// Helper components
// ----------------------------------------------------------------

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 0.1,
  suffix,
  hint,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
  hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {suffix && <span className="text-sm text-gray-400 shrink-0">{suffix}</span>}
      </div>
      {hint && <p className="text-[10px] text-blue-600 mt-1">{hint}</p>}
    </div>
  )
}

// Weight slider with label
function WeightSlider({
  label,
  value,
  onChange,
  color,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  color: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-gray-700">{label}</label>
        <span className={cn('text-xs font-bold', color)}>{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 rounded-full appearance-none accent-blue-600 bg-gray-200"
      />
    </div>
  )
}

// ----------------------------------------------------------------
// Page
// ----------------------------------------------------------------

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [weightsTotal, setWeightsTotal] = useState(100)

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AppSettings>
        setSettings((prev) => ({ ...prev, ...parsed }))
      }
    } catch {
      // ignore
    }
  }, [])

  // Track weights total
  useEffect(() => {
    setWeightsTotal(
      settings.weight_condo +
      settings.weight_neighborhood +
      settings.weight_radius +
      settings.weight_broker
    )
  }, [settings.weight_condo, settings.weight_neighborhood, settings.weight_radius, settings.weight_broker])

  function set<K extends keyof AppSettings>(field: K, value: AppSettings[K]) {
    setSettings((prev) => ({ ...prev, [field]: value }))
  }

  function normalizeWeights() {
    const total = settings.weight_condo + settings.weight_neighborhood + settings.weight_radius + settings.weight_broker
    if (total === 0) return
    setSettings((prev) => ({
      ...prev,
      weight_condo: Math.round((prev.weight_condo / total) * 100),
      weight_neighborhood: Math.round((prev.weight_neighborhood / total) * 100),
      weight_radius: Math.round((prev.weight_radius / total) * 100),
      weight_broker: 100 - Math.round((prev.weight_condo / total) * 100) - Math.round((prev.weight_neighborhood / total) * 100) - Math.round((prev.weight_radius / total) * 100),
    }))
  }

  function handleReset() {
    if (!confirm('Redefinir todas as configurações para os valores padrão?')) return
    setSettings(DEFAULT_SETTINGS)
  }

  function handleSave() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      alert('Erro ao salvar configurações.')
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center">
            <Settings2 size={18} className="text-gray-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
            <p className="text-sm text-gray-500">Parâmetros padrão do sistema de análise</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <RotateCcw size={14} />
            Redefinir
          </button>
          <button
            onClick={handleSave}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-sm rounded-md transition-colors',
              saved ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
            )}
          >
            <Save size={14} />
            {saved ? 'Salvo!' : 'Salvar configurações'}
          </button>
        </div>
      </div>

      {/* Section 1: Weights */}
      <Section
        title="Pesos padrão das fontes"
        description="Define o peso de cada fonte no cálculo consolidado. A soma deve ser 100%."
      >
        <div className="space-y-4">
          <WeightSlider label="Condomínio" value={settings.weight_condo} onChange={(v) => set('weight_condo', v)} color="text-blue-600" />
          <WeightSlider label="Bairro" value={settings.weight_neighborhood} onChange={(v) => set('weight_neighborhood', v)} color="text-teal-600" />
          <WeightSlider label="Raio 5km" value={settings.weight_radius} onChange={(v) => set('weight_radius', v)} color="text-purple-600" />
          <WeightSlider label="Corretores" value={settings.weight_broker} onChange={(v) => set('weight_broker', v)} color="text-amber-600" />

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Total:</span>
              <span className={cn('text-sm font-bold', weightsTotal === 100 ? 'text-green-600' : 'text-red-600')}>
                {weightsTotal}%
              </span>
              {weightsTotal !== 100 && (
                <span className="text-xs text-red-500">(deve somar 100%)</span>
              )}
            </div>
            <button
              onClick={normalizeWeights}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Normalizar para 100%
            </button>
          </div>
        </div>
      </Section>

      {/* Section 2: PFV params */}
      <Section
        title="Parâmetros de PFV"
        description="Define o deságio de negociação e os intervalos de valor conservador/otimista."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <NumberField
            label="Deságio padrão"
            value={settings.default_discount_pct}
            onChange={(v) => set('default_discount_pct', v)}
            min={0} max={50} step={0.5}
            suffix="%"
            hint="Percentual de desconto aplicado ao Valor de Mercado para obter o PFV"
          />
          <NumberField
            label="Intervalo conservador"
            value={settings.conservative_interval_pct}
            onChange={(v) => set('conservative_interval_pct', v)}
            min={0} max={50} step={0.5}
            suffix="%"
            hint="Redução percentual sobre o PFV para o cenário conservador"
          />
          <NumberField
            label="Intervalo otimista"
            value={settings.optimistic_interval_pct}
            onChange={(v) => set('optimistic_interval_pct', v)}
            min={0} max={50} step={0.5}
            suffix="%"
            hint="Acréscimo percentual sobre o PFV para o cenário otimista"
          />
        </div>
      </Section>

      {/* Section 3: Verdict thresholds */}
      <Section
        title="Limiares de veredito"
        description="Define os limites de ROI para classificação dos cenários de viabilidade."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberField
            label="ROI mínimo viável"
            value={settings.roi_viable_threshold_pct}
            onChange={(v) => set('roi_viable_threshold_pct', v)}
            min={0} max={200} step={1}
            suffix="%"
            hint="Acima deste ROI: veredito Viável (verde)"
          />
          <NumberField
            label="ROI mínimo limítrofe"
            value={settings.roi_limitrofe_threshold_pct}
            onChange={(v) => set('roi_limitrofe_threshold_pct', v)}
            min={0} max={200} step={1}
            suffix="%"
            hint="Entre limítrofe e viável: veredito Limítrofe (âmbar). Abaixo: Revisar (vermelho)"
          />
        </div>
      </Section>

      {/* Section 4: Search params */}
      <Section
        title="Parâmetros de busca"
        description="Configurações padrão para buscas automáticas de comparáveis."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberField
            label="Raio padrão de busca"
            value={settings.default_radius_km}
            onChange={(v) => set('default_radius_km', v)}
            min={0.1} max={20} step={0.5}
            suffix="km"
          />
          <NumberField
            label="Score mínimo de comparável"
            value={settings.min_comparable_score}
            onChange={(v) => set('min_comparable_score', v)}
            min={0} max={100} step={5}
            hint="Comparáveis com score abaixo deste valor serão marcados para revisão"
          />
        </div>
      </Section>

      {/* Section 5: Tax params */}
      <Section
        title="Parâmetros fiscais"
        description="Alíquotas padrão utilizadas no cálculo de viabilidade."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberField
            label="Alíquota IR padrão"
            value={settings.ir_rate_pct}
            onChange={(v) => set('ir_rate_pct', v)}
            min={0} max={100} step={0.5}
            suffix="%"
            hint="IR sobre ganho de capital em venda de imóvel"
          />
          <NumberField
            label="Alíquota ITBI padrão"
            value={settings.itbi_rate_pct}
            onChange={(v) => set('itbi_rate_pct', v)}
            min={0} max={20} step={0.1}
            suffix="%"
            hint="Alíquota municipal de ITBI (varia por município)"
          />
        </div>
      </Section>

      {/* Storage notice */}
      <p className="text-xs text-gray-400 text-center">
        As configurações são armazenadas localmente no navegador (localStorage).
      </p>
    </div>
  )
}
