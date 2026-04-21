'use client'

import { useState, useCallback } from 'react'
import {
  Search, MapPin, Building2, Radio, Link2, Plus, Clock,
  CheckCircle2, AlertCircle, Loader2, ExternalLink, Import
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatArea } from '@/lib/calculations'
import type { TargetProperty, SearchJob, ComparableListing } from '@/types'

// ----------------------------------------------------------------
// Mock results for demo mode
// ----------------------------------------------------------------

interface MockListing {
  id: string
  title: string
  address: string
  neighborhood: string
  price: number
  area: number
  bedrooms: number
  parking: number
  source: string
  url: string
  daysAgo: number
}

const MOCK_LISTINGS: MockListing[] = [
  {
    id: 'm1',
    title: 'Apartamento 3 dorms - Pinheiros',
    address: 'Rua dos Pinheiros, 480 - Apto 51',
    neighborhood: 'Pinheiros',
    price: 850000,
    area: 78,
    bedrooms: 3,
    parking: 1,
    source: 'ZAP Imóveis',
    url: 'https://www.zapimoveis.com.br',
    daysAgo: 12,
  },
  {
    id: 'm2',
    title: 'Apto 2 quartos reformado - Vila Olímpia',
    address: 'Rua Funchal, 223 - Apto 82',
    neighborhood: 'Vila Olímpia',
    price: 720000,
    area: 65,
    bedrooms: 2,
    parking: 1,
    source: 'VivaReal',
    url: 'https://www.vivareal.com.br',
    daysAgo: 5,
  },
  {
    id: 'm3',
    title: 'Apartamento 80m² - Itaim Bibi',
    address: 'Rua Pedroso Alvarenga, 1185',
    neighborhood: 'Itaim Bibi',
    price: 980000,
    area: 82,
    bedrooms: 3,
    parking: 2,
    source: 'Quinto Andar',
    url: 'https://www.quintoandar.com.br',
    daysAgo: 20,
  },
  {
    id: 'm4',
    title: 'Cobertura duplex - Moema',
    address: 'Alameda dos Arapanés, 600',
    neighborhood: 'Moema',
    price: 1650000,
    area: 140,
    bedrooms: 3,
    parking: 2,
    source: 'ZAP Imóveis',
    url: 'https://www.zapimoveis.com.br',
    daysAgo: 35,
  },
  {
    id: 'm5',
    title: 'Studio moderno - Brooklin',
    address: 'Av. Santo Amaro, 2100 - Apto 204',
    neighborhood: 'Brooklin',
    price: 420000,
    area: 35,
    bedrooms: 1,
    parking: 1,
    source: 'Loft',
    url: 'https://www.loft.com.br',
    daysAgo: 8,
  },
  {
    id: 'm6',
    title: 'Apto garden 3 suítes - Campo Belo',
    address: 'Rua Laplace, 45',
    neighborhood: 'Campo Belo',
    price: 1100000,
    area: 95,
    bedrooms: 3,
    parking: 2,
    source: 'VivaReal',
    url: 'https://www.vivareal.com.br',
    daysAgo: 3,
  },
]

// ----------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------

interface MockCardProps {
  listing: MockListing
  onImport: (listing: MockListing) => void
  importing: boolean
}

