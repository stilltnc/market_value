/**
 * Funções de cálculo do sistema de Análise Mercadológica de Leilões
 * Todas as funções são puras e testáveis de forma independente.
 */

import type {
  ComparableListing,
  BrokerOpinion,
  Verdict,
  MonthlyScenarioResult,
  CalculatedConsolidation,
  ConsolidationSource,
} from '@/types'

// ============================================================
// Cálculos básicos
// ============================================================

/**
 * Calcula o preço por m² de um comparável.
 * Retorna undefined se dados insuficientes.
 */
export function calculatePricePerSqm(
  price: number | undefined,
  area: number | undefined
): number | undefined {
  if (!price || !area || price <= 0 || area <= 0) return undefined
  return price / area
}

/**
 * Calcula a média de um array de números.
 */
export function calculateMean(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  return values.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Calcula a mediana de um array de números.
 */
export function calculateMedian(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Calcula o desvio padrão de um array de números.
 */
export function calculateStdDev(values: number[]): number | undefined {
  if (values.length < 2) return undefined
  const mean = calculateMean(values)!
  const squareDiffs = values.map((v) => Math.pow(v - mean, 2))
  return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length)
}

/**
 * Detecta outliers usando o método IQR (interquartil).
 * Retorna os índices dos outliers.
 */
export function detectOutliers(values: number[]): number[] {
  if (values.length < 4) return []
  const sorted = [...values].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
  const q1 = sorted[Math.floor(sorted.length / 4)].v
  const q3 = sorted[Math.floor((3 * sorted.length) / 4)].v
  const iqr = q3 - q1
  const lower = q1 - 1.5 * iqr
  const upper = q3 + 1.5 * iqr
  return sorted.filter(({ v }) => v < lower || v > upper).map(({ i }) => i)
}

/**
 * Normaliza pesos entre as fontes que têm dados válidos.
 */
export function normalizeWeights(
  weights: Record<string, number>,
  hasData: Record<string, boolean>
): Record<string, number> {
  const activeKeys = Object.keys(weights).filter((k) => hasData[k])
  if (activeKeys.length === 0) return weights

  const totalActiveWeight = activeKeys.reduce((s, k) => s + weights[k], 0)
  if (totalActiveWeight === 0) {
    // Distribuir igualmente
    const equal = 1 / activeKeys.length
    const result: Record<string, number> = {}
    Object.keys(weights).forEach((k) => {
      result[k] = hasData[k] ? equal : 0
    })
    return result
  }

  const result: Record<string, number> = {}
  Object.keys(weights).forEach((k) => {
    result[k] = hasData[k] ? weights[k] / totalActiveWeight : 0
  })
  return result
}

// ============================================================
// Consolidado e PFV
// ============================================================

export interface ConsolidationParams {
  condoListings: ComparableListing[]
  neighborhoodListings: ComparableListing[]
  radiusListings: ComparableListing[]
  brokerOpinions: BrokerOpinion[]
  targetArea: number
  condoWeight?: number
  neighborhoodWeight?: number
  radiusWeight?: number
  brokerWeight?: number
  normalizeWeights_: boolean
  negotiationDiscount?: number
  conservativeInterval?: number
  optimisticInterval?: number
  minSimilarityScore?: number
  includeOutliers?: boolean
}

export function calculateWeightedMarketValue(
  params: ConsolidationParams
): CalculatedConsolidation {
  const {
    condoListings,
    neighborhoodListings,
    radiusListings,
    brokerOpinions,
    targetArea,
    condoWeight = 0.35,
    neighborhoodWeight = 0.25,
    radiusWeight = 0.20,
    brokerWeight = 0.20,
    normalizeWeights_: shouldNormalize = true,
    negotiationDiscount = 0.11,
    conservativeInterval = 0.92,
    optimisticInterval = 1.08,
    minSimilarityScore = 0,
    includeOutliers = false,
  } = params

  const filterListings = (listings: ComparableListing[]) =>
    listings.filter((l) => {
      if (l.use_in_calculation !== 'usar') return false
      if (!includeOutliers && l.is_outlier) return false
      if (minSimilarityScore > 0 && (l.similarity_score ?? 0) < minSimilarityScore) return false
      if (!l.price_per_sqm && l.listed_price && l.private_area) {
        l.price_per_sqm = calculatePricePerSqm(l.listed_price, l.private_area)
      }
      return !!(l.price_per_sqm && l.price_per_sqm > 0)
    })

  const validCondo = filterListings(condoListings)
  const validNeighborhood = filterListings(neighborhoodListings)
  const validRadius = filterListings(radiusListings)

  const condoPrices = validCondo.map((l) => l.price_per_sqm!)
  const neighborhoodPrices = validNeighborhood.map((l) => l.price_per_sqm!)
  const radiusPrices = validRadius.map((l) => l.price_per_sqm!)

  // Broker averages
  const brokerCondoPrices = brokerOpinions
    .filter((o) => o.condo_price_per_sqm && o.condo_price_per_sqm > 0)
    .map((o) => o.condo_price_per_sqm!)
  const brokerNeighborhoodPrices = brokerOpinions
    .filter((o) => o.neighborhood_price_per_sqm && o.neighborhood_price_per_sqm > 0)
    .map((o) => o.neighborhood_price_per_sqm!)
  const brokerRadiusPrices = brokerOpinions
    .filter((o) => o.radius_price_per_sqm && o.radius_price_per_sqm > 0)
    .map((o) => o.radius_price_per_sqm!)

  const allBrokerPrices = [
    ...brokerCondoPrices,
    ...brokerNeighborhoodPrices,
    ...brokerRadiusPrices,
  ]

  const condoAvg = calculateMean(condoPrices)
  const neighborhoodAvg = calculateMean(neighborhoodPrices)
  const radiusAvg = calculateMean(radiusPrices)
  const brokerAvg = calculateMean(allBrokerPrices)

  const hasData = {
    condo: !!condoAvg,
    neighborhood: !!neighborhoodAvg,
    radius: !!radiusAvg,
    broker: !!brokerAvg,
  }

  let weights = {
    condo: condoWeight,
    neighborhood: neighborhoodWeight,
    radius: radiusWeight,
    broker: brokerWeight,
  }

  if (shouldNormalize) {
    weights = normalizeWeights(weights, hasData) as typeof weights
  }

  // Verificar se pesos somam ~100%
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)
  const warnings: string[] = []

  if (!shouldNormalize && Math.abs(totalWeight - 1) > 0.01) {
    warnings.push('Peso das fontes não soma 100%')
  }

  const sources: ConsolidationSource[] = [
    {
      name: 'condo',
      label: 'Condomínio',
      avg_price_per_sqm: condoAvg,
      median_price_per_sqm: calculateMedian(condoPrices),
      min_price_per_sqm: condoPrices.length ? Math.min(...condoPrices) : undefined,
      max_price_per_sqm: condoPrices.length ? Math.max(...condoPrices) : undefined,
      std_dev: calculateStdDev(condoPrices),
      count: validCondo.length,
      weight: weights.condo,
      contribution: (condoAvg ?? 0) * weights.condo,
    },
    {
      name: 'neighborhood',
      label: 'Bairro',
      avg_price_per_sqm: neighborhoodAvg,
      median_price_per_sqm: calculateMedian(neighborhoodPrices),
      min_price_per_sqm: neighborhoodPrices.length ? Math.min(...neighborhoodPrices) : undefined,
      max_price_per_sqm: neighborhoodPrices.length ? Math.max(...neighborhoodPrices) : undefined,
      std_dev: calculateStdDev(neighborhoodPrices),
      count: validNeighborhood.length,
      weight: weights.neighborhood,
      contribution: (neighborhoodAvg ?? 0) * weights.neighborhood,
    },
    {
      name: 'radius',
      label: 'Raio 5km',
      avg_price_per_sqm: radiusAvg,
      median_price_per_sqm: calculateMedian(radiusPrices),
      min_price_per_sqm: radiusPrices.length ? Math.min(...radiusPrices) : undefined,
      max_price_per_sqm: radiusPrices.length ? Math.max(...radiusPrices) : undefined,
      std_dev: calculateStdDev(radiusPrices),
      count: validRadius.length,
      weight: weights.radius,
      contribution: (radiusAvg ?? 0) * weights.radius,
    },
    {
      name: 'broker',
      label: 'Corretores',
      avg_price_per_sqm: brokerAvg,
      count: allBrokerPrices.length,
      weight: weights.broker,
      contribution: (brokerAvg ?? 0) * weights.broker,
    },
  ]

  const weighted_price_per_sqm = sources.reduce((s, src) => s + src.contribution, 0)
  const estimated_value = targetArea > 0 ? weighted_price_per_sqm * targetArea : 0
  const pfv = calculatePFV(estimated_value, negotiationDiscount)

  const hasSufficientData =
    Object.values(hasData).filter(Boolean).length >= 1 &&
    (validCondo.length + validNeighborhood.length + validRadius.length + allBrokerPrices.length) >= 3

  if (!hasSufficientData) {
    warnings.push('Dados insuficientes para PFV confiável')
  }

  // Alertas adicionais
  sources.forEach((src) => {
    if (src.avg_price_per_sqm === undefined) {
      warnings.push(`Fonte "${src.label}" sem dados`)
    } else if (src.count < 3) {
      warnings.push(`Poucos comparáveis na fonte "${src.label}" (${src.count})`)
    }
  })

  // Detectar se alguma fonte está muito distante das demais
  const validAvgs = sources
    .filter((s) => s.avg_price_per_sqm !== undefined)
    .map((s) => s.avg_price_per_sqm!)
  if (validAvgs.length > 1) {
    const avgMean = calculateMean(validAvgs)!
    sources.forEach((src) => {
      if (src.avg_price_per_sqm !== undefined) {
        const deviation = Math.abs(src.avg_price_per_sqm - avgMean) / avgMean
        if (deviation > 0.3) {
          warnings.push(`R$/m² da fonte "${src.label}" muito distante das demais`)
        }
      }
    })
  }

  return {
    sources,
    weighted_price_per_sqm,
    estimated_value,
    pfv,
    conservative_value: pfv * conservativeInterval,
    optimistic_value: pfv * optimisticInterval,
    has_sufficient_data: hasSufficientData,
    warnings,
  }
}

