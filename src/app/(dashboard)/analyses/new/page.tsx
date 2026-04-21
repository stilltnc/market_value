'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createAnalysis } from '@/services/analyses'
import type { AnalysisStatus, PropertyType, OccupancyStatus } from '@/types'
import { cn } from '@/lib/utils'

// ============================================================
// Constantes
// ============================================================

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'apartamento', label: 'Apartamento' },
  { value: 'casa', label: 'Casa' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'terreno', label: 'Terreno' },
  { value: 'galpao', label: 'Galpão' },
  { value: 'sala', label: 'Sala' },
  { value: 'outro', label: 'Outro' },
]

const OCCUPANCY_STATUSES: { value: OccupancyStatus; label: string }[] = [
  { value: 'desocupado', label: 'Desocupado' },
  { value: 'ocupado', label: 'Ocupado' },
  { value: 'ocupado_proprietario', label: 'Ocupado pelo Proprietário' },
  { value: 'ocupado_inquilino', label: 'Ocupado por Inquilino' },
  { value: 'em_disputa', label: 'Em Disputa' },
  { value: 'nao_informado', label: 'Não Informado' },
]

const ANALYSIS_STATUSES: { value: AnalysisStatus; label: string }[] = [
  { value: 'em_analise', label: 'Em Análise' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'descartado', label: 'Descartado' },
  { value: 'arrematado', label: 'Arrematado' },
  { value: 'em_posse', label: 'Em Posse' },
  { value: 'em_reforma', label: 'Em Reforma' },
  { value: 'anunciado', label: 'Anunciado' },
  { value: 'vendido', label: 'Vendido' },
  { value: 'arquivado', label: 'Arquivado' },
]

// ============================================================
// Tipos do formulário
// ============================================================

interface FormData {
  // Análise
  name: string
  status: AnalysisStatus
  auction_url: string
  auction_source: string
  process_number: string
  registry_number: string
  notes: string
  // Imóvel-alvo
  property_type: PropertyType | ''
  address: string
  cep: string
  neighborhood: string
  city: string
  state: string
  private_area: string
  bedrooms: string
  parking_spaces: string
  floor: string
  occupancy_status: OccupancyStatus | ''
  description: string
}

type FormErrors = Partial<Record<keyof FormData, string>>

// ============================================================
// Componentes auxiliares
// ============================================================

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-600">{message}</p>
}