function MockCard({ listing, onImport, importing }: MockCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-200 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{listing.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{listing.address}</p>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="text-sm font-bold text-blue-700">{formatCurrency(listing.price)}</span>
            <span className="text-xs text-gray-500">{formatArea(listing.area)}</span>
            <span className="text-xs text-gray-500">{formatCurrency(listing.price / listing.area)}/m²</span>
            <span className="text-xs text-gray-500">{listing.bedrooms} qts</span>
            <span className="text-xs text-gray-500">{listing.parking} vg</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600">
              {listing.source}
            </span>
            <span className="text-[10px] text-gray-400">há {listing.daysAgo} dias</span>
            <a href={listing.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5">
              Ver anúncio <ExternalLink size={9} />
            </a>
          </div>
        </div>
        <button
          onClick={() => onImport(listing)}
          disabled={importing}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {importing ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
          Importar
        </button>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------

type Tab = 'endereco' | 'bairro' | 'raio' | 'link'

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'endereco', label: 'Endereço / Condomínio', icon: Building2 },
  { id: 'bairro', label: 'Bairro', icon: MapPin },
  { id: 'raio', label: 'Raio', icon: Radio },
  { id: 'link', label: 'Importar Link', icon: Link2 },
]

interface Props {
  analysisId: string
  targetProperty?: TargetProperty | null
}

export function AutoSearchPanel({ analysisId, targetProperty }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('endereco')

  // Search fields
  const [searchAddress, setSearchAddress] = useState(targetProperty?.address ?? '')
  const [searchNeighborhood, setSearchNeighborhood] = useState(targetProperty?.neighborhood ?? '')
  const [searchRadius, setSearchRadius] = useState('1')
  const [searchBedrooms, setSearchBedrooms] = useState('')
  const [searchMinArea, setSearchMinArea] = useState('')
  const [searchMaxArea, setSearchMaxArea] = useState('')

  // URL import
  const [importUrl, setImportUrl] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extractedData, setExtractedData] = useState<Partial<{
    title: string; address: string; neighborhood: string; price: string;
    area: string; bedrooms: string; parking: string; floor: string;
  }> | null>(null)

  // Search state
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<MockListing[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isDemo, setIsDemo] = useState(true)
  const [jobs, setJobs] = useState<SearchJob[]>([])
  const [importingId, setImportingId] = useState<string | null>(null)

  const supabase = createClient()

  // ----------------------------------------------------------------
  // Search
  // ----------------------------------------------------------------
  async function handleSearch() {
    setSearching(true)
    setHasSearched(true)
    try {
      // Check if API is configured (demo check)
      const hasApiKey = false // Placeholder — would check env/config
      setIsDemo(!hasApiKey)

      // Log search job
      await supabase.from('search_jobs').insert({
        analysis_id: analysisId,
        status: 'concluido',
        search_type: activeTab === 'endereco' ? 'endereco' : activeTab === 'bairro' ? 'bairro' : activeTab === 'raio' ? 'raio' : 'importacao_link',
        query: activeTab === 'endereco' ? searchAddress : activeTab === 'bairro' ? searchNeighborhood : `${searchRadius}km`,
        results_count: MOCK_LISTINGS.length,
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
      })

      // Simulate delay and show mock results
      await new Promise((r) => setTimeout(r, 800))
      setSearchResults(MOCK_LISTINGS)
    } finally {
      setSearching(false)
    }
  }

  // ----------------------------------------------------------------
  // Import comparable
  // ----------------------------------------------------------------
  async function handleImport(listing: MockListing) {
    setImportingId(listing.id)
    try {
      const payload: Partial<ComparableListing> = {
        analysis_id: analysisId,
        title: listing.title,
        address: listing.address,
        neighborhood: listing.neighborhood,
        listed_price: listing.price,
        private_area: listing.area,
        price_per_sqm: listing.price / listing.area,
        bedrooms: listing.bedrooms,
        parking_spaces: listing.parking,
        source_name: listing.source,
        source_url: listing.url,
        origin: 'busca_automatica',
        scope: 'bairro',
        listing_status: 'ativo',
        use_in_calculation: 'revisar',
        is_outlier: false,
        collected_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('comparable_listings').insert(payload)
      if (error) throw error
      alert('Comparável importado com sucesso!')
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao importar')
    } finally {
      setImportingId(null)
    }
  }

  // ----------------------------------------------------------------
  // URL extraction (demo simulation)
  // ----------------------------------------------------------------
  async function handleExtract() {
    if (!importUrl.trim()) return
    setExtracting(true)
    setExtractedData(null)
    try {
      await new Promise((r) => setTimeout(r, 1200))
      // Demo: extract fake data from URL
      setExtractedData({
        title: 'Apartamento extraído do link',
        address: 'Endereço extraído',
        neighborhood: 'Bairro extraído',
        price: '750000',
        area: '72',
        bedrooms: '3',
        parking: '1',
        floor: '4',
      })
    } finally {
      setExtracting(false)
    }
  }

  async function handleImportFromUrl() {
    if (!extractedData) return
    setImportingId('url')
    try {
      const payload: Partial<ComparableListing> = {
        analysis_id: analysisId,
        title: extractedData.title,
        address: extractedData.address,
        neighborhood: extractedData.neighborhood,
        listed_price: parseFloat(extractedData.price ?? '0') || undefined,
        private_area: parseFloat(extractedData.area ?? '0') || undefined,
        price_per_sqm: extractedData.price && extractedData.area
          ? parseFloat(extractedData.price) / parseFloat(extractedData.area) : undefined,
        bedrooms: parseInt(extractedData.bedrooms ?? '') || undefined,
        parking_spaces: parseInt(extractedData.parking ?? '') || undefined,
        floor: parseInt(extractedData.floor ?? '') || undefined,
        source_url: importUrl,
        origin: 'importacao_link',
        scope: 'bairro',
        listing_status: 'ativo',
        use_in_calculation: 'revisar',
        is_outlier: false,
        collected_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('comparable_listings').insert(payload)
      if (error) throw error
      setExtractedData(null)
      setImportUrl('')
      alert('Comparável importado com sucesso!')
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao importar')
    } finally {
      setImportingId(null)
    }
  }

  // ----------------------------------------------------------------
  // Render search controls
  // ----------------------------------------------------------------
  function renderTabContent() {
    switch (activeTab) {
      case 'endereco':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Endereço / Condomínio</label>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                placeholder="Ex: Rua dos Pinheiros, 480 ou Condomínio Villa"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cidade</label>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue={targetProperty?.city ?? 'São Paulo'}
                placeholder="São Paulo"
              />
            </div>
          </div>
        )

      case 'bairro':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Bairro</label>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchNeighborhood}
                onChange={(e) => setSearchNeighborhood(e.target.value)}
                placeholder="Ex: Pinheiros, Vila Olímpia"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Área mín. (m²)</label>
              <input
                type="number"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchMinArea}
                onChange={(e) => setSearchMinArea(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Área máx. (m²)</label>
              <input
                type="number"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchMaxArea}
                onChange={(e) => setSearchMaxArea(e.target.value)}
              />
            </div>
          </div>
        )

      case 'raio':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Raio (km)</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchRadius}
                onChange={(e) => setSearchRadius(e.target.value)}
              >
                {[0.5, 1, 2, 3, 5].map((r) => (
                  <option key={r} value={r}>{r} km</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Quartos</label>
              <input
                type="number" min="0"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchBedrooms}
                onChange={(e) => setSearchBedrooms(e.target.value)}
                placeholder="Qualquer"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ponto de origem</label>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchAddress || targetProperty?.address || ''}
                onChange={(e) => setSearchAddress(e.target.value)}
                placeholder="Endereço central"
              />
            </div>
          </div>
        )

      case 'link':
        return (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="url"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="Cole a URL do anúncio (ZAP, VivaReal, Quinto Andar, Loft...)"
              />
              <button
                onClick={handleExtract}
                disabled={extracting || !importUrl.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
              >
                {extracting ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                {extracting ? 'Extraindo...' : 'Extrair dados'}
              </button>
            </div>

            {extractedData && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
                <p className="text-xs font-semibold text-green-800 flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  Dados extraídos — revise antes de importar
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(Object.keys(extractedData) as (keyof typeof extractedData)[]).map((key) => (
                    <div key={key}>
                      <label className="block text-[10px] font-medium text-gray-600 mb-1 capitalize">{key}</label>
                      <input
                        className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={extractedData[key] ?? ''}
                        onChange={(e) => setExtractedData((prev) => ({ ...prev, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleImportFromUrl}
                    disabled={importingId === 'url'}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {importingId === 'url' ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    Importar como comparável
                  </button>
                </div>
              </div>
            )}
          </div>
        )
    }
  }

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  return (
    <div className="space-y-5">
      {/* Header */}
      <h2 className="text-lg font-semibold text-gray-900">Busca de Comparáveis</h2>

      {/* API Notice */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
        <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-medium text-amber-800">Busca automática requer configuração de API</p>
          <p className="text-xs text-amber-700 mt-0.5">Configure as chaves de API nas Configurações para busca em portais imobiliários. No momento, exibindo resultados de demonstração.</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-0 border border-gray-200 rounded-lg overflow-hidden">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              )}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Content + Search */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
        {renderTabContent()}
        {activeTab !== 'link' && (
          <div className="flex justify-end">
            <button
              onClick={handleSearch}
              disabled={searching}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              {searching ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {hasSearched && activeTab !== 'link' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-800">
              {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} encontrado{searchResults.length !== 1 ? 's' : ''}
            </h3>
            {isDemo && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700">
                Demonstração
              </span>
            )}
          </div>

          {searching ? (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
              <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-400" />
              Buscando imóveis...
            </div>
          ) : searchResults.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <p className="text-sm text-gray-500">Nenhum resultado encontrado para esta busca.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchResults.map((listing) => (
                <MockCard
                  key={listing.id}
                  listing={listing}
                  onImport={handleImport}
                  importing={importingId === listing.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Job History */}
      {jobs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
            <Clock size={14} className="text-gray-400" />
            Histórico de Buscas
          </h3>
          <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
            {jobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-xs font-medium text-gray-800">{job.query ?? job.search_type}</p>
                  <p className="text-[10px] text-gray-400">
                    {job.created_at ? new Date(job.created_at).toLocaleDateString('pt-BR') : ''}
                    {job.results_count !== undefined && ` · ${job.results_count} resultados`}
                  </p>
                </div>
                <span className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                  job.status === 'concluido' ? 'bg-green-100 text-green-700' :
                  job.status === 'erro' ? 'bg-red-100 text-red-700' :
                  'bg-blue-100 text-blue-700'
                )}>
                  {job.status === 'concluido' ? 'Concluído' : job.status === 'erro' ? 'Erro' : 'Em andamento'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