/**
 * Calcula o PFV a partir do valor estimado e do deságio.
 */
export function calculatePFV(
  estimatedValue: number,
  negotiationDiscount = 0.11
): number {
  return estimatedValue * (1 - negotiationDiscount)
}

// ============================================================
// Custos de Aquisição
// ============================================================

export interface AcquisitionCostsParams {
  bidValue: number
  advisoryPercentage: number
  advisoryMinimum: number
  auctioneerPercentage: number
  // Aquisição
  auctionCertificate?: number
  lienRelease?: number
  certificates?: number
  itbiBase?: number
  itbiRate?: number
  deed?: number
  registration?: number
  iptuDebt?: number
  condoDebt?: number
  registralService?: number
  otherAcquisitionCosts?: number
}

export interface AcquisitionCostsResult {
  advisory: number
  auctioneerCommission: number
  immediatePayment: number
  itbi: number
  acquisitionTotal: number
}

export function calculateAcquisitionCosts(
  params: AcquisitionCostsParams
): AcquisitionCostsResult {
  const {
    bidValue,
    advisoryPercentage,
    advisoryMinimum,
    auctioneerPercentage,
    auctionCertificate = 0,
    lienRelease = 0,
    certificates = 0,
    itbiBase = 0,
    itbiRate = 0,
    deed = 0,
    registration = 0,
    iptuDebt = 0,
    condoDebt = 0,
    registralService = 0,
    otherAcquisitionCosts = 0,
  } = params

  const advisory = Math.max(bidValue * advisoryPercentage, advisoryMinimum)
  const auctioneerCommission = bidValue * auctioneerPercentage
  const immediatePayment = bidValue + advisory + auctioneerCommission
  const itbi = itbiBase * itbiRate

  const acquisitionTotal =
    auctionCertificate +
    lienRelease +
    certificates +
    itbi +
    deed +
    registration +
    iptuDebt +
    condoDebt +
    registralService +
    otherAcquisitionCosts

  return {
    advisory,
    auctioneerCommission,
    immediatePayment,
    itbi,
    acquisitionTotal,
  }
}