function inputClass(error?: string) {
  return cn(
    'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
    error
      ? 'border-red-400 bg-red-50 focus:ring-red-400'
      : 'border-gray-300 bg-white hover:border-gray-400'
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-gray-200 pb-3 mb-5">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  )
}

// ============================================================
// Validação
// ============================================================

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {}

  if (!data.name.trim()) {
    errors.name = 'Nome da análise é obrigatório'
  }

  if (data.auction_url && !data.auction_url.startsWith('http')) {
    errors.auction_url = 'URL inválida (deve começar com http:// ou https://)'
  }

  if (data.cep && !/^\d{5}-?\d{3}$/.test(data.cep.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2'))) {
    // aceita apenas se 8 dígitos
    if (data.cep.replace(/\D/g, '').length !== 8) {
      errors.cep = 'CEP deve ter 8 dígitos'
    }
  }

  if (data.private_area && (isNaN(Number(data.private_area)) || Number(data.private_area) <= 0)) {
    errors.private_area = 'Área deve ser um número positivo'
  }

  if (data.bedrooms && (isNaN(Number(data.bedrooms)) || Number(data.bedrooms) < 0)) {
    errors.bedrooms = 'Quartos deve ser um número não-negativo'
  }

  if (data.parking_spaces && (isNaN(Number(data.parking_spaces)) || Number(data.parking_spaces) < 0)) {
    errors.parking_spaces = 'Vagas deve ser um número não-negativo'
  }

  return errors
}

// ============================================================
// Formatação de CEP
// ============================================================

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`
  return digits
}

// ============================================================
// Página principal
// ============================================================

export default function NewAnalysisPage() {
  const router = useRouter()

  const [form, setForm] = useState<FormData>({
    name: '',
    status: 'em_analise',
    auction_url: '',
    auction_source: '',
    process_number: '',
    registry_number: '',
    notes: '',
    property_type: '',
    address: '',
    cep: '',
    neighborhood: '',
    city: '',
    state: 'SP',
    private_area: '',
    bedrooms: '',
    parking_spaces: '',
    floor: '',
    occupancy_status: '',
    description: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    let processed = value

    if (name === 'cep') {
      processed = formatCep(value)
    }

    setForm((prev) => ({ ...prev, [name]: processed }))

    // Limpar erro do campo
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    setGlobalError(null)

    try {
      // 1. Criar análise
      const analysis = await createAnalysis({
        name: form.name.trim(),
        status: form.status,
        auction_url: form.auction_url.trim() || undefined,
        auction_source: form.auction_source.trim() || undefined,
        process_number: form.process_number.trim() || undefined,
        registry_number: form.registry_number.trim() || undefined,
        notes: form.notes.trim() || undefined,
      })

      // 2. Criar imóvel-alvo se houver dados
      const hasPropertyData =
        form.property_type ||
        form.address ||
        form.neighborhood ||
        form.city ||
        form.private_area

      if (hasPropertyData) {
        const supabase = createClient()
        await supabase.from('target_properties').insert({
          analysis_id: analysis.id,
          property_type: form.property_type || undefined,
          address: form.address.trim() || undefined,
          cep: form.cep.trim() || undefined,
          neighborhood: form.neighborhood.trim() || undefined,
          city: form.city.trim() || undefined,
          state: form.state || undefined,
          private_area: form.private_area ? Number(form.private_area) : undefined,
          bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
          parking_spaces: form.parking_spaces ? Number(form.parking_spaces) : undefined,
          floor: form.floor ? Number(form.floor) : undefined,
          occupancy_status: form.occupancy_status || undefined,
          description: form.description.trim() || undefined,
        })
      }

      // 3. Redirecionar para a análise criada
      router.push(`/analyses/${analysis.id}`)
    } catch (err) {
      setGlobalError(
        err instanceof Error ? err.message : 'Erro inesperado ao criar análise'
      )
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto" data-testid="new-analysis-page">
      {/* Cabeçalho */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <a href="/analyses" className="hover:text-blue-600 transition-colors">
            Análises
          </a>
          <span>/</span>
          <span className="text-gray-600">Nova Análise</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Nova Análise</h1>
        <p className="text-gray-500 text-sm mt-1">
          Preencha os dados do leilão e do imóvel para iniciar a análise.
        </p>
      </div>

      {/* Erro global */}
      {globalError && (
        <div className="mb-5 rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          {globalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8" data-testid="new-analysis-form" noValidate>
        {/* ---- Dados do Leilão ---- */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <SectionHeader
            title="Dados do Leilão"
            subtitle="Informações gerais sobre o processo de leilão"
          />

          <div className="space-y-4">
            {/* Nome */}
            <div>
              <FieldLabel htmlFor="name" required>
                Nome da Análise
              </FieldLabel>
              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="Ex: Apto 3 dorm. Pinheiros - ZAP"
                className={inputClass(errors.name)}
                data-testid="input-name"
                autoFocus
              />
              <FieldError message={errors.name} />
            </div>

            {/* Status */}
            <div>
              <FieldLabel htmlFor="status">Status</FieldLabel>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange}
                className={inputClass()}
                data-testid="input-status"
              >
                {ANALYSIS_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* URL do Leilão + Fonte */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="auction_url">URL do Leilão</FieldLabel>
                <input
                  id="auction_url"
                  name="auction_url"
                  type="url"
                  value={form.auction_url}
                  onChange={handleChange}
                  placeholder="https://..."
                  className={inputClass(errors.auction_url)}
                  data-testid="input-auction-url"
                />
                <FieldError message={errors.auction_url} />
              </div>
              <div>
                <FieldLabel htmlFor="auction_source">Fonte / Leiloeiro</FieldLabel>
                <input
                  id="auction_source"
                  name="auction_source"
                  type="text"
                  value={form.auction_source}
                  onChange={handleChange}
                  placeholder="Ex: Superbid, Sold"
                  className={inputClass()}
                  data-testid="input-auction-source"
                />
              </div>
            </div>

            {/* Nº Processo + Matrícula */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="process_number">Número do Processo</FieldLabel>
                <input
                  id="process_number"
                  name="process_number"
                  type="text"
                  value={form.process_number}
                  onChange={handleChange}
                  placeholder="0000000-00.0000.0.00.0000"
                  className={inputClass()}
                  data-testid="input-process-number"
                />
              </div>
              <div>
                <FieldLabel htmlFor="registry_number">Matrícula</FieldLabel>
                <input
                  id="registry_number"
                  name="registry_number"
                  type="text"
                  value={form.registry_number}
                  onChange={handleChange}
                  placeholder="Ex: 12345"
                  className={inputClass()}
                  data-testid="input-registry-number"
                />
              </div>
            </div>

            {/* Notas */}
            <div>
              <FieldLabel htmlFor="notes">Observações</FieldLabel>
              <textarea
                id="notes"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Observações gerais sobre o leilão…"
                className={cn(inputClass(), 'resize-none')}
                data-testid="input-notes"
              />
            </div>
          </div>
        </div>

        {/* ---- Imóvel-alvo ---- */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <SectionHeader
            title="Imóvel-alvo"
            subtitle="Dados físicos do imóvel em leilão"
          />

          <div className="space-y-4">
            {/* Tipo de imóvel */}
            <div>
              <FieldLabel htmlFor="property_type">Tipo do Imóvel</FieldLabel>
              <select
                id="property_type"
                name="property_type"
                value={form.property_type}
                onChange={handleChange}
                className={inputClass()}
                data-testid="input-property-type"
              >
                <option value="">Selecione…</option>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Endereço */}
            <div>
              <FieldLabel htmlFor="address">Endereço</FieldLabel>
              <input
                id="address"
                name="address"
                type="text"
                value={form.address}
                onChange={handleChange}
                placeholder="Rua, número, complemento"
                className={inputClass()}
                data-testid="input-address"
              />
            </div>

            {/* CEP + Bairro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="cep">CEP</FieldLabel>
                <input
                  id="cep"
                  name="cep"
                  type="text"
                  value={form.cep}
                  onChange={handleChange}
                  placeholder="00000-000"
                  maxLength={9}
                  className={inputClass(errors.cep)}
                  data-testid="input-cep"
                />
                <FieldError message={errors.cep} />
              </div>
              <div>
                <FieldLabel htmlFor="neighborhood">Bairro</FieldLabel>
                <input
                  id="neighborhood"
                  name="neighborhood"
                  type="text"
                  value={form.neighborhood}
                  onChange={handleChange}
                  placeholder="Ex: Pinheiros"
                  className={inputClass()}
                  data-testid="input-neighborhood"
                />
              </div>
            </div>

            {/* Cidade + Estado */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="col-span-2">
                <FieldLabel htmlFor="city">Cidade</FieldLabel>
                <input
                  id="city"
                  name="city"
                  type="text"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Ex: São Paulo"
                  className={inputClass()}
                  data-testid="input-city"
                />
              </div>
              <div>
                <FieldLabel htmlFor="state">Estado</FieldLabel>
                <select
                  id="state"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  className={inputClass()}
                  data-testid="input-state"
                >
                  <option value="">UF</option>
                  {BRAZILIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Área + Quartos + Vagas + Andar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <FieldLabel htmlFor="private_area">Área Privativa (m²)</FieldLabel>
                <input
                  id="private_area"
                  name="private_area"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.private_area}
                  onChange={handleChange}
                  placeholder="75"
                  className={inputClass(errors.private_area)}
                  data-testid="input-private-area"
                />
                <FieldError message={errors.private_area} />
              </div>
              <div>
                <FieldLabel htmlFor="bedrooms">Quartos</FieldLabel>
                <input
                  id="bedrooms"
                  name="bedrooms"
                  type="number"
                  min="0"
                  step="1"
                  value={form.bedrooms}
                  onChange={handleChange}
                  placeholder="3"
                  className={inputClass(errors.bedrooms)}
                  data-testid="input-bedrooms"
                />
                <FieldError message={errors.bedrooms} />
              </div>
              <div>
                <FieldLabel htmlFor="parking_spaces">Vagas</FieldLabel>
                <input
                  id="parking_spaces"
                  name="parking_spaces"
                  type="number"
                  min="0"
                  step="1"
                  value={form.parking_spaces}
                  onChange={handleChange}
                  placeholder="1"
                  className={inputClass(errors.parking_spaces)}
                  data-testid="input-parking-spaces"
                />
                <FieldError message={errors.parking_spaces} />
              </div>
              <div>
                <FieldLabel htmlFor="floor">Andar</FieldLabel>
                <input
                  id="floor"
                  name="floor"
                  type="number"
                  min="0"
                  step="1"
                  value={form.floor}
                  onChange={handleChange}
                  placeholder="5"
                  className={inputClass()}
                  data-testid="input-floor"
                />
              </div>
            </div>

            {/* Situação de Ocupação */}
            <div>
              <FieldLabel htmlFor="occupancy_status">Situação de Ocupação</FieldLabel>
              <select
                id="occupancy_status"
                name="occupancy_status"
                value={form.occupancy_status}
                onChange={handleChange}
                className={inputClass()}
                data-testid="input-occupancy-status"
              >
                <option value="">Selecione…</option>
                {OCCUPANCY_STATUSES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Descrição */}
            <div>
              <FieldLabel htmlFor="description">Descrição do Imóvel</FieldLabel>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                placeholder="Descreva as características do imóvel, estado de conservação, diferenciais…"
                className={cn(inputClass(), 'resize-none')}
                data-testid="input-description"
              />
            </div>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <a
            href="/analyses"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            data-testid="cancel-btn"
          >
            Cancelar
          </a>
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              'px-6 py-2 rounded-lg text-sm font-medium text-white transition-colors',
              submitting
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            )}
            data-testid="submit-btn"
          >
            {submitting ? 'Criando…' : 'Criar Análise'}
          </button>
        </div>
      </form>
    </div>
  )
}
