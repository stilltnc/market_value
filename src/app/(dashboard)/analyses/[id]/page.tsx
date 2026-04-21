'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { getAnalysis } from '@/services/analyses'
import type { Analysis } from '@/types'
import { getVerdictLabel, getVerdictColor, formatCurrency, formatPercent } from '@/lib/calculations'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'

// Importação dinâmica dos módulos pesados para evitar SSR issues
const ComparablesList = dynamic(() => import('@/components/comparables/ComparablesList').then(m => m.ComparablesList), { ssr: false, loading: () => <TabLoading label="Comparáveis" /> })
const ConsolidationView = dynamic(() => import('@/components/consolidation/ConsolidationView').then(m => m.ConsolidationView), { ssr: false, loading: () => <TabLoading label="Consolidado" /> })
const ViabilityView = dynamic(() => import('@/components/viability/ViabilityView').then(m => m.ViabilityView), { ssr: false, loading: () => <TabLoading label="Viabilidade" /> })
const AutoSearchPanel = dynamic(() => import('@/components/search/AutoSearchPanel').then(m => m.AutoSearchPanel), { ssr: false, loading: () => <TabLoading label="Busca Automática" /> })

// ============================================================
// Constantes
// ============================================================

const STATUS_LABELS: Record<string, string> = {
  em_analise: 'Em Análise',
  aprovado: 'Aprovado',
  descartado: 'Descartado',
  arrematado: 'Arrematado',
  em_posse: 'Em Posse',
  em_reforma: 'Em Reforma',
  anunciado: 'Anunciado',
  vendido: 'Vendido',
  arquivado: 'Arquivado',
}

const STATUS_COLORS: Record<string, string> = {
  em_analise: 'bg-blue-100 text-blue-700',
  aprovado: 'bg-green-100 text-green-700',
  descartado: 'bg-red-100 text-red-700',
  arrematado: 'bg-purple-100 text-purple-700',
  em_posse: 'bg-indigo-100 text-indigo-700',
  em_reforma: 'bg-orange-100 text-orange-700',
  anunciado: 'bg-teal-100 text-teal-700',
  vendido: 'bg-emerald-100 text-emerald-700',
  arquivado: 'bg-gray-100 text-gray-600',
}

// ============================================================
// Definição das abas
// ============================================================

const TABS = [
  { key: 'overview', label: 'Visão Geral' },
  { key: 'property', label: 'Imóvel-alvo' },
  { key: 'search', label: 'Busca Automática' },
  { key: 'comparables', label: 'Comparáveis' },
  { key: 'brokers', label: 'Corretores' },
  { key: 'consolidation', label: 'Consolidado' },
  { key: 'viability', label: 'Viabilidade' },
  { key: 'attachments', label: 'Anexos' },
  { key: 'history', label: 'Histórico' },
] as const

type TabKey = (typeof TABS)[number]['key']

// ============================================================
// Componentes de conteúdo das abas (placeholders estruturados)
// ============================================================

