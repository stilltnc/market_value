'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2, UserCircle2, Phone, Mail, BadgeCheck, MapPin, Building2, X, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Broker } from '@/types'

// ----------------------------------------------------------------
// Form
// ----------------------------------------------------------------

interface BrokerFormData {
  name: string
  company: string
  whatsapp: string
  email: string
  creci: string
  region: string
  notes: string
}

const defaultForm: BrokerFormData = {
  name: '',
  company: '',
  whatsapp: '',
  email: '',
  creci: '',
  region: '',
  notes: '',
}

function BrokerForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: BrokerFormData
  onSave: (data: BrokerFormData) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<BrokerFormData>(initial)
  const set = (field: keyof BrokerFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      <div className="sm:col-span-2 md:col-span-1">
        <label className="block text-xs font-medium text-gray-700 mb-1">Nome *</label>
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Nome completo"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Empresa</label>
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.company}
          onChange={(e) => set('company', e.target.value)}
          placeholder="Imobiliária / Agência"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">WhatsApp</label>
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.whatsapp}
          onChange={(e) => set('whatsapp', e.target.value)}
          placeholder="(11) 99999-9999"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">E-mail</label>
        <input
          type="email"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          placeholder="corretor@email.com"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">CRECI</label>
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.creci}
          onChange={(e) => set('creci', e.target.value)}
          placeholder="CRECI-SP 12345"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Região de atuação</label>
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.region}
          onChange={(e) => set('region', e.target.value)}
          placeholder="Ex: Zona Sul SP, Pinheiros"
        />
      </div>
      <div className="sm:col-span-2 md:col-span-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">Observações</label>
        <textarea
          rows={2}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </div>
      <div className="sm:col-span-2 md:col-span-3 flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">
          Cancelar
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.name.trim()}
          className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// Page
// ----------------------------------------------------------------

export default function BrokersPage() {
  const [brokers, setBrokers] = useState<Broker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<BrokerFormData>(defaultForm)
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  const fetchBrokers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('brokers')
        .select('*')
        .order('name')
      if (err) throw err
      setBrokers((data as Broker[]) ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBrokers() }, [fetchBrokers])

  const filtered = brokers.filter((b) => {
    const q = search.toLowerCase()
    return (
      !q ||
      b.name.toLowerCase().includes(q) ||
      (b.company ?? '').toLowerCase().includes(q) ||
      (b.region ?? '').toLowerCase().includes(q) ||
      (b.creci ?? '').toLowerCase().includes(q)
    )
  })

  async function handleSave(data: BrokerFormData) {
    setSaving(true)
    try {
      const payload: Partial<Broker> = {
        name: data.name,
        company: data.company || undefined,
        whatsapp: data.whatsapp || undefined,
        email: data.email || undefined,
        creci: data.creci || undefined,
        region: data.region || undefined,
        notes: data.notes || undefined,
      }
      if (editingId) {
        const { error: err } = await supabase.from('brokers').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingId)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('brokers').insert(payload)
        if (err) throw err
      }
      setShowForm(false)
      setEditingId(null)
      setFormData(defaultForm)
      await fetchBrokers()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este corretor?')) return
    await supabase.from('brokers').delete().eq('id', id)
    await fetchBrokers()
  }

  function openEdit(b: Broker) {
    setFormData({
      name: b.name,
      company: b.company ?? '',
      whatsapp: b.whatsapp ?? '',
      email: b.email ?? '',
      creci: b.creci ?? '',
      region: b.region ?? '',
      notes: b.notes ?? '',
    })
    setEditingId(b.id)
    setShowForm(true)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Corretores</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie sua rede de corretores parceiros</p>
        </div>
        <button
          onClick={() => { setFormData(defaultForm); setEditingId(null); setShowForm(true) }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          <Plus size={15} />
          Novo Corretor
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">{editingId ? 'Editar Corretor' : 'Novo Corretor'}</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <BrokerForm initial={formData} onSave={handleSave} onCancel={() => setShowForm(false)} saving={saving} />
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Buscar por nome, empresa, CRECI ou região..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Carregando...</div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <UserCircle2 size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">Nenhum corretor encontrado</p>
          <p className="text-xs text-gray-400 mt-1">Adicione corretores para consultar opiniões de mercado.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Empresa</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">WhatsApp</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">E-mail</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">CRECI</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Região</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-semibold shrink-0">
                          {b.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{b.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-700 flex items-center gap-1">
                        {b.company ? (<><Building2 size={11} className="text-gray-400" />{b.company}</>) : <span className="text-gray-400">-</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-700 flex items-center gap-1">
                        {b.whatsapp ? (<><Phone size={11} className="text-gray-400" />{b.whatsapp}</>) : <span className="text-gray-400">-</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-700 flex items-center gap-1">
                        {b.email ? (<><Mail size={11} className="text-gray-400" />{b.email}</>) : <span className="text-gray-400">-</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-700 flex items-center gap-1">
                        {b.creci ? (<><BadgeCheck size={11} className="text-green-500" />{b.creci}</>) : <span className="text-gray-400">-</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-700 flex items-center gap-1">
                        {b.region ? (<><MapPin size={11} className="text-gray-400" />{b.region}</>) : <span className="text-gray-400">-</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(b)} className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
            {filtered.length} corretor{filtered.length !== 1 ? 'es' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
