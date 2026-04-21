'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getAnalyses } from '@/services/analyses'
import type { Analysis } from '@/types'
import { formatCurrency, formatPercent, getVerdictLabel, getVerdictColor } from '@/lib/calculations'
import { cn } from '@/lib/utils'

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

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso))
}

// ============================================================
// Componente principal
// ============================================================

export default function AnalysesPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAnalyses(statusFilter ? { status: statusFilter } : undefined)
      setAnalyses(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar análises')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    load()
  }, [load])

  // Filtro de busca por texto (cliente)
  const filtered = analyses.filter((a) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const prop = a.target_property
    return (
      a.name.toLowerCase().includes(q) ||
      prop?.address?.toLowerCase().includes(q) ||
      prop?.neighborhood?.toLowerCase().includes(q) ||
      prop?.city?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto" data-testid="analyses-page">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Análises</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loading ? 'Carregando…' : `${filtered.length} análise${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link
          href="/analyses/new"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          data-testid="nova-analise-btn"
        >
          <span>+</span>
          Nova Análise
        </Link>
      </div>

      {/* Barra de filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nome, endereço, bairro…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="search-input"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          data-testid="status-filter"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {(statusFilter || searchQuery) && (
          <button
            onClick={() => {
              setStatusFilter('')
              setSearchQuery('')
            }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
            data-testid="clear-filters-btn"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Erro */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          {error}
          <button onClick={load} className="ml-3 underline font-medium">
            Tentar novamente
          </button>
        </div>
      )}

      {/* Skeleton de carregamento */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Estado vazio */}
      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <div className="text-5xl mb-4">🏠</div>
          <p className="text-gray-500 font-medium">
            {searchQuery || statusFilter
              ? 'Nenhuma análise encontrada com os filtros aplicados.'
              : 'Nenhuma análise cadastrada ainda.'}
          </p>
          {!searchQuery && !statusFilter && (
            <Link
              href="/analyses/new"
              className="mt-4 inline-block bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Criar primeira análise
            </Link>
          )}
        </div>
      )}

      {/* Tabela */}
      {!loading && !error && filtered.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="analyses-table">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-medium">Nome</th>
                  <th className="px-4 py-3 text-left font-medium">Endereço</th>
                  <th className="px-4 py-3 text-left font-medium">Bairro</th>
                  <th className="px-4 py-3 text-left font-medium">Cidade</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">PFV</th>
                  <th className="px-4 py-3 text-right font-medium">ROI</th>
                  <th className="px-4 py-3 text-center font-medium">Veredito</th>
                  <th className="px-4 py-3 text-right font-medium">Atualizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((analysis) => {
                  const prop = analysis.target_property
                  const viab = analysis.viability_scenario
                  const verdict = viab?.verdict

                  return (
                    <tr
                      key={analysis.id}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                      data-testid={`analysis-row-${analysis.id}`}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/analyses/${analysis.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {analysis.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                        {prop?.address ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {prop?.neighborhood ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {prop?.city ?? '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                            STATUS_COLORS[analysis.status] ?? 'bg-gray-100 text-gray-600'
                          )}
                        >
                          {STATUS_LABELS[analysis.status] ?? analysis.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">
                        {formatCurrency(viab?.pfv)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">
                        {formatPercent(viab?.roi)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {verdict ? (
                          <span
                            className={cn(
                              'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                              getVerdictColor(verdict)
                            )}
                          >
                            {getVerdictLabel(verdict)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400 text-xs">
                        {formatDate(analysis.updated_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
