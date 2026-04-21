/**
 * Módulo de Busca Automatizada
 * 
 * Arquitetura de adapters: cada fonte implementa a interface SearchAdapter.
 * Novos adapters podem ser adicionados sem alterar o código consumidor.
 * 
 * Status:
 * - MockAdapter: funcional (demo)
 * - ZapImoveisAdapter: estruturado, requer API/Firecrawl
 * - VivaRealAdapter: estruturado, requer API/Firecrawl
 * - GoogleSearchAdapter: estruturado, requer SerpAPI key
 * - UrlImportAdapter: funcional (extrai meta tags de páginas públicas)
 */

import type { ExtractedListing } from '@/types'

export interface SearchQuery {
  type: 'address' | 'neighborhood' | 'radius' | 'url'
  query: string
  filters?: {
    city?: string
    state?: string
    neighborhood?: string
    minArea?: number
    maxArea?: number
    minBedrooms?: number
    maxBedrooms?: number
    minPrice?: number
    maxPrice?: number
    propertyType?: string
    radiusKm?: number
    latitude?: number
    longitude?: number
  }
}

export interface SearchAdapter {
  name: string
  label: string
  isAvailable(): boolean
  search(query: SearchQuery): Promise<ExtractedListing[]>
}

// ============================================================
// Mock Adapter — funciona sem API keys (dados de demonstração)
// ============================================================

export class MockSearchAdapter implements SearchAdapter {
  name = 'mock'
  label = 'Demo (Dados de Exemplo)'

  isAvailable(): boolean {
    return true // sempre disponível
  }

  async search(query: SearchQuery): Promise<ExtractedListing[]> {
    // Simula delay de rede
    await new Promise((r) => setTimeout(r, 800))

    const now = new Date().toISOString()
    const basePrice = 500000 + Math.random() * 300000

    const mockListings: ExtractedListing[] = [
      {
        portal: 'ZAP Imóveis (mock)',
        title: 'Apartamento 3 dormitórios com suíte',
        address: query.filters?.neighborhood
          ? `Rua das Flores, 123 - ${query.filters.neighborhood}`
          : 'Rua das Flores, 123',
        neighborhood: query.filters?.neighborhood || 'Jardins',
        price: Math.round(basePrice),
        private_area: 87,
        bedrooms: 3,
        parking_spaces: 2,
        floor: 8,
        condominium_name: 'Residencial Primavera',
        monthly_condo_fee: 850,
        monthly_iptu: 380,
        description: 'Apartamento reformado, 3 dorms, 1 suíte. Prédio com elevador e interfone.',
        collected_at: now,
        source_url: 'https://www.zapimoveis.com.br/imovel/exemplo-1',
        confidence: 0.85,
      },
      {
        portal: 'VivaReal (mock)',
        title: 'Apartamento 2 quartos — pronto para morar',
        address: query.filters?.neighborhood
          ? `Av. Paulista, 456 - ${query.filters.neighborhood}`
          : 'Av. Paulista, 456',
        neighborhood: query.filters?.neighborhood || 'Bela Vista',
        price: Math.round(basePrice * 0.78),
        private_area: 64,
        bedrooms: 2,
        parking_spaces: 1,
        floor: 5,
        condominium_name: 'Edifício Paulistano',
        monthly_condo_fee: 620,
        monthly_iptu: 250,
        description: '2 dormitórios, 1 vaga. Metrô a 300m. Cozinha americana.',
        collected_at: now,
        source_url: 'https://www.vivareal.com.br/imovel/exemplo-2',
        confidence: 0.82,
      },
      {
        portal: 'OLX Imóveis (mock)',
        title: 'Apto 3 quartos — Vila Mariana',
        address: 'Rua Domingos de Morais, 789',
        neighborhood: 'Vila Mariana',
        price: Math.round(basePrice * 1.12),
        private_area: 95,
        bedrooms: 3,
        parking_spaces: 2,
        floor: 12,
        condominium_name: 'Condomínio Horizonte',
        monthly_condo_fee: 980,
        description: 'Apartamento espaçoso, 3 dorms, 2 vagas, lazer completo.',
        collected_at: now,
        source_url: 'https://www.olx.com.br/imoveis/exemplo-3',
        confidence: 0.70,
      },
      {
        portal: 'Corretor Local (mock)',
        title: 'AP 75m² — 2 dorms — sem reformas',
        address: 'Rua Augusta, 1200',
        neighborhood: query.filters?.neighborhood || 'Consolação',
        price: Math.round(basePrice * 0.69),
        private_area: 75,
        bedrooms: 2,
        parking_spaces: 1,
        floor: 3,
        description: 'Apartamento original, sem reformas, bom estado.',
        collected_at: now,
        source_url: '',
        confidence: 0.60,
      },
      {
        portal: 'QuintoAndar (mock)',
        title: 'Apartamento moderno 3 suítes',
        address: 'Rua Oscar Freire, 555',
        neighborhood: 'Jardins',
        price: Math.round(basePrice * 1.45),
        private_area: 110,
        bedrooms: 3,
        parking_spaces: 2,
        floor: 15,
        condominium_name: 'Jardins Premium',
        monthly_condo_fee: 1800,
        monthly_iptu: 750,
        description: 'Alto padrão, 3 suítes, vista panorâmica, lazer exclusivo.',
        collected_at: now,
        source_url: 'https://www.quintoandar.com.br/imovel/exemplo-5',
        confidence: 0.90,
      },
    ]

    // Filtra por área se informado
    return mockListings.filter((l) => {
      if (query.filters?.minArea && l.private_area && l.private_area < query.filters.minArea!) return false
      if (query.filters?.maxArea && l.private_area && l.private_area > query.filters.maxArea!) return false
      if (query.filters?.minBedrooms && l.bedrooms && l.bedrooms < query.filters.minBedrooms!) return false
      return true
    })
  }
}

