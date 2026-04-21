'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Plus, Link2, Edit2, Check, X, AlertTriangle, ExternalLink,
  Filter, ChevronDown, Trash2, Search
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  formatCurrency,
  formatArea,
  calculatePricePerSqm,
  getSimilarityColor,
  getSimilarityLabel,
  detectPossibleDuplicates,
} from '@/lib/calculations'
import type {
  ComparableListing,
  ComparableScope,
  ComparableOrigin,
  ListingStatus,
  UseInCalculation,
  RenovatedStatus,
} from '@/types'

// ---------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------

interface ComparableFormData {
  title: string
  scope: ComparableScope
  origin: ComparableOrigin
  source_name: string
  source_url: string
  address: string
  neighborhood: string
  bedrooms: string
  parking_spaces: string
  private_area: string
  listed_price: string
  floor: string
  renovated_status: RenovatedStatus
  listing_status: ListingStatus
  use_in_calculation: UseInCalculation
  notes: string
}

const defaultForm: ComparableFormData = {
  title: '',
  scope: 'bairro',
  origin: 'manual',
  source_name: '',
  source_url: '',
  address: '',
  neighborhood: '',
  bedrooms: '',
  parking_spaces: '',
  private_area: '',
  listed_price: '',
  floor: '',
  renovated_status: 'nao_informado',
  listing_status: 'ativo',
  use_in_calculation: 'usar',
  notes: '',
}

const scopeLabels: Record<ComparableScope, string> = {
  mesmo_condominio: 'Mesmo Condomínio',
  bairro: 'Bairro',
  raio_5km: 'Raio 5km',
  outro: 'Outro',
}

const originLabels: Record<ComparableOrigin, string> = {
  busca_automatica: 'Busca Auto.',
  importacao_link: 'Importação Link',
  manual: 'Manual',
  corretor: 'Corretor',
  fonte_publica: 'Fonte Pública',
}

const originColors: Record<ComparableOrigin, string> = {
  busca_automatica: 'bg-purple-100 text-purple-700',
  importacao_link: 'bg-blue-100 text-blue-700',
  manual: 'bg-gray-100 text-gray-700',
  corretor: 'bg-teal-100 text-teal-700',
  fonte_publica: 'bg-orange-100 text-orange-700',
}

const useInCalcLabels: Record<UseInCalculation, string> = {
  usar: 'Usar',
  nao_usar: 'Não Usar',
  revisar: 'Revisar',
  duplicado: 'Duplicado',
  outlier: 'Outlier',
}

const useInCalcColors: Record<UseInCalculation, string> = {
  usar: 'bg-green-100 text-green-700',
  nao_usar: 'bg-red-100 text-red-700',
  revisar: 'bg-amber-100 text-amber-700',
  duplicado: 'bg-gray-100 text-gray-500',
  outlier: 'bg-orange-100 text-orange-700',
}

const listingStatusLabels: Record<ListingStatus, string> = {
  ativo: 'Ativo',
  removido: 'Removido',
  vendido: 'Vendido',
  duplicado: 'Duplicado',
  ignorado: 'Ignorado',
  pendente_revisao: 'Pend. Revisão',
}

// ---------------------------------------------------------------
// Comparable Form Component
// ---------------------------------------------------------------

function ComparableForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: ComparableFormData
  onSave: (data: ComparableFormData) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<ComparableFormData>(initial)

  const computedPricePerSqm = useMemo(() => {
    const price = parseFloat(form.listed_price)
    const area = parseFloat(form.private_area)
    if (!isNaN(price) && !isNaN(area) && area > 0) return price / area
    return null
  }, [form.listed_price, form.private_area])

  const set = (field: keyof ComparableFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Título */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Título</label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Ex: Apto 3 dormitórios - Vila Olímpia"
          />
        </div>

        {/* Escopo */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Escopo</label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.scope}
            onChange={(e) => set('scope', e.target.value as ComparableScope)}
          >
            {(Object.keys(scopeLabels) as ComparableScope[]).map((k) => (
              <option key={k} value={k}>{scopeLabels[k]}</option>
            ))}
          </select>
        </div>

        {/* Origem */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Origem</label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.origin}
            onChange={(e) => set('origin', e.target.value as ComparableOrigin)}
          >
            {(Object.keys(originLabels) as ComparableOrigin[]).map((k) => (
              <option key={k} value={k}>{originLabels[k]}</option>
            ))}
          </select>
        </div>

        {/* Fonte */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Nome da Fonte</label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.source_name}
            onChange={(e) => set('source_name', e.target.value)}
            placeholder="Ex: ZAP Imóveis"
          />
        </div>

        {/* URL */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">URL do Anúncio</label>
          <input
            type="url"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.source_url}
            onChange={(e) => set('source_url', e.target.value)}
            placeholder="https://..."
          />
        </div>

        {/* Endereço */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Endereço</label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            placeholder="Rua, número"
          />
        </div>

        {/* Bairro */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Bairro</label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.neighborhood}
            onChange={(e) => set('neighborhood', e.target.value)}
            placeholder="Ex: Pinheiros"
          />
        </div>

        {/* Quartos */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Quartos</label>
          <input
            type="number" min="0"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.bedrooms}
            onChange={(e) => set('bedrooms', e.target.value)}
          />
        </div>

        {/* Vagas */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Vagas</label>
          <input
            type="number" min="0"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.parking_spaces}
            onChange={(e) => set('parking_spaces', e.target.value)}
          />
        </div>

        {/* Área */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Área Privativa (m²)</label>
          <input
            type="number" min="0" step="0.01"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.private_area}
            onChange={(e) => set('private_area', e.target.value)}
          />
        </div>

        {/* Preço */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Preço Anunciado (R$)</label>
          <input
            type="number" min="0"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.listed_price}
            onChange={(e) => set('listed_price', e.target.value)}
          />
          {computedPricePerSqm !== null && (
            <p className="mt-1 text-xs text-blue-600 font-medium">
              R$/m² calculado: {formatCurrency(computedPricePerSqm)}/m²
            </p>
          )}
        </div>

        {/* Andar */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Andar</label>
          <input
            type="number" min="0"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.floor}
            onChange={(e) => set('floor', e.target.value)}
          />
        </div>

        {/* Reformado */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Reformado</label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.renovated_status}
            onChange={(e) => set('renovated_status', e.target.value as RenovatedStatus)}
          >
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
            <option value="parcial">Parcial</option>
            <option value="nao_informado">Não informado</option>
          </select>
        </div>

        {/* Status do Anúncio */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Status do Anúncio</label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.listing_status}
            onChange={(e) => set('listing_status', e.target.value as ListingStatus)}
          >
            {(Object.keys(listingStatusLabels) as ListingStatus[]).map((k) => (
              <option key={k} value={k}>{listingStatusLabels[k]}</option>
            ))}
          </select>
        </div>

        {/* Uso no Cálculo */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Uso no Cálculo</label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.use_in_calculation}
            onChange={(e) => set('use_in_calculation', e.target.value as UseInCalculation)}
          >
            {(Object.keys(useInCalcLabels) as UseInCalculation[]).map((k) => (
              <option key={k} value={k}>{useInCalcLabels[k]}</option>
            ))}
          </select>
        </div>

        {/* Observações */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Observações</label>
          <textarea
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={saving}
          className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------

interface Props {
  analysisId: string
}

export function ComparablesList({ analysisId }: Props) {
  const [comparables, setComparables] = useState<ComparableListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [scopeFilter, setScopeFilter] = useState<string>('todos')
  const [originFilter, setOriginFilter] = useState<string>('todos')
  const [useFilter, setUseFilter] = useState<string>('todos')
  const [statusFilter, setStatusFilter] = useState<string>('todos')

  // Modal state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<ComparableFormData>(defaultForm)
  const [saving, setSaving] = useState(false)

  // URL import
  const [showUrlImport, setShowUrlImport] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [importLoading, setImportLoading] = useState(false)

  const supabase = createClient()

  // ----------------------------------------------------------------
  // Fetch
  // ----------------------------------------------------------------
  async function fetchComparables() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('comparable_listings')
        .select('*, condominium: condominiums (*)')
        .eq('analysis_id', analysisId)
        .order('created_at', { ascending: false })
      if (err) throw err
      setComparables((data as unknown as ComparableListing[]) ?? [])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchComparables() }, [analysisId])

  // ----------------------------------------------------------------
  // Filters
  // ----------------------------------------------------------------
  const filtered = useMemo(() => {
    return comparables.filter((c) => {
      if (scopeFilter !== 'todos' && c.scope !== scopeFilter) return false
      if (originFilter !== 'todos' && c.origin !== originFilter) return false
      if (useFilter !== 'todos' && c.use_in_calculation !== useFilter) return false
      if (statusFilter !== 'todos' && c.listing_status !== statusFilter) return false
      return true
    })
  }, [comparables, scopeFilter, originFilter, useFilter, statusFilter])

  // Duplicate detection
  const duplicates = useMemo(() => detectPossibleDuplicates(comparables), [comparables])

  // ----------------------------------------------------------------
  // Actions
  // ----------------------------------------------------------------
  async function handleSave(data: ComparableFormData) {
    setSaving(true)
    try {
      const payload: Partial<ComparableListing> = {
        analysis_id: analysisId,
        title: data.title || undefined,
        scope: data.scope,
        origin: data.origin,
        source_name: data.source_name || undefined,
        source_url: data.source_url || undefined,
        address: data.address || undefined,
        neighborhood: data.neighborhood || undefined,
        bedrooms: data.bedrooms ? parseInt(data.bedrooms) : undefined,
        parking_spaces: data.parking_spaces ? parseInt(data.parking_spaces) : undefined,
        private_area: data.private_area ? parseFloat(data.private_area) : undefined,
        listed_price: data.listed_price ? parseFloat(data.listed_price) : undefined,
        floor: data.floor ? parseInt(data.floor) : undefined,
        renovated_status: data.renovated_status,
        listing_status: data.listing_status,
        use_in_calculation: data.use_in_calculation,
        notes: data.notes || undefined,
      }

      // Calculate price_per_sqm
      if (payload.listed_price && payload.private_area) {
        payload.price_per_sqm = calculatePricePerSqm(payload.listed_price, payload.private_area)
      }

      if (editingId) {
        const { error: err } = await supabase
          .from('comparable_listings')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingId)
        if (err) throw err
      } else {
        const { error: err } = await supabase
          .from('comparable_listings')
          .insert({ ...payload, is_outlier: false })
        if (err) throw err
      }
      setShowForm(false)
      setEditingId(null)
      setFormData(defaultForm)
      await fetchComparables()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleUseToggle(id: string, current: UseInCalculation) {
    const next: UseInCalculation = current === 'usar' ? 'nao_usar' : 'usar'
    await supabase
      .from('comparable_listings')
      .update({ use_in_calculation: next, updated_at: new Date().toISOString() })
      .eq('id', id)
    await fetchComparables()
  }

  async function handleMarkOutlier(id: string) {
    await supabase
      .from('comparable_listings')
      .update({ is_outlier: true, use_in_calculation: 'outlier', updated_at: new Date().toISOString() })
      .eq('id', id)
    await fetchComparables()
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este comparável?')) return
    await supabase.from('comparable_listings').delete().eq('id', id)
    await fetchComparables()
  }

  function openEdit(c: ComparableListing) {
    setFormData({
      title: c.title ?? '',
      scope: c.scope,
      origin: c.origin,
      source_name: c.source_name ?? '',
      source_url: c.source_url ?? '',
      address: c.address ?? '',
      neighborhood: c.neighborhood ?? '',
      bedrooms: c.bedrooms?.toString() ?? '',
      parking_spaces: c.parking_spaces?.toString() ?? '',
      private_area: c.private_area?.toString() ?? '',
      listed_price: c.listed_price?.toString() ?? '',
      floor: c.floor?.toString() ?? '',
      renovated_status: c.renovated_status ?? 'nao_informado',
      listing_status: c.listing_status,
      use_in_calculation: c.use_in_calculation,
      notes: c.notes ?? '',
    })
    setEditingId(c.id)
    setShowForm(true)
  }

  async function handleImportUrl() {
    if (!importUrl.trim()) return
    setImportLoading(true)
    try {
      // Create a comparable from URL (placeholder implementation)
      const payload: Partial<ComparableListing> = {
        analysis_id: analysisId,
        source_url: importUrl,
        origin: 'importacao_link',
        scope: 'bairro',
        listing_status: 'ativo',
        use_in_calculation: 'revisar',
        is_outlier: false,
        title: `Importado: ${importUrl.substring(0, 60)}`,
      }
      const { error: err } = await supabase.from('comparable_listings').insert(payload)
      if (err) throw err
      setImportUrl('')
      setShowUrlImport(false)
      await fetchComparables()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao importar')
    } finally {
      setImportLoading(false)
    }
  }

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Comparáveis</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowUrlImport((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Link2 size={15} />
            Importar por URL
          </button>
          <button
            onClick={() => { setFormData(defaultForm); setEditingId(null); setShowForm(true) }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus size={15} />
            Adicionar Comparável
          </button>
        </div>
      </div>

      {/* URL Import Form */}
      {showUrlImport && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Cole a URL do anúncio (ZAP, VivaReal, Quinto Andar...)"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
          />
          <button
            onClick={handleImportUrl}
            disabled={importLoading}
            className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
          >
            {importLoading ? 'Importando...' : 'Importar'}
          </button>
          <button onClick={() => setShowUrlImport(false)} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Duplicate Alerts */}
      {duplicates.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
          <p className="text-sm font-medium text-amber-800 flex items-center gap-1.5">
            <AlertTriangle size={15} />
            {duplicates.length} possível{duplicates.length > 1 ? 'is' : ''} duplicado{duplicates.length > 1 ? 's' : ''} detectado{duplicates.length > 1 ? 's' : ''}
          </p>
          {duplicates.slice(0, 3).map((d, i) => (
            <p key={i} className="text-xs text-amber-700 pl-5">
              &quot;{d.listingA.title ?? d.listingA.address ?? 'Item A'}&quot; e &quot;{d.listingB.title ?? d.listingB.address ?? 'Item B'}&quot; — {d.reasons.join(', ')}
            </p>
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">
            {editingId ? 'Editar Comparável' : 'Novo Comparável'}
          </h3>
          <ComparableForm
            initial={formData}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingId(null) }}
            saving={saving}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter size={14} className="text-gray-400" />
        <select
          value={scopeFilter}
          onChange={(e) => setScopeFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todos os escopos</option>
          {(Object.keys(scopeLabels) as ComparableScope[]).map((k) => (
            <option key={k} value={k}>{scopeLabels[k]}</option>
          ))}
        </select>
        <select
          value={originFilter}
          onChange={(e) => setOriginFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todas as origens</option>
          {(Object.keys(originLabels) as ComparableOrigin[]).map((k) => (
            <option key={k} value={k}>{originLabels[k]}</option>
          ))}
        </select>
        <select
          value={useFilter}
          onChange={(e) => setUseFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todos os usos</option>
          {(Object.keys(useInCalcLabels) as UseInCalculation[]).map((k) => (
            <option key={k} value={k}>{useInCalcLabels[k]}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todos os status</option>
          {(Object.keys(listingStatusLabels) as ListingStatus[]).map((k) => (
            <option key={k} value={k}>{listingStatusLabels[k]}</option>
          ))}
        </select>
        {filtered.length !== comparables.length && (
          <span className="text-xs text-gray-500">{filtered.length} de {comparables.length} exibidos</span>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          Carregando comparáveis...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <Search size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">Nenhum comparável encontrado</p>
          <p className="text-xs text-gray-400 mt-1">Adicione comparáveis manualmente ou use a busca automática.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap">Título / Fonte</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Escopo</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Preço</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Área</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">R$/m²</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Qts</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Vgs</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Uso</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Score</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((c) => {
                  const hasDuplicate = duplicates.some(
                    (d) => d.listingA.id === c.id || d.listingB.id === c.id
                  )
                  return (
                    <tr key={c.id} className={cn('hover:bg-gray-50', c.is_outlier && 'opacity-60')}>
                      <td className="px-4 py-3 max-w-[200px]">
                        <div className="flex items-start gap-1.5">
                          <div>
                            <p className="font-medium text-gray-900 truncate text-xs">
                              {c.title ?? c.address ?? 'Sem título'}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium', originColors[c.origin])}>
                                {originLabels[c.origin]}
                              </span>
                              {c.source_url && (
                                <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                                  <ExternalLink size={11} />
                                </a>
                              )}
                              {hasDuplicate && (
                                <span className="text-[10px] text-amber-600 font-medium flex items-center gap-0.5">
                                  <AlertTriangle size={10} /> Duplicado?
                                </span>
                              )}
                            </div>
                            {c.neighborhood && (
                              <p className="text-[10px] text-gray-400 mt-0.5">{c.neighborhood}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-700">{scopeLabels[c.scope]}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-medium text-gray-900 whitespace-nowrap">
                        {formatCurrency(c.listed_price)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-700 whitespace-nowrap">
                        {formatArea(c.private_area)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-medium text-blue-700 whitespace-nowrap">
                        {formatCurrency(c.price_per_sqm)}/m²
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-700">{c.bedrooms ?? '-'}</td>
                      <td className="px-4 py-3 text-center text-xs text-gray-700">{c.parking_spaces ?? '-'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-700">{listingStatusLabels[c.listing_status]}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', useInCalcColors[c.use_in_calculation])}>
                          {useInCalcLabels[c.use_in_calculation]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.similarity_score !== undefined ? (
                          <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', getSimilarityColor(c.similarity_score))}>
                            {c.similarity_score}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(c)}
                            title="Editar"
                            className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleUseToggle(c.id, c.use_in_calculation)}
                            title={c.use_in_calculation === 'usar' ? 'Não usar' : 'Usar no cálculo'}
                            className={cn('p-1 rounded', c.use_in_calculation === 'usar'
                              ? 'text-green-500 hover:bg-green-50'
                              : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            )}
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={() => handleMarkOutlier(c.id)}
                            title="Marcar como outlier"
                            className="p-1 rounded text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                          >
                            <AlertTriangle size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            title="Excluir"
                            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
            {comparables.length} comparável{comparables.length !== 1 ? 'is' : ''} no total · {comparables.filter((c) => c.use_in_calculation === 'usar').length} usado{comparables.filter((c) => c.use_in_calculation === 'usar').length !== 1 ? 's' : ''} no cálculo
          </div>
        </div>
      )}
    </div>
  )
}