// ============================================================
// IR sobre Ganho de Capital
// ============================================================

export function calculateCapitalGainTax(
  pfv: number,
  acquisitionCostForIR: number,
  irRate = 0.15
): number {
  const capitalGain = pfv - acquisitionCostForIR
  return Math.max(capitalGain, 0) * irRate
}

// ============================================================
// Viabilidade
// ============================================================

export interface ViabilityParams {
  bidValue: number
  advisory: number
  auctioneerCommission: number
  acquisitionTotal: number
  possessionTotal: number
  fixedManagementTotal: number
  monthlyCarryingCost: number
  pfv: number
  brokerCommissionRate: number
  acquisitionCostForIR: number
  irRate?: number
  cbsRate?: number
  ibsRate?: number
  otherSaleCosts?: number
}

export function calculateViability(
  params: ViabilityParams,
  months: number
): MonthlyScenarioResult {
  const {
    bidValue,
    advisory,
    auctioneerCommission,
    acquisitionTotal,
    possessionTotal,
    fixedManagementTotal,
    monthlyCarryingCost,
    pfv,
    brokerCommissionRate,
    acquisitionCostForIR,
    irRate = 0.15,
    cbsRate = 0,
    ibsRate = 0,
    otherSaleCosts = 0,
  } = params

  const totalInvestment =
    bidValue +
    advisory +
    auctioneerCommission +
    acquisitionTotal +
    possessionTotal +
    fixedManagementTotal

  const carryingCost = monthlyCarryingCost * months
  const totalCost = totalInvestment + carryingCost

  const brokerCommission = pfv * brokerCommissionRate
  const capitalGainTax = calculateCapitalGainTax(pfv, acquisitionCostForIR, irRate)
  const cbs = pfv * cbsRate
  const ibs = pfv * ibsRate
  const saleCostsTotal = brokerCommission + capitalGainTax + cbs + ibs + otherSaleCosts

  const netProfit = pfv - totalCost - saleCostsTotal
  const roi = totalCost > 0 ? netProfit / totalCost : 0
  const annualizedReturn = months > 0 ? roi * (12 / months) : 0

  return {
    months,
    carrying_cost: carryingCost,
    total_cost: totalCost,
    net_profit: netProfit,
    roi,
    annualized_return: annualizedReturn,
    verdict: determineVerdict(roi),
  }
}

