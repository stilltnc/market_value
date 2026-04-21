'use client'

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatPercent } from '@/lib/calculations'
import type { Analysis, Verdict } from '@/types'

// ----------------------------------------------------------------
// Color maps
// ----------------------------------------------------------------

const verdictColors: Record<Verdict, string> = {
  viavel: '#22c55e',
  limitrofe: '#f59e0b',
  revisar: '#ef4444',
  indefinido: '#9ca3af',
}

const statusColors: Record<string, string> = {
  em_analise: '#3b82f6',
  aprovado: '#22c55e',
  descartado: '#ef4444',
  arrematado: '#8b5cf6',
  em_posse: '#06b6d4',
  em_reforma: '#f97316',
  anunciado: '#eab308',
  vendido: '#10b981',
  arquivado: '#6b7280',
}

const statusLabels: Record<string, string> = {
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

// ----------------------------------------------------------------
// Custom Tooltip for Bar Chart
// ----------------------------------------------------------------

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; payload: { verdict: Verdict } }>; label?: string }) {
  if (!active || !payload?.length) return null
  const roi = payload[0].value
  const verdict = payload[0].payload.verdict
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      <p className="text-gray-600">ROI: <strong>{formatPercent(roi / 100)}</strong></p>
    </div>
  )
}

// ----------------------------------------------------------------
// Custom Tooltip for Pie Chart
// ----------------------------------------------------------------

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-gray-800">{payload[0].name}</p>
      <p className="text-gray-600">{payload[0].value} análise{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  )
}

// ----------------------------------------------------------------
// Custom label for Pie
// ----------------------------------------------------------------

function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
  cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number
}) {
  if (percent < 0.06) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

// ----------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------

interface Props {
  analyses: Analysis[]
}

export function AnalysisCharts({ analyses }: Props) {
  // Prepare ROI bar chart data
  const barData = analyses
    .filter((a) => a.viability_scenario?.roi !== undefined)
    .map((a) => ({
      name: a.name.length > 20 ? a.name.slice(0, 20) + '…' : a.name,
      roi: Math.round((a.viability_scenario!.roi! * 100) * 10) / 10,
      verdict: (a.viability_scenario?.verdict ?? 'indefinido') as Verdict,
    }))
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 12)

  // Prepare Pie chart data
  const statusCounts: Record<string, number> = {}
  analyses.forEach((a) => {
    statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1
  })
  const pieData = Object.entries(statusCounts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name: statusLabels[status] ?? status,
      value: count,
      color: statusColors[status] ?? '#9ca3af',
    }))

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Bar Chart — ROI */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">ROI por Análise (%)</h3>
        {barData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm text-gray-400">
            Nenhuma análise com ROI calculado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#6b7280' }}
                angle={-35}
                textAnchor="end"
                interval={0}
                height={60}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#6b7280' }}
                tickFormatter={(v) => `${v}%`}
                width={45}
              />
              <Tooltip content={<BarTooltip />} />
              <Bar dataKey="roi" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={verdictColors[entry.verdict]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-2 justify-center">
          {(Object.entries(verdictColors) as [Verdict, string][]).map(([verdict, color]) => (
            <div key={verdict} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-[11px] text-gray-500">
                {verdict === 'viavel' ? 'Viável' : verdict === 'limitrofe' ? 'Limítrofe' : verdict === 'revisar' ? 'Revisar' : 'Indefinido'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pie Chart — Status distribution */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Distribuição de Status</h3>
        {pieData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm text-gray-400">
            Nenhuma análise encontrada
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={95}
                dataKey="value"
                labelLine={false}
                label={PieLabel as never}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend
                formatter={(value) => <span style={{ fontSize: 11, color: '#6b7280' }}>{value}</span>}
                iconType="circle"
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
