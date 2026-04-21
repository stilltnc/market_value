'use client'

import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { getDashboardStats } from '@/services/analyses'
import { getAnalyses } from '@/services/analyses'
import type { DashboardStats, Analysis } from '@/types'
import { formatCurrency, formatPercent, getVerdictLabel, getVerdictColor } from '@/lib/calculations'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// ============================================================
// Tipos auxiliares
// ============================================================

interface StatCard {
  label: string
  value: number
  color: string
  bg: string
  icon: string
}

// ============================================================
// Componente de card de estatística
// ============================================================

function StatsCard({ label, value, color, bg, icon }: StatCard) {
  return (
    <div className={cn('rounded-xl p-5 flex items-center gap-4 shadow-sm border border-gray-100', bg)}>
      <div className={cn('text-3xl w-12 h-12 flex items-center justify-center rounded-lg', color, 'bg-white/60')}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className={cn('text-3xl font-bold', color)}>{value}</p>
      </div>
    </div>
  )
}

// ============================================================
// Componente de tabela recente
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

function RecentAnalysesTable({ analyses }: { analyses: Analysis[] }) {
  const recent = analyses.slice(0, 10)

  if (recent.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-8 text-center text-gray-400">
        <p className="text-lg">Nenhuma análise cadastrada ainda.</p>
        <Link
          href="/analyses/new"
          className="mt-3 inline-block text-blue-600 font-medium hover:underline"
        >
          Criar primeira análise →
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Análises Recentes</h2>
        <Link href="/analyses" className="text-sm text-blue-600 hover:underline">
          Ver todas
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" data-testid="recent-analyses-table">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-left font-medium">Nome</th>
              <th className="px-4 py-3 text-left font-medium">Bairro / Cidade</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">PFV</th>
              <th className="px-4 py-3 text-right font-medium">ROI</th>
              <th className="px-4 py-3 text-right font-medium">Veredito</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {recent.map((analysis) => {
              const prop = analysis.target_property
              const viab = analysis.viability_scenario
              const verdict = viab?.verdict

              return (
                <tr
                  key={analysis.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/analyses/${analysis.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                      data-testid={`analysis-row-${analysis.id}`}
                    >
                      {analysis.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {prop?.neighborhood && prop?.city
                      ? `${prop.neighborhood}, ${prop.city}`
                      : prop?.city ?? '-'}
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
                  <td className="px-4 py-3 text-right text-gray-700 font-mono">
                    {formatCurrency(viab?.pfv)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 font-mono">
                    {formatPercent(viab?.roi)}
                  </td>
                  <td className="px-4 py-3 text-right">
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
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================
// Cores dos gráficos
// ============================================================

const PIE_COLORS = ['#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#F59E0B', '#14B8A6', '#F97316', '#6EE7B7']

// ============================================================
// Página principal do Dashboard
// ============================================================

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [statsData, analysesData] = await Promise.all([
          getDashboardStats(),
          getAnalyses(),
        ])
        setStats(statsData)
        setAnalyses(analysesData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Dados para o gráfico de ROI
  const roiChartData = analyses
    .filter((a) => a.viability_scenario?.roi !== undefined)
    .slice(0, 10)
    .map((a) => ({
      name: a.name.length > 15 ? a.name.slice(0, 15) + '…' : a.name,
      roi: Math.round((a.viability_scenario?.roi ?? 0) * 100 * 10) / 10,
    }))

  // Dados para o gráfico de distribuição por status
  const statusCounts: Record<string, number> = {}
  analyses.forEach((a) => {
    statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1
  })
  const statusChartData = Object.entries(statusCounts).map(([status, count]) => ({
    name: STATUS_LABELS[status] ?? status,
    value: count,
  }))

  const statCards: StatCard[] = stats
    ? [
        {
          label: 'Em Análise',
          value: stats.analyses_in_progress,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          icon: '🔍',
        },
        {
          label: 'Aprovadas',
          value: stats.analyses_approved,
          color: 'text-green-600',
          bg: 'bg-green-50',
          icon: '✅',
        },
        {
          label: 'Descartadas',
          value: stats.analyses_discarded,
          color: 'text-red-500',
          bg: 'bg-red-50',
          icon: '🚫',
        },
        {
          label: 'Arrematados',
          value: stats.purchases_made,
          color: 'text-purple-600',
          bg: 'bg-purple-50',
          icon: '🏠',
        },
        {
          label: 'Vendidos',
          value: stats.properties_sold,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50',
          icon: '💰',
        },
      ]
    : []

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-gray-200 rounded w-40 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="dashboard-page">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1 text-sm">Visão geral das suas análises de leilão</p>
        </div>
        <Link
          href="/analyses/new"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          data-testid="new-analysis-btn"
        >
          <span>+</span>
          Nova Análise
        </Link>
      </div>

      {/* Cards de estatísticas */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
        data-testid="stats-grid"
      >
        {statCards.map((card) => (
          <StatsCard key={card.label} {...card} />
        ))}
      </div>

      {/* Métricas adicionais */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">PFV Médio</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(stats.avg_pfv)}</p>
          </div>
          <div className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">ROI Médio</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{formatPercent(stats.avg_roi)}</p>
          </div>
          <div className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Lucro Total Estimado</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {formatCurrency(stats.total_estimated_profit)}
            </p>
          </div>
        </div>
      )}

      {/* Tabela de análises recentes */}
      <RecentAnalysesTable analyses={analyses} />

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ROI por análise */}
        <div className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">ROI por Análise (%)</h2>
          {roiChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={roiChartData} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                <Tooltip
                  formatter={(val: unknown) => [`${val}%`, 'ROI']}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="roi" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              Nenhum dado de ROI disponível
            </div>
          )}
        </div>

        {/* Distribuição de Status */}
        <div className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">Distribuição de Status</h2>
          {statusChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              Nenhuma análise cadastrada
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