function OverviewTab({ analysis }: { analysis: Analysis }) {
  const prop = analysis.target_property
  const viab = analysis.viability_scenario
  const consol = analysis.market_consolidation

  const formatCur = (v?: number | null) =>
    v != null
      ? new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(v)
      : '-'

  const formatPct = (v?: number | null) =>
    v != null ? `${(v * 100).toFixed(1)}%` : '-'

  return (
    <div className="space-y-6" data-testid="tab-overview">
      {/* Informações do Leilão */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4">Informações do Leilão</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {analysis.auction_url && (
            <>
              <dt className="text-gray-400 font-medium">URL do Leilão</dt>
              <dd>
                <a
                  href={analysis.auction_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {analysis.auction_url}
                </a>
              </dd>
            </>
          )}
          {analysis.auction_source && (
            <>
              <dt className="text-gray-400 font-medium">Fonte / Leiloeiro</dt>
              <dd className="text-gray-700">{analysis.auction_source}</dd>
            </>
          )}
          {analysis.process_number && (
            <>
              <dt className="text-gray-400 font-medium">Nº Processo</dt>
              <dd className="text-gray-700 font-mono">{analysis.process_number}</dd>
            </>
          )}
          {analysis.registry_number && (
            <>
              <dt className="text-gray-400 font-medium">Matrícula</dt>
              <dd className="text-gray-700 font-mono">{analysis.registry_number}</dd>
            </>
          )}
          <dt className="text-gray-400 font-medium">Criado em</dt>
          <dd className="text-gray-700">
            {new Intl.DateTimeFormat('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }).format(new Date(analysis.created_at))}
          </dd>
          <dt className="text-gray-400 font-medium">Atualizado em</dt>
          <dd className="text-gray-700">
            {new Intl.DateTimeFormat('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }).format(new Date(analysis.updated_at))}
          </dd>
        </dl>
        {analysis.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">
              Observações
            </p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{analysis.notes}</p>
          </div>
        )}
      </div>

      {/* Resumo do imóvel */}
      {prop && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Imóvel</h3>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm">
            {prop.property_type && (
              <>
                <dt className="text-gray-400 font-medium">Tipo</dt>
                <dd className="text-gray-700 capitalize">{prop.property_type}</dd>
              </>
            )}
            {prop.private_area && (
              <>
                <dt className="text-gray-400 font-medium">Área</dt>
                <dd className="text-gray-700">{prop.private_area} m²</dd>
              </>
            )}
            {prop.bedrooms !== undefined && (
              <>
                <dt className="text-gray-400 font-medium">Quartos</dt>
                <dd className="text-gray-700">{prop.bedrooms}</dd>
              </>
            )}
            {prop.parking_spaces !== undefined && (
              <>
                <dt className="text-gray-400 font-medium">Vagas</dt>
                <dd className="text-gray-700">{prop.parking_spaces}</dd>
              </>
            )}
            {prop.floor !== undefined && (
              <>
                <dt className="text-gray-400 font-medium">Andar</dt>
                <dd className="text-gray-700">{prop.floor}º</dd>
              </>
            )}
            {prop.neighborhood && (
              <>
                <dt className="text-gray-400 font-medium">Bairro</dt>
                <dd className="text-gray-700">{prop.neighborhood}</dd>
              </>
            )}
            {prop.city && (
              <>
                <dt className="text-gray-400 font-medium">Cidade</dt>
                <dd className="text-gray-700">
                  {prop.city}
                  {prop.state ? `/${prop.state}` : ''}
                </dd>
              </>
            )}
            {prop.occupancy_status && (
              <>
                <dt className="text-gray-400 font-medium">Ocupação</dt>
                <dd className="text-gray-700 capitalize">{prop.occupancy_status.replace(/_/g, ' ')}</dd>
              </>
            )}
          </dl>
          {prop.address && (
            <p className="mt-3 text-sm text-gray-500">
              <span className="font-medium text-gray-400">Endereço: </span>
              {prop.address}
              {prop.cep ? ` — CEP ${prop.cep}` : ''}
            </p>
          )}
        </div>
      )}

      {/* Resumo financeiro */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">PFV</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {formatCur(consol?.pfv ?? viab?.pfv)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">ROI Estimado</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{formatPct(viab?.roi)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Veredito</p>
          <div className="mt-2">
            {viab?.verdict ? (
              <span
                className={cn(
                  'inline-flex px-3 py-1 rounded-full text-sm font-semibold',
                  getVerdictColor(viab.verdict)
                )}
              >
                {getVerdictLabel(viab.verdict)}
              </span>
            ) : (
              <span className="text-gray-400 text-sm">Indefinido</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PlaceholderTab({
  label,
  analysisId,
  description,
}: {
  label: string
  analysisId: string
  description?: string
}) {
  return (
    <div
      className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center"
      data-testid={`tab-${label.toLowerCase().replace(/\s/g, '-')}`}
    >
      <div className="text-4xl mb-3">🏗️</div>
      <h3 className="text-lg font-semibold text-gray-700">{label}</h3>
      <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto">
        {description ??
          `O componente de ${label} será carregado aqui para a análise ${analysisId.slice(0, 8)}…`}
      </p>
    </div>
  )
}

function TabLoading({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-32 mx-auto mb-2" />
      <div className="h-3 bg-gray-100 rounded w-48 mx-auto" />
      <p className="text-xs text-gray-400 mt-3">Carregando {label}…</p>
    </div>
  )
}

// ============================================================
// Componente de abas
// ============================================================

function Tabs({
  activeTab,
  onTabChange,
}: {
  activeTab: TabKey
  onTabChange: (key: TabKey) => void
}) {
  return (
    <div className="border-b border-gray-200 overflow-x-auto">
      <nav className="-mb-px flex gap-0 min-w-max" data-testid="analysis-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={cn(
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
            data-testid={`tab-btn-${tab.key}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

// ============================================================
// Página principal
// ============================================================

export default function AnalysisDetailPage() {
  const params = useParams()
  const analysisId = params?.id as string

  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  const load = useCallback(async () => {
    if (!analysisId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getAnalysis(analysisId)
      setAnalysis(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar análise')
    } finally {
      setLoading(false)
    }
  }, [analysisId])

  useEffect(() => {
    load()
  }, [load])

  // Loading skeleton
  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-6xl mx-auto animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-72" />
        <div className="h-5 bg-gray-200 rounded w-40" />
        <div className="flex gap-2 mt-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-9 bg-gray-200 rounded w-24" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl mt-4" />
      </div>
    )
  }

  // Erro
  if (error || !analysis) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-red-700">
          <p className="font-semibold text-lg mb-1">Erro ao carregar análise</p>
          <p className="text-sm">{error ?? 'Análise não encontrada.'}</p>
          <a
            href="/analyses"
            className="mt-3 inline-block text-sm underline font-medium"
          >
            ← Voltar para Análises
          </a>
        </div>
      </div>
    )
  }

  // Renderizar conteúdo da aba ativa
  function renderTabContent() {
    if (!analysis) return null

    switch (activeTab) {
      case 'overview':
        return <OverviewTab analysis={analysis} />
      case 'property':
        return (
          <PlaceholderTab
            label="Imóvel-alvo"
            analysisId={analysisId}
            description="Detalhes completos do imóvel, dados do condomínio, fotos e documentos."
          />
        )
      case 'search':
        return <AutoSearchPanel analysisId={analysisId} targetProperty={analysis.target_property ?? null} />
      case 'comparables':
        return <ComparablesList analysisId={analysisId} />
      case 'brokers':
        return (
          <PlaceholderTab
            label="Opiniões de Corretores"
            analysisId={analysisId}
            description="Registre opiniões de corretores sobre o valor de mercado do imóvel."
          />
        )
      case 'consolidation':
        return <ConsolidationView analysisId={analysisId} />
      case 'viability':
        return <ViabilityView analysisId={analysisId} />
      case 'attachments':
        return (
          <PlaceholderTab
            label="Anexos"
            analysisId={analysisId}
            description="Upload e gerenciamento de documentos relacionados à análise."
          />
        )
      case 'history':
        return (
          <PlaceholderTab
            label="Histórico"
            analysisId={analysisId}
            description="Registro completo de alterações e eventos da análise."
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto" data-testid="analysis-detail-page">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
        <a href="/analyses" className="hover:text-blue-600 transition-colors">
          Análises
        </a>
        <span>/</span>
        <span className="text-gray-600 truncate max-w-[300px]">{analysis.name}</span>
      </div>

      {/* Cabeçalho com nome e status */}
      <div className="flex flex-wrap items-start gap-3 mb-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 truncate" data-testid="analysis-name">
              {analysis.name}
            </h1>
            <span
              className={cn(
                'inline-flex px-2.5 py-1 rounded-full text-xs font-semibold',
                STATUS_COLORS[analysis.status] ?? 'bg-gray-100 text-gray-600'
              )}
              data-testid="analysis-status-badge"
            >
              {STATUS_LABELS[analysis.status] ?? analysis.status}
            </span>
          </div>
          {analysis.target_property && (
            <p className="text-sm text-gray-500 mt-1">
              {[
                analysis.target_property.address,
                analysis.target_property.neighborhood,
                analysis.target_property.city,
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
        </div>

        {/* Ações */}
        <div className="flex gap-2">
          <a
            href={`/analyses/${analysisId}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            data-testid="edit-analysis-btn"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Editar
          </a>
        </div>
      </div>

      {/* Abas */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="p-5">{renderTabContent()}</div>
      </div>
    </div>
  )
}