// ============================================================
// URL Import Adapter — extrai dados de URLs públicas
// ============================================================

export class UrlImportAdapter implements SearchAdapter {
  name = 'url_import'
  label = 'Importação por URL'

  isAvailable(): boolean {
    return true
  }

  async search(query: SearchQuery): Promise<ExtractedListing[]> {
    if (query.type !== 'url' || !query.query) return []

    try {
      const response = await fetch(`/api/extract-listing?url=${encodeURIComponent(query.query)}`)
      if (!response.ok) throw new Error('Falha ao extrair dados')
      const data = await response.json()
      return data.listing ? [data.listing] : []
    } catch {
      // Fallback: retornar estrutura vazia para preenchimento manual
      return [
        {
          source_url: query.query,
          collected_at: new Date().toISOString(),
          confidence: 0,
          portal: this.detectPortal(query.query),
        },
      ]
    }
  }

  private detectPortal(url: string): string {
    if (url.includes('zapimoveis')) return 'ZAP Imóveis'
    if (url.includes('vivareal')) return 'VivaReal'
    if (url.includes('olx')) return 'OLX Imóveis'
    if (url.includes('imovelweb')) return 'Imovelweb'
    if (url.includes('quintoandar')) return 'QuintoAndar'
    if (url.includes('caixa')) return 'Portal Caixa'
    return 'Outro'
  }
}

// ============================================================
// Google Search Adapter (requer SEARCH_API_KEY = SerpAPI)
// ============================================================

export class GoogleSearchAdapter implements SearchAdapter {
  name = 'google_search'
  label = 'Google Search (SerpAPI)'

  isAvailable(): boolean {
    return !!(process.env.SEARCH_API_KEY)
  }