export function calculateMonthlyScenarios(
  params: ViabilityParams,
  monthsRange: number[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
): MonthlyScenarioResult[] {
  return monthsRange.map((m) => calculateViability(params, m))
}

export function determineVerdict(
  roi: number,
  viableThreshold = 0.25,
  limitrofeThreshold = 0.15
): Verdict {
  if (roi >= viableThreshold) return 'viavel'
  if (roi >= limitrofeThreshold) return 'limitrofe'
  return 'revisar'
}

// ============================================================
// Score de Similaridade
// ============================================================

export interface SimilarityParams {
  comparable: ComparableListing
  targetArea?: number
  targetBedrooms?: number
  targetParkingSpaces?: number
  targetCondominiumId?: string
  targetNeighborhood?: string
  targetPricePerSqm?: number
}

export function calculateSimilarityScore(params: SimilarityParams): number {
  const {
    comparable,
    targetArea,
    targetBedrooms,
    targetParkingSpaces,
    targetCondominiumId,
    targetNeighborhood,
    targetPricePerSqm,
  } = params

  let score = 0
  let maxScore = 0

  // Mesmo condomínio (30 pts)
  maxScore += 30
  if (targetCondominiumId && comparable.condominium_id === targetCondominiumId) {
    score += 30
  } else if (comparable.scope === 'mesmo_condominio') {
    score += 25
  }

  // Distância (20 pts)
  maxScore += 20
  const dist = comparable.distance_km
  if (dist !== undefined) {
    if (dist < 0.5) score += 20
    else if (dist < 1) score += 17
    else if (dist < 2) score += 14
    else if (dist < 3) score += 10
    else if (dist < 5) score += 6
    else score += 2
  } else if (comparable.scope === 'bairro') {
    score += 10
  }

  // Área similar (15 pts)
  maxScore += 15
  if (targetArea && comparable.private_area) {
    const diff = Math.abs(comparable.private_area - targetArea) / targetArea
    if (diff <= 0.05) score += 15
    else if (diff <= 0.10) score += 12
    else if (diff <= 0.20) score += 8
    else if (diff <= 0.30) score += 4
  }

  // Quartos (10 pts)
  maxScore += 10
  if (targetBedrooms !== undefined && comparable.bedrooms !== undefined) {
    if (comparable.bedrooms === targetBedrooms) score += 10
    else if (Math.abs(comparable.bedrooms - targetBedrooms) === 1) score += 5
  }

  // Vagas (10 pts)
  maxScore += 10
  if (targetParkingSpaces !== undefined && comparable.parking_spaces !== undefined) {
    if (comparable.parking_spaces === targetParkingSpaces) score += 10
    else if (Math.abs(comparable.parking_spaces - targetParkingSpaces) <= 1) score += 5
  }

  // Preço por m² próximo (10 pts)
  maxScore += 10
  if (targetPricePerSqm && comparable.price_per_sqm) {
    const diff = Math.abs(comparable.price_per_sqm - targetPricePerSqm) / targetPricePerSqm
    if (diff <= 0.10) score += 10
    else if (diff <= 0.20) score += 7
    else if (diff <= 0.30) score += 4
  }

  // Status do anúncio (5 pts)
  maxScore += 5
  if (comparable.listing_status === 'ativo') score += 5
  else if (comparable.listing_status === 'vendido') score += 4 // vendido é bom dado

  // Qualidade dos dados (5 pts)
  maxScore += 5
  let dataQuality = 0
  if (comparable.price_per_sqm) dataQuality++
  if (comparable.private_area) dataQuality++
  if (comparable.listed_price) dataQuality++
  if (comparable.address || comparable.neighborhood) dataQuality++
  if (comparable.source_url) dataQuality++
  score += dataQuality

  // Dados recentes (5 pts)
  maxScore += 5
  if (comparable.collected_at) {
    const daysAgo = (Date.now() - new Date(comparable.collected_at).getTime()) / (1000 * 60 * 60 * 24)
    if (daysAgo <= 30) score += 5
    else if (daysAgo <= 60) score += 4
    else if (daysAgo <= 90) score += 3
    else if (daysAgo <= 180) score += 2
    else score += 1
  }

  return Math.round((score / maxScore) * 100)
}

// ============================================================
// Deduplicação
// ============================================================

export interface DuplicateCandidate {
  listingA: ComparableListing
  listingB: ComparableListing
  reasons: string[]
  confidence: number
}

export function detectPossibleDuplicates(
  listings: ComparableListing[]
): DuplicateCandidate[] {
  const candidates: DuplicateCandidate[] = []

  for (let i = 0; i < listings.length; i++) {
    for (let j = i + 1; j < listings.length; j++) {
      const a = listings[i]
      const b = listings[j]
      const reasons: string[] = []
      let confidence = 0

      // Mesmo link
      if (a.source_url && b.source_url && a.source_url === b.source_url) {
        reasons.push('Mesmo link')
        confidence += 100
      }

      // Mesmo preço
      if (a.listed_price && b.listed_price && a.listed_price === b.listed_price) {
        reasons.push('Mesmo preço')
        confidence += 30
      }

      // Mesma área
      if (a.private_area && b.private_area && Math.abs(a.private_area - b.private_area) < 2) {
        reasons.push('Área muito similar')
        confidence += 20
      }

      // Mesmo condomínio
      if (
        a.condominium_id &&
        b.condominium_id &&
        a.condominium_id === b.condominium_id
      ) {
        reasons.push('Mesmo condomínio')
        confidence += 15
      }

      // Mesmo bairro + preço próximo + área próxima
      if (
        a.neighborhood &&
        b.neighborhood &&
        a.neighborhood === b.neighborhood &&
        a.listed_price &&
        b.listed_price &&
        Math.abs(a.listed_price - b.listed_price) / a.listed_price < 0.05
      ) {
        reasons.push('Mesmo bairro com preço muito similar')
        confidence += 25
      }

      // Distância geográfica muito próxima
      if (
        a.latitude &&
        a.longitude &&
        b.latitude &&
        b.longitude
      ) {
        const dist = haversineDistance(a.latitude, a.longitude, b.latitude, b.longitude)
        if (dist < 0.05) {
          // menos de 50 metros
          reasons.push('Localização muito próxima')
          confidence += 20
        }
      }

      if (reasons.length >= 2 || confidence >= 50) {
        candidates.push({
          listingA: a,
          listingB: b,
          reasons,
          confidence: Math.min(confidence, 100),
        })
      }
    }
  }

  return candidates.sort((a, b) => b.confidence - a.confidence)
}

// ============================================================
// Geolocalização
// ============================================================

/**
 * Calcula distância entre dois pontos em km (fórmula de Haversine).
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // raio da Terra em km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

// ============================================================
// Formatadores
// ============================================================

export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null) return '-'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value: number | undefined | null, decimals = 1): string {
  if (value === undefined || value === null) return '-'
  return `${(value * 100).toFixed(decimals)}%`
}

export function formatArea(value: number | undefined | null): string {
  if (value === undefined || value === null) return '-'
  return `${value.toFixed(2)} m²`
}

export function formatPricePerSqm(value: number | undefined | null): string {
  if (value === undefined || value === null) return '-'
  return `${formatCurrency(value)}/m²`
}

export function getVerdictLabel(verdict: Verdict): string {
  const labels: Record<Verdict, string> = {
    viavel: 'Viável',
    limitrofe: 'Limítrofe',
    revisar: 'Revisar',
    indefinido: 'Indefinido',
  }
  return labels[verdict] || 'Indefinido'
}

export function getVerdictColor(verdict: Verdict): string {
  const colors: Record<Verdict, string> = {
    viavel: 'text-green-600 bg-green-50',
    limitrofe: 'text-amber-600 bg-amber-50',
    revisar: 'text-red-600 bg-red-50',
    indefinido: 'text-gray-500 bg-gray-50',
  }
  return colors[verdict] || 'text-gray-500 bg-gray-50'
}

export function getSimilarityLabel(score: number): string {
  if (score >= 90) return 'Excelente'
  if (score >= 70) return 'Bom'
  if (score >= 50) return 'Aceitável'
  return 'Baixa similaridade'
}

export function getSimilarityColor(score: number): string {
  if (score >= 90) return 'text-green-600 bg-green-50'
  if (score >= 70) return 'text-blue-600 bg-blue-50'
  if (score >= 50) return 'text-amber-600 bg-amber-50'
  return 'text-red-600 bg-red-50'
}
