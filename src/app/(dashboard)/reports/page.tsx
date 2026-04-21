'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatPercent, getVerdictLabel, getVerdictColor } from '@/lib/calculations'
import type { Analysis } from '@/types'
import { FileText, Download, BarChart3, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ReportsPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadAnalyses()
  }, [])

  async function loadAnalyses() {
    const supabase = createClient()
    const { data } = await supabase
      .from('analyses')
      .select(`
        *,
        target_property:target_properties(*),
        market_consolidation:market_consolidations(*),
        viability_scenario:viability_scenarios(*)
      `)
      .order('updated_at', { ascending: false })

    setAnalyses((data as Analysis[]) || [])
    setLoading(false)
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function exportCSV() {
    const selected = analyses.filter((a) => selectedIds.has(a.id))
    const rows = selected.map((a) => ({
      Nome: a.name,
      Status: a.status,
      Cidade: a.target_property?.city || '',
      Bairro: a.target_property?.neighborhood || '',
      'Área m²': a.target_property?.private_area || '',
      PFV: a.market_consolidation?.pfv || '',
      ROI: a.viability_scenario?.roi ? `${(a.viability_scenario.roi * 100).toFixed(1)}%` : '',
      Veredito: a.viability_scenario?.verdict || '',
      'Última atualização': new Date(a.updated_at).toLocaleDateString('pt-BR'),
    }))

    const header = Object.keys(rows[0] || {}).join(';')
    const body = rows.map((r) => Object.values(r).join(';')).join('\n')
    const csv = `${header}\n${body}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leilao-analytics-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportJSON() {
    const selected = analyses.filter((a) => selectedIds.has(a.id))
    const json = JSON.stringify(selected, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leilao-analytics-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Exporte análises em CSV, JSON ou gere relatório PDF
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} selecionada(s)
          </span>
          <button
            onClick={exportCSV}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="button-export-csv"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={exportJSON}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-card text-foreground border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="button-export-json"
          >
            <FileText className="w-4 h-4" />
            JSON
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total de Análises', value: analyses.length.toString() },
          {
            label: 'Com PFV Calculado',
            value: analyses.filter((a) => a.market_consolidation?.pfv).length.toString(),
          },
          {
            label: 'Viáveis',
            value: analyses.filter((a) => a.viability_scenario?.verdict === 'viavel').length.toString(),
          },
          {
            label: 'ROI Médio',
            value:
              analyses.filter((a) => a.viability_scenario?.roi).length > 0
                ? formatPercent(
                    analyses
                      .filter((a) => a.viability_scenario?.roi)
                      .reduce((s, a) => s + (a.viability_scenario!.roi ?? 0), 0) /
                      analyses.filter((a) => a.viability_scenario?.roi).length
                  )
                : '-',
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Analysis table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Análises para Exportar</h2>
          <span className="text-xs text-muted-foreground ml-auto">
            Selecione as análises que deseja incluir nos relatórios
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : analyses.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma análise encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(new Set(analyses.map((a) => a.id)))
                        else setSelectedIds(new Set())
                      }}
                      checked={selectedIds.size === analyses.length && analyses.length > 0}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Localização</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">PFV</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">ROI</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Veredito</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {analyses.map((a) => (
                  <tr
                    key={a.id}
                    className={cn(
                      'hover:bg-muted/30 transition-colors cursor-pointer',
                      selectedIds.has(a.id) && 'bg-primary/5'
                    )}
                    onClick={() => toggleSelect(a.id)}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(a.id)}
                        onChange={() => toggleSelect(a.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{a.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {[a.target_property?.neighborhood, a.target_property?.city]
                        .filter(Boolean)
                        .join(', ') || '-'}
                    </td>
                    <td className="px-4 py-3 text-right tabular font-medium">
                      {a.market_consolidation?.pfv
                        ? formatCurrency(a.market_consolidation.pfv)
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right tabular">
                      {a.viability_scenario?.roi
                        ? formatPercent(a.viability_scenario.roi)
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {a.viability_scenario?.verdict ? (
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-medium',
                            getVerdictColor(a.viability_scenario.verdict)
                          )}
                        >
                          {getVerdictLabel(a.viability_scenario.verdict)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                        {a.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PDF notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <Filter className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800">Relatório em PDF</p>
          <p className="text-xs text-amber-700 mt-1">
            A exportação em PDF com gráficos, tabelas e análise completa está estruturada na arquitetura e pode ser implementada utilizando as bibliotecas{' '}
            <code className="bg-amber-100 px-1 rounded">@react-pdf/renderer</code> ou{' '}
            <code className="bg-amber-100 px-1 rounded">puppeteer</code>. Todos os dados necessários já estão disponíveis via API.
          </p>
        </div>
      </div>
    </div>
  )
}
