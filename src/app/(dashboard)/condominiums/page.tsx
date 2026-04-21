'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2, Building, X, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/calculations'
import type { Condominium } from '@/types'

// ----------------------------------------------------------------
// Form
// ----------------------------------------------------------------

interface CondoFormData {
  name: string
  address: string
  cep: string
  neighborhood: string
  city: string
  state: string
  type_pattern: string
  developer: string
  estimated_year: string
  monthly_iptu: string
  monthly_condo_fee: string
  manager_contact: string
  common_area_condition: string
  delinquency_notes: string
  planned_works: string
  vacant_units_notes: string
  general_notes: string
}

const defaultForm: CondoFormData = {
  name: '',
  address: '',
  cep: '',
  neighborhood: '',
  city: '',
  state: 'SP',
  type_pattern: '',
  developer: '',
  estimated_year: '',
  monthly_iptu: '',
  monthly_condo_fee: '',
  manager_contact: '',
  common_area_condition: '',
  delinquency_notes: '',
  planned_works: '',
  vacant_units_notes: '',
  general_notes: '',
}

function CondoForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: CondoFormData
  onSave: (data: CondoFormData) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<CondoFormData>(initial)
  const set = (field: keyof CondoFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Identificação</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="sm:col-span-2 md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Nome *</label>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Nome do condomínio" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Padrão / Tipo</label>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.type_pattern} onChange={(e) => set('type_pattern', e.target.value)} placeholder="Ex: Alto Padrão, Popular" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Incorporadora</label>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.developer} onChange={(e) => set('developer', e.target.value)} placeholder="Ex: Cyrela, MRV" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Ano estimado</label>
            <input type="number" min="1950" max={new Date().getFullYear()} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.estimated_year} onChange={(e) => set('estimated_year', e.target.value)} placeholder="Ex: 2010" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Contato síndico</label>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.manager_contact} onChange={(e) => set('manager_contact', e.target.value)} placeholder="Tel. ou e-mail" />
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Localização</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Endereço</label>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Rua, número" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">CEP</label>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.cep} onChange={(e) => set('cep', e.target.value)} placeholder="00000-000" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Bairro</label>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} placeholder="Bairro" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Cidade</label>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="São Paulo" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.state} onChange={(e) => set('state', e.target.value)} placeholder="SP" maxLength={2} />
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Financeiro</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Taxa de Condomínio (R$/mês)</label>
            <input type="number" min="0" step="10" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.monthly_condo_fee} onChange={(e) => set('monthly_condo_fee', e.target.value)} placeholder="Ex: 1200" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">IPTU (R$/mês)</label>
            <input type="number" min="0" step="10" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.monthly_iptu} onChange={(e) => set('monthly_iptu', e.target.value)} placeholder="Ex: 400" />
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Informações adicionais</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Condição das áreas comuns</label>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.common_area_condition} onChange={(e) => set('common_area_condition', e.target.value)} placeholder="Ex: Bom estado, reformado" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Obs. inadimplência</label>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.delinquency_notes} onChange={(e) => set('delinquency_notes', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Obras previstas</label>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.planned_works} onChange={(e) => set('planned_works', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Unidades vagas</label>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.vacant_units_notes} onChange={(e) => set('vacant_units_notes', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Observações gerais</label>
            <textarea rows={2} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.general_notes} onChange={(e) => set('general_notes', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Cancelar</button>
        <button onClick={() => onSave(form)} disabled={saving || !form.name.trim()} className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// Page
// ----------------------------------------------------------------

export default function CondominiumsPage() {
  const [condos, setCondos] = useState<Condominium[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<CondoFormData>(defaultForm)
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  const fetchCondos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase.from('condominiums').select('*').order('name')
      if (err) throw err
      setCondos((data as Condominium[]) ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCondos() }, [fetchCondos])

  const filtered = condos.filter((c) => {
    const q = search.toLowerCase()
    return !q || c.name.toLowerCase().includes(q) || (c.neighborhood ?? '').toLowerCase().includes(q) || (c.city ?? '').toLowerCase().includes(q) || (c.cep ?? '').includes(q)
  })

  async function handleSave(data: CondoFormData) {
    setSaving(true)
    try {
      const payload: Partial<Condominium> = {
        name: data.name,
        address: data.address || undefined,
        cep: data.cep || undefined,
        neighborhood: data.neighborhood || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        type_pattern: data.type_pattern || undefined,
        developer: data.developer || undefined,
        estimated_year: data.estimated_year ? parseInt(data.estimated_year) : undefined,
        monthly_iptu: data.monthly_iptu ? parseFloat(data.monthly_iptu) : undefined,
        monthly_condo_fee: data.monthly_condo_fee ? parseFloat(data.monthly_condo_fee) : undefined,
        manager_contact: data.manager_contact || undefined,
        common_area_condition: data.common_area_condition || undefined,
        delinquency_notes: data.delinquency_notes || undefined,
        planned_works: data.planned_works || undefined,
        vacant_units_notes: data.vacant_units_notes || undefined,
        general_notes: data.general_notes || undefined,
      }
      if (editingId) {
        const { error: err } = await supabase.from('condominiums').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingId)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('condominiums').insert(payload)
        if (err) throw err
      }
      setShowForm(false)
      setEditingId(null)
      setFormData(defaultForm)
      await fetchCondos()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este condomínio?')) return
    await supabase.from('condominiums').delete().eq('id', id)
    await fetchCondos()
  }

  function openEdit(c: Condominium) {
    setFormData({
      name: c.name,
      address: c.address ?? '',
      cep: c.cep ?? '',
      neighborhood: c.neighborhood ?? '',
      city: c.city ?? '',
      state: c.state ?? '',
      type_pattern: c.type_pattern ?? '',
      developer: c.developer ?? '',
      estimated_year: c.estimated_year?.toString() ?? '',
      monthly_iptu: c.monthly_iptu?.toString() ?? '',
      monthly_condo_fee: c.monthly_condo_fee?.toString() ?? '',
      manager_contact: c.manager_contact ?? '',
      common_area_condition: c.common_area_condition ?? '',
      delinquency_notes: c.delinquency_notes ?? '',
      planned_works: c.planned_works ?? '',
      vacant_units_notes: c.vacant_units_notes ?? '',
      general_notes: c.general_notes ?? '',
    })
    setEditingId(c.id)
    setShowForm(true)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Condomínios</h1>
          <p className="text-sm text-gray-500 mt-0.5">Base de dados de condomínios cadastrados</p>
        </div>
        <button
          onClick={() => { setFormData(defaultForm); setEditingId(null); setShowForm(true) }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          <Plus size={15} />
          Novo Condomínio
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">{editingId ? 'Editar Condomínio' : 'Novo Condomínio'}</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <CondoForm initial={formData} onSave={handleSave} onCancel={() => setShowForm(false)} saving={saving} />
        </div>
      )}

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Buscar por nome, bairro, cidade ou CEP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Carregando...</div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <Building size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">Nenhum condomínio cadastrado</p>
          <p className="text-xs text-gray-400 mt-1">Cadastre condomínios para agilizar a análise de comparáveis.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">CEP</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Bairro</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Cidade</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Taxa Cond.</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">IPTU</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Padrão</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                          <Building size={13} className="text-teal-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.name}</p>
                          {c.estimated_year && <p className="text-[10px] text-gray-400">{c.estimated_year}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">{c.cep ?? '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-700">{c.neighborhood ?? '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-700">{c.city ? `${c.city}${c.state ? `/${c.state}` : ''}` : '-'}</td>
                    <td className="px-4 py-3 text-right text-xs font-medium text-gray-900">
                      {c.monthly_condo_fee ? formatCurrency(c.monthly_condo_fee) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-700">
                      {c.monthly_iptu ? formatCurrency(c.monthly_iptu) : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">{c.type_pattern ?? '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"><Edit2 size={13} /></button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
            {filtered.length} condomínio{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
