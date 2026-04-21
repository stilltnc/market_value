import { NextRequest, NextResponse } from 'next/server'

/**
 * API Route: Extração de dados de anúncio por URL
 * Tenta extrair dados de imóvel a partir de meta tags Open Graph e dados estruturados.
 * Não faz scraping agressivo — apenas lê meta tags públicas.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL obrigatória' }, { status: 400 })
  }

  // Validar URL
  try {
    new URL(url)
  } catch {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
  }

  try {
    // Tentar Firecrawl primeiro se disponível
    if (process.env.FIRECRAWL_API_KEY) {
      const firecrawlResult = await extractWithFirecrawl(url)
      if (firecrawlResult) {
        return NextResponse.json({ listing: firecrawlResult, source: 'firecrawl' })
      }
    }

    // Fallback: buscar HTML e extrair meta tags
    const htmlResult = await extractFromHtml(url)
    return NextResponse.json({ listing: htmlResult, source: 'meta_tags' })
  } catch (error) {
    console.error('Erro ao extrair listing:', error)
    // Retornar estrutura vazia para preenchimento manual
    return NextResponse.json({
      listing: {
        source_url: url,
        portal: detectPortal(url),
        collected_at: new Date().toISOString(),
        confidence: 0,
      },
      source: 'manual_fallback',
    })
  }
}

async function extractWithFirecrawl(url: string) {
  const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify({
      url,
      extractorOptions: {
        mode: 'llm-extraction',
        extractionPrompt: `Extract all real estate listing information from this page. Be precise with numbers. Return JSON with: title (string), price (number, in BRL, no formatting), private_area (number in m²), bedrooms (number), parking_spaces (number), floor (number), address (string), neighborhood (string), city (string), condominium_name (string), monthly_condo_fee (number in BRL), monthly_iptu (number in BRL), description (string, first 300 chars).`,
      },
    }),
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) return null
  const data = await response.json()
  const extracted = data.data?.llm_extraction
  if (!extracted) return null

  return {
    ...extracted,
    portal: detectPortal(url),
    source_url: url,
    collected_at: new Date().toISOString(),
    confidence: 0.85,
  }
}

async function extractFromHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; LeilaoAnalyticsBot/1.0; +https://leilaoanalytics.com/bot)',
      Accept: 'text/html',
    },
    signal: AbortSignal.timeout(8000),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const html = await response.text()

  const getMeta = (name: string): string | undefined => {
    const patterns = [
      new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["']`, 'i'),
      new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    ]
    for (const p of patterns) {
      const m = html.match(p)
      if (m?.[1]) return m[1].trim()
    }
    return undefined
  }

  const getTitle = (): string | undefined => {
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    return m?.[1]?.trim()
  }

  const title = getMeta('og:title') || getTitle()
  const description = getMeta('og:description') || getMeta('description')

  // Tentar extrair preço de meta tags comuns de portais imobiliários
  const priceStr =
    getMeta('product:price:amount') ||
    getMeta('og:price:amount') ||
    getMeta('price')
  const price = priceStr ? parseFloat(priceStr.replace(/[^\d,]/g, '').replace(',', '.')) : undefined

  return {
    portal: detectPortal(url),
    title,
    description: description?.slice(0, 500),
    price: price && !isNaN(price) ? price : undefined,
    source_url: url,
    collected_at: new Date().toISOString(),
    confidence: 0.4, // baixa confiança sem extração estruturada
  }
}

function detectPortal(url: string): string {
  const portals: Record<string, string> = {
    zapimoveis: 'ZAP Imóveis',
    vivareal: 'VivaReal',
    olx: 'OLX Imóveis',
    imovelweb: 'Imovelweb',
    quintoandar: 'QuintoAndar',
    'venda-imoveis.caixa': 'Portal Caixa',
    loft: 'Loft',
    chaves: 'Chaves na Mão',
  }
  for (const [key, name] of Object.entries(portals)) {
    if (url.includes(key)) return name
  }
  return 'Outro'
}