  async search(query: SearchQuery): Promise<ExtractedListing[]> {
    if (!this.isAvailable()) return []

    const searchQuery = this.buildQuery(query)
    try {
      const response = await fetch(
        `https://serpapi.com/search?q=${encodeURIComponent(searchQuery)}&api_key=${process.env.SEARCH_API_KEY}&hl=pt&gl=br&num=10`
      )
      if (!response.ok) throw new Error('SerpAPI error')
      const data = await response.json()

      // Parsear resultados orgânicos
      return (data.organic_results || []).slice(0, 10).map((r: Record<string, string>) => ({
        portal: 'Google Search',
        title: r.title,
        source_url: r.link,
        description: r.snippet,
        collected_at: new Date().toISOString(),
        confidence: 0.5,
      }))
    } catch {
      return []
    }
  }

  private buildQuery(query: SearchQuery): string {
    const parts = [query.query, 'apartamento venda']
    if (query.filters?.city) parts.push(query.filters.city)
    if (query.filters?.neighborhood) parts.push(query.filters.neighborhood)
    if (query.filters?.minBedrooms) parts.push(`${query.filters.minBedrooms} quartos`)
    return parts.join(' ')
  }
}

// ============================================================
// Firecrawl Adapter (requer FIRECRAWL_API_KEY)
// ============================================================

export class FirecrawlAdapter implements SearchAdapter {
  name = 'firecrawl'
  label = 'Firecrawl (Extração de Páginas)'

  isAvailable(): boolean {
    return !!(process.env.FIRECRAWL_API_KEY)
  }

  async search(query: SearchQuery): Promise<ExtractedListing[]> {
    if (!this.isAvailable() || query.type !== 'url') return []

    try {
      const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        },
        body: JSON.stringify({
          url: query.query,
          extractorOptions: {
            mode: 'llm-extraction',
            extractionPrompt: `Extract real estate listing data from this page. Return: title, price (number in BRL), private_area (m², number), bedrooms, parking_spaces, floor, address, neighborhood, city, condominium_name, monthly_condo_fee, monthly_iptu, description.`,
            extractionSchema: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                price: { type: 'number' },
                private_area: { type: 'number' },
                bedrooms: { type: 'number' },
                parking_spaces: { type: 'number' },
                floor: { type: 'number' },
                address: { type: 'string' },
                neighborhood: { type: 'string' },
                city: { type: 'string' },
                condominium_name: { type: 'string' },
                monthly_condo_fee: { type: 'number' },
                monthly_iptu: { type: 'number' },
                description: { type: 'string' },
              },
            },
          },
        }),
      })

      if (!response.ok) throw new Error('Firecrawl error')
      const data = await response.json()
      const extracted = data.data?.llm_extraction

      if (!extracted) return []

      return [
        {
          ...extracted,
          portal: 'Firecrawl',
          source_url: query.query,
          collected_at: new Date().toISOString(),
          confidence: 0.85,
        },
      ]
    } catch {
      return []
    }
  }
}

// ============================================================
// Search Manager — orquestra múltiplos adapters
// ============================================================

export class SearchManager {
  private adapters: SearchAdapter[]

  constructor() {
    this.adapters = [
      new MockSearchAdapter(),
      new UrlImportAdapter(),
      new GoogleSearchAdapter(),
      new FirecrawlAdapter(),
    ]
  }

  getAvailableAdapters(): SearchAdapter[] {
    return this.adapters.filter((a) => a.isAvailable())
  }

  async searchAll(query: SearchQuery): Promise<{
    adapter: string
    results: ExtractedListing[]
    error?: string
  }[]> {
    const available = this.getAvailableAdapters()
    // Para buscas de URL, usar apenas o URL adapter (ou Firecrawl se disponível)
    const toUse =
      query.type === 'url'
        ? available.filter((a) => ['url_import', 'firecrawl'].includes(a.name))
        : available.filter((a) => a.name !== 'url_import')

    const results = await Promise.allSettled(
      toUse.map(async (adapter) => ({
        adapter: adapter.label,
        results: await adapter.search(query),
      }))
    )

    return results.map((r) => {
      if (r.status === 'fulfilled') return r.value
      return { adapter: 'Erro', results: [], error: String(r.reason) }
    })
  }
}

export const searchManager = new SearchManager()
