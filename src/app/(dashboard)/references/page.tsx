'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2, BookOpen, ExternalLink, Tag, Clock, X, Search, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { ReferenceSource, ReferenceType } from '@/types'

// ----------------------------------------------------------------
// Label maps
// ----------------------------------------------------------------

const typeLabels: Record<ReferenceType, string> = {
  portal_imobiliario: 'Portal Imobiliário',
  fonte_publica: 'Fonte Pública',
  link_util: 'Link Útil',
  condominio_chave: 'Condomínio Chave',
  premissa_mercado: 'Premissa de Mercado',
  observacao_itbi: 'Observação ITBI',
  regra_cartorio: 'Regra Cartório',
  parametro_fiscal: 'Parâmetro Fiscal',
  outro: 'Outro',
}

const typeColors: Record<ReferenceType, string> = {
  portal_imobiliario: 'bg-blue-100 text-blue-700',
  fonte_publica: 'bg-green-100 text-green-700',
  link_util: 'bg-gray-100 text-gray-700',
  condominio_chave: 'bg-teal-100 text-teal-700',
  premissa_mercado: 'bg-purple-100 text-purple-700',
  observacao_itbi: 'bg-orange-100 text-orange-700',
  regra_cartorio: 'bg-red-100 text-red-700',
  parametro_fiscal: 'bg-amber-100 text-amber-700',
  outro: 'bg-gray-100 text-gray-600',
}

// ----------------------------------------------------------------
// Form
// ----------------------------------------------------------------

interface RefFormData {
  title: string
  type: ReferenceType
  url: string
  description: string
  region: string
  tags: string
  notes: string
}

const defaultForm: RefFormData = {
  title: '',
  type: 'link_util',
  url: '',
  description: '',
  region: '',
  tags: '',
  notes: '',
}

function ReferenceForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: RefFormData
  onSave: (data: RefFormData) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<RefFormData>(initial)
  const set = (field: keyof RefFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      <div className="sm:col-span-2 md:col-span-2">
        <label className="block text-xs font-medium text-gray-700 mb-1">Título *</label>
        <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Nome da referência" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
        <select className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.type} onChange={(e) => set('type', e.target.value as ReferenceType)}>
          {(Object.keys(typeLabels) as ReferenceType[]).map((k) => (
            <option key={k} value={k}>{typeLabels[k]}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2 md:col-span-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">URL</label>
        <input type="url" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://" />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
        <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Breve descrição" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Região</label>
        <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.region} onChange={(e) => set('region', e.target.value)} placeholder="Ex: SP, Zona Sul" />
      </div>
      <div className="sm:col-span-2 md:col-span-2">
        <label className="block text-xs font-medium text-gray-700 mb-1">Tags (separadas por vírgula)</label>
        <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="Ex: itbi, cartório, sp" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
        <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>
      <div className="sm:col-span-2 md:col-span-3 flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Cancelar</button>
        <button onClick={() => onSave(form)} disabled={saving || !form.title.trim()} className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// Page
// ----------------------------------------------------------------

export default function ReferencesPage() {
  const [refs, setRefs] = useState<ReferenceSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('todos')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<RefFormData>(defaultForm)
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  const fetchRefs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase.from('reference_sources').select('*').order('title')
      if (err) throw err
      setRefs((data as ReferenceSource[]) ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRefs() }, [fetchRefs])

  const filtered = refs.filter((r) => {
    const q = search.toLowerCase()
    const matchSearch = !q || r.title.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q) || (r.region ?? '').toLowerCase().includes(q)
    const matchType = typeFilter === 'todos' || r.type === typeFilter
    return matchSearch && matchType
  })

  async function handleSave(data: RefFormData) {
    setSaving(true)
    try {
      const tags = data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
      const payload: Partial<ReferenceSource> = {
        title: data.title,
        type: data.type,
        url: data.url || undefined,
        description: data.description || undefined,
        region: data.region || undefined,
        tags: tags.length > 0 ? tags : undefined,
        notes: data.notes || undefined,
      }
      if (editingId) {
        const { error: err } = await supabase.from('reference_sources').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingId)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('reference_sources').insert(payload)
        if (err) throw err
      }
      setShowForm(false)
      setEditingId(null)
      setFormData(defaultForm)
      await fetchRefs()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta referência?')) return
    await supabase.from('reference_sources').delete().eq('id', id)
    await fetchRefs()
  }

  function openEdit(r: ReferenceSource) {
    setFormData({
      title: r.title,
      type: r.type,
      url: r.url ?? '',
      description: r.description ?? '',
      region: r.region ?? '',
      tags: r.tags?.join(', ') ?? '',
      notes: r.notes ?? '',
    })
    setEditingId(r.id)
    setShowForm(true)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Fontes de Referência</h1>
          <p className="text-sm text-gray-500 mt-0.5">Links, portais e parâmetros usados nas análises</p>
        </div>
        <button
          onClick={() => { setFormData(defaultForm); setEditingId(null); setShowForm(true) }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          <Plus size={15} />
          Nova Referência
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">{editingId ? 'Editar Referência' : 'Nova Referência'}</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <ReferenceForm initial={formData} onSave={handleSave} onCancel={() => setShowForm(false)} saving={saving} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar por título, descrição ou região..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todos os tipos</option>
          {(Object.keys(typeLabels) as ReferenceType[]).map((k) => (
            <option key={k} value={k}>{typeLabels[k]}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Carregando...</div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <BookOpen size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">Nenhuma referência cadastrada</p>
          <p className="text-xs text-gray-400 mt-1">Adicione portais, links e parâmetros usados nas suas análises.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Título</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">URL</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Região</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Tags</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Última consulta</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{r.title}</p>
                      {r.description && <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[200px]">{r.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', typeColors[r.type])}>
                        {typeLabels[r.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.url ? (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 max-w-[180px] truncate">
                          <ExternalLink size={11} className="shrink-0" />
                          <span className="truncate">{r.url.replace(/^https?:\/\//, '')}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">{r.region ?? '-'}</td>
                    <td className="px-4 py-3">
                      {r.tags && r.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {r.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px]">
                              <Tag size={8} />{tag}
                            </span>
                          ))}
                          {r.tags.length > 3 && <span className="text-[10px] text-gray-400">+{r.tags.length - 3}</span>}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.last_checked_at ? (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock size={11} className="text-gray-400" />
                          {new Date(r.last_checked_at).toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"><Edit2 size={13} /></button>
                        <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
            {filtered.length} referência{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
