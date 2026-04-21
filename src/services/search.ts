/**
 * Serviço para buscas automáticas e importação de anúncios
 */

import { createClient } from '@/lib/supabase/client'
import type { SearchJob, SearchResult, ExtractedListing } from '@/types'

// ============================================================
// Search Jobs
// ============================================================

export async function createSearchJob(data: Partial<SearchJob>): Promise<SearchJob> {
  const supabase = createClient()

  const { data: created, error } = await supabase
    .from('search_jobs')
    .insert({ ...data, status: 'pendente' })
    .select()
    .single()

  if (error) {
    throw new Error(`Erro ao criar job de busca: ${error.message}`)
  }

  return created as SearchJob
}

export async function getSearchJobs(analysisId: string): Promise<SearchJob[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('search_jobs')
    .select('*')
    .eq('analysis_id', analysisId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Erro ao buscar jobs: ${error.message}`)
  }

  return (data as SearchJob[]) ?? []
}

export async function getSearchResults(jobId: string): Promise<SearchResult[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('search_results')
    .select('*')
    .eq('search_job_id', jobId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Erro ao buscar resultados: ${error.message}`)
  }

  return (data as SearchResult[]) ?? []
}

// ============================================================
// Importação por URL
// ============================================================

/**
 * Tenta extrair dados de um anúncio imobiliário a partir de uma URL.
 * Faz parsing de meta tags OpenGraph, title e structured data.
 */
export async function importFromUrl(
  analysisId: string,
  url: string
): Promise<ExtractedListing> {
  let html = ''
  let portal = ''

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LeilaoAnalytics/1.0)',
        Accept: 'text/html',
      },
    })
    html = await response.text()

    // Detectar portal pelo domínio
    const hostname = new URL(url).hostname
    if (hostname.includes('zapimoveis')) portal = 'Zap Imóveis'
    else if (hostname.includes('vivareal')) portal = 'Viva Real'
    else if (hostname.includes('quintoandar')) portal = 'QuintoAndar'
    else if (hostname.includes('olx')) portal = 'OLX'
    else if (hostname.includes('imovelweb')) portal = 'ImovelWeb'
    else portal = hostname
  } catch {
    // Se não conseguir buscar, retorna extração mínima
    return {
      portal: new URL(url).hostname,
      title: 'Importação manual',
      source_url: url,
      collected_at: new Date().toISOString(),
      confidence: 10,
    }
  }

  // Extrair via meta tags OpenGraph
  const extractMeta = (property: string): string | undefined => {
    const match = html.match(
      new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i')
    ) ?? html.match(
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i')
    )
    return match?.[1]
  }

  const title = extractMeta('og:title') ?? extractMeta('twitter:title') ??
    html.match(/<title>([^<]+)<\/title>/i)?.[1]

  const description = extractMeta('og:description') ?? extractMeta('description')

  // Tentar extrair preço de meta tags ou padrões comuns no HTML
  const priceRaw = extractMeta('og:price:amount') ??
    extractMeta('product:price:amount') ??
    html.match(/R\$\s*([\d.,]+)/)?.[1]

  let price: number | undefined
  if (priceRaw) {
    const cleaned = priceRaw.replace(/\./g, '').replace(',', '.')
    const parsed = parseFloat(cleaned)
    if (!isNaN(parsed) && parsed > 0) price = parsed
  }

  // Extrair área
  const areaMatch = html.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i)
  const privateArea = areaMatch
    ? parseFloat(areaMatch[1].replace(',', '.'))
    : undefined

  // Extrair quartos
  const bedroomsMatch = html.match(/(\d+)\s*(?:quarto|dormitório|dorm\.)/i)
  const bedrooms = bedroomsMatch ? parseInt(bedroomsMatch[1], 10) : undefined

  // Extrair vagas
  const parkingMatch = html.match(/(\d+)\s*vaga/i)
  const parkingSpaces = parkingMatch ? parseInt(parkingMatch[1], 10) : undefined

  // Calcular confiança baseada em quantos dados foram extraídos
  let confidence = 20
  if (title) confidence += 15
  if (price) confidence += 25
  if (privateArea) confidence += 15
  if (bedrooms !== undefined) confidence += 10
  if (description) confidence += 15

  const result: ExtractedListing = {
    portal,
    title: title?.trim(),
    price,
    private_area: privateArea,
    bedrooms,
    parking_spaces: parkingSpaces,
    description: description?.trim(),
    source_url: url,
    collected_at: new Date().toISOString(),
    confidence: Math.min(confidence, 100),
    raw: { html_length: html.length },
  }

  return result
}

// ============================================================
// Busca automática (mock para demonstração)
// ============================================================

interface MockListing {
  title: string
  address: string
  neighborhood: string
  city: string
  price: number
  private_area: number
  bedrooms: number
  parking_spaces: number
  price_per_sqm: number
  source_name: string
  source_url: string
}

/**
 * Retorna resultados de busca fictícios para fins de demonstração.
 * Em produção, esta função seria substituída por uma integração real com portais imobiliários.
 */
export async function mockAutoSearch(
  analysisId: string,
  searchType: string,
  query: string
): Promise<SearchResult[]> {
  const supabase = createClient()

  // Criar job de busca
  const { data: job, error: jobError } = await supabase
    .from('search_jobs')
    .insert({
      analysis_id: analysisId,
      status: 'em_andamento',
      search_type: searchType as SearchJob['search_type'],
      query,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (jobError) {
    throw new Error(`Erro ao criar job de busca: ${jobError.message}`)
  }

  // Gerar dados fictícios baseados na query
  const basePrice = 8000 + Math.random() * 4000
  const mockListings: MockListing[] = Array.from({ length: 8 }, (_, i) => {
    const area = 60 + Math.floor(Math.random() * 80)
    const priceVariation = 0.85 + Math.random() * 0.30
    const price = Math.round(area * basePrice * priceVariation / 1000) * 1000

    return {
      title: `Apartamento ${area}m² - ${query}`,
      address: `Rua ${['das Flores', 'dos Pinheiros', 'da Paz', 'do Sol', 'das Acácias', 'dos Girassóis', 'do Mar', 'da Saudade'][i]}, ${100 + i * 23}`,
      neighborhood: query,
      city: 'São Paulo',
      price,
      private_area: area,
      bedrooms: [1, 2, 2, 3, 3, 2, 1, 3][i],
      parking_spaces: [1, 1, 2, 2, 1, 0, 1, 2][i],
      price_per_sqm: Math.round(price / area),
      source_name: ['Zap Imóveis', 'Viva Real', 'OLX', 'ImovelWeb'][i % 4],
      source_url: `https://example.com/imovel-${analysisId.slice(0, 8)}-${i}`,
    }
  })

  // Salvar resultados no banco
  const results = mockListings.map((listing) => ({
    search_job_id: job.id,
    analysis_id: analysisId,
    source_name: listing.source_name,
    source_url: listing.source_url,
    title: listing.title,
    status: 'pendente_revisao',
    extracted_data_json: {
      address: listing.address,
      neighborhood: listing.neighborhood,
      city: listing.city,
      price: listing.price,
      private_area: listing.private_area,
      bedrooms: listing.bedrooms,
      parking_spaces: listing.parking_spaces,
      price_per_sqm: listing.price_per_sqm,
    },
  }))

  const { data: savedResults, error: resultsError } = await supabase
    .from('search_results')
    .insert(results)
    .select()

  if (resultsError) {
    throw new Error(`Erro ao salvar resultados: ${resultsError.message}`)
  }

  // Atualizar job como concluído
  await supabase
    .from('search_jobs')
    .update({
      status: 'concluido',
      finished_at: new Date().toISOString(),
      results_count: mockListings.length,
    })
    .eq('id', job.id)

  return (savedResults as SearchResult[]) ?? []
}
