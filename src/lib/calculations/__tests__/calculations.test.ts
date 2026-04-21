/**
 * Testes unitários para as funções de cálculo
 * Execute: npm test ou npx jest
 */

import {
  calculatePricePerSqm,
  calculateMean,
  calculateMedian,
  calculateStdDev,
  detectOutliers,
  normalizeWeights,
  calculatePFV,
  calculateAcquisitionCosts,
  calculateCapitalGainTax,
  calculateViability,
  calculateMonthlyScenarios,
  determineVerdict,
  calculateSimilarityScore,
  detectPossibleDuplicates,
  haversineDistance,
  formatCurrency,
  formatPercent,
} from '../index'

import type { ComparableListing } from '@/types'

// ============================================================
// calculatePricePerSqm
// ============================================================
describe('calculatePricePerSqm', () => {
  test('calcula corretamente', () => {
    expect(calculatePricePerSqm(500000, 100)).toBeCloseTo(5000)
  })

  test('retorna undefined se preço zero', () => {
    expect(calculatePricePerSqm(0, 100)).toBeUndefined()
  })

  test('retorna undefined se área zero', () => {
    expect(calculatePricePerSqm(500000, 0)).toBeUndefined()
  })

  test('retorna undefined se undefined', () => {
    expect(calculatePricePerSqm(undefined, undefined)).toBeUndefined()
  })

  test('calcula 750000 / 75 = 10000', () => {
    expect(calculatePricePerSqm(750000, 75)).toBeCloseTo(10000)
  })
})

// ============================================================
// calculateMean
// ============================================================
describe('calculateMean', () => {
  test('média de [1, 2, 3, 4, 5] = 3', () => {
    expect(calculateMean([1, 2, 3, 4, 5])).toBeCloseTo(3)
  })

  test('array vazio retorna undefined', () => {
    expect(calculateMean([])).toBeUndefined()
  })

  test('um elemento retorna o próprio', () => {
    expect(calculateMean([42])).toBeCloseTo(42)
  })
})

// ============================================================
// calculateMedian
// ============================================================
describe('calculateMedian', () => {
  test('mediana de [1, 2, 3, 4, 5] = 3', () => {
    expect(calculateMedian([3, 1, 4, 1, 5])).toBeCloseTo(3)
  })

  test('mediana par = média dos dois centrais', () => {
    expect(calculateMedian([1, 2, 3, 4])).toBeCloseTo(2.5)
  })

  test('array vazio retorna undefined', () => {
    expect(calculateMedian([])).toBeUndefined()
  })
})

// ============================================================
// calculateStdDev
// ============================================================
describe('calculateStdDev', () => {
  test('desvio de [2, 4, 4, 4, 5, 5, 7, 9] ≈ 2', () => {
    expect(calculateStdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 0)
  })

  test('array com um elemento retorna undefined', () => {
    expect(calculateStdDev([5])).toBeUndefined()
  })
})

// ============================================================
// detectOutliers
// ============================================================
describe('detectOutliers', () => {
  test('detecta valores extremos', () => {
    const values = [5000, 5100, 5200, 4900, 5050, 15000, 5150]
    const outlierIndices = detectOutliers(values)
    expect(outlierIndices).toContain(5) // 15000 é outlier
  })

  test('menos de 4 elementos retorna array vazio', () => {
    expect(detectOutliers([1, 2, 3])).toEqual([])
  })
})

// ============================================================
// normalizeWeights
// ============================================================
describe('normalizeWeights', () => {
  test('normaliza pesos entre fontes com dados', () => {
    const weights = { condo: 0.35, neighborhood: 0.25, radius: 0.20, broker: 0.20 }
    const hasData = { condo: true, neighborhood: true, radius: false, broker: false }
    const result = normalizeWeights(weights, hasData)

    // condo + neighborhood = 60% → normalizar para 100%
    expect(result.condo).toBeCloseTo(0.35 / 0.60, 3)
    expect(result.neighborhood).toBeCloseTo(0.25 / 0.60, 3)
    expect(result.radius).toBeCloseTo(0)
    expect(result.broker).toBeCloseTo(0)

    const total = Object.values(result).reduce((a, b) => a + b, 0)
    expect(total).toBeCloseTo(1, 3)
  })

  test('sem dados retorna pesos originais', () => {
    const weights = { condo: 0.35, neighborhood: 0.25, radius: 0.20, broker: 0.20 }
    const hasData = { condo: false, neighborhood: false, radius: false, broker: false }
    const result = normalizeWeights(weights, hasData)
    expect(result).toEqual(weights)
  })
})

// ============================================================
// calculatePFV
// ============================================================
describe('calculatePFV', () => {
  test('PFV com deságio padrão 11%', () => {
    expect(calculatePFV(1000000, 0.11)).toBeCloseTo(890000)
  })

  test('PFV com deságio zero = valor estimado', () => {
    expect(calculatePFV(1000000, 0)).toBeCloseTo(1000000)
  })

  test('PFV com deságio 20%', () => {
    expect(calculatePFV(500000, 0.20)).toBeCloseTo(400000)
  })
})

// ============================================================
// calculateAcquisitionCosts
// ============================================================
describe('calculateAcquisitionCosts', () => {
  test('calcula assessoria corretamente', () => {
    const result = calculateAcquisitionCosts({
      bidValue: 300000,
      advisoryPercentage: 0.05,
      advisoryMinimum: 10000,
      auctioneerPercentage: 0.05,
    })
    expect(result.advisory).toBeCloseTo(15000) // 5% de 300k = 15k > mínimo 10k
    expect(result.auctioneerCommission).toBeCloseTo(15000)
    expect(result.immediatePayment).toBeCloseTo(330000)
  })

  test('usa mínimo de assessoria quando calculado é menor', () => {
    const result = calculateAcquisitionCosts({
      bidValue: 100000,
      advisoryPercentage: 0.05,
      advisoryMinimum: 8000,
      auctioneerPercentage: 0.05,
    })
    expect(result.advisory).toBeCloseTo(8000) // mínimo pois 5% = 5000 < 8000
  })

  test('calcula ITBI', () => {
    const result = calculateAcquisitionCosts({
      bidValue: 300000,
      advisoryPercentage: 0.05,
      advisoryMinimum: 0,
      auctioneerPercentage: 0.05,
      itbiBase: 350000,
      itbiRate: 0.03,
    })
    expect(result.itbi).toBeCloseTo(10500)
  })
})

// ============================================================
// calculateCapitalGainTax
// ============================================================
describe('calculateCapitalGainTax', () => {
  test('IR positivo quando há ganho', () => {
    expect(calculateCapitalGainTax(1000000, 600000, 0.15)).toBeCloseTo(60000)
  })

  test('IR nunca negativo (prejuízo)', () => {
    expect(calculateCapitalGainTax(400000, 600000, 0.15)).toBe(0)
  })

  test('IR zero quando PFV = custo', () => {
    expect(calculateCapitalGainTax(600000, 600000, 0.15)).toBeCloseTo(0)
  })
})

// ============================================================
// calculateViability
// ============================================================
describe('calculateViability', () => {
  const baseParams = {
    bidValue: 300000,
    advisory: 15000,
    auctioneerCommission: 15000,
    acquisitionTotal: 20000,
    possessionTotal: 5000,
    fixedManagementTotal: 30000,
    monthlyCarryingCost: 2000,
    pfv: 600000,
    brokerCommissionRate: 0.06,
    acquisitionCostForIR: 385000,
    irRate: 0.15,
  }

  test('calcula lucro líquido para 6 meses', () => {
    const result = calculateViability(baseParams, 6)
    expect(result.months).toBe(6)
    expect(result.carrying_cost).toBeCloseTo(12000) // 2000 * 6
    // total_cost = 385000 + 12000 = 397000
    expect(result.total_cost).toBeCloseTo(397000)
  })

  test('ROI positivo em cenário favorável', () => {
    const result = calculateViability(baseParams, 6)
    expect(result.roi).toBeGreaterThan(0)
  })

  test('retorno anualizado = ROI * 12 / meses', () => {
    const result = calculateViability(baseParams, 6)
    expect(result.annualized_return).toBeCloseTo(result.roi * (12 / 6), 3)
  })
})

// ============================================================
// determineVerdict
// ============================================================
describe('determineVerdict', () => {
  test('ROI >= 25% = viavel', () => {
    expect(determineVerdict(0.30)).toBe('viavel')
    expect(determineVerdict(0.25)).toBe('viavel')
  })

  test('ROI entre 15% e 25% = limitrofe', () => {
    expect(determineVerdict(0.20)).toBe('limitrofe')
    expect(determineVerdict(0.15)).toBe('limitrofe')
  })

  test('ROI < 15% = revisar', () => {
    expect(determineVerdict(0.10)).toBe('revisar')
    expect(determineVerdict(-0.05)).toBe('revisar')
  })
})

// ============================================================
// calculateMonthlyScenarios
// ============================================================
describe('calculateMonthlyScenarios', () => {
  test('gera 11 cenários de 2 a 12 meses', () => {
    const params = {
      bidValue: 300000,
      advisory: 15000,
      auctioneerCommission: 15000,
      acquisitionTotal: 20000,
      possessionTotal: 5000,
      fixedManagementTotal: 30000,
      monthlyCarryingCost: 2000,
      pfv: 600000,
      brokerCommissionRate: 0.06,
      acquisitionCostForIR: 385000,
    }
    const scenarios = calculateMonthlyScenarios(params)
    expect(scenarios).toHaveLength(11)
    expect(scenarios[0].months).toBe(2)
    expect(scenarios[10].months).toBe(12)
  })

  test('custo de carregamento cresce com os meses', () => {
    const params = {
      bidValue: 300000,
      advisory: 15000,
      auctioneerCommission: 15000,
      acquisitionTotal: 20000,
      possessionTotal: 5000,
      fixedManagementTotal: 30000,
      monthlyCarryingCost: 2000,
      pfv: 600000,
      brokerCommissionRate: 0.06,
      acquisitionCostForIR: 385000,
    }
    const scenarios = calculateMonthlyScenarios(params)
    expect(scenarios[1].carrying_cost).toBeGreaterThan(scenarios[0].carrying_cost)
  })
})

// ============================================================
// haversineDistance
// ============================================================
describe('haversineDistance', () => {
  test('distância de SP para RJ ≈ 357 km', () => {
    const dist = haversineDistance(-23.5505, -46.6333, -22.9068, -43.1729)
    expect(dist).toBeGreaterThan(350)
    expect(dist).toBeLessThan(370)
  })

  test('distância zero para mesmo ponto', () => {
    expect(haversineDistance(-23.55, -46.63, -23.55, -46.63)).toBeCloseTo(0)
  })
})

// ============================================================
// detectPossibleDuplicates
// ============================================================
describe('detectPossibleDuplicates', () => {
  const makeComparable = (overrides: Partial<ComparableListing>): ComparableListing => ({
    id: Math.random().toString(),
    analysis_id: 'test',
    scope: 'bairro',
    origin: 'manual',
    listing_status: 'ativo',
    use_in_calculation: 'revisar',
    is_outlier: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  })

  test('detecta duplicado por mesmo link', () => {
    const listings = [
      makeComparable({ id: '1', source_url: 'https://zap.com/1' }),
      makeComparable({ id: '2', source_url: 'https://zap.com/1' }),
    ]
    const dupes = detectPossibleDuplicates(listings)
    expect(dupes.length).toBeGreaterThan(0)
    expect(dupes[0].reasons).toContain('Mesmo link')
  })

  test('não detecta duplicado em listings distintos', () => {
    const listings = [
      makeComparable({ id: '1', source_url: 'https://zap.com/1', listed_price: 500000, private_area: 80 }),
      makeComparable({ id: '2', source_url: 'https://zap.com/2', listed_price: 750000, private_area: 120 }),
    ]
    const dupes = detectPossibleDuplicates(listings)
    expect(dupes.length).toBe(0)
  })
})

// ============================================================
// Formatters
// ============================================================
describe('formatCurrency', () => {
  test('formata valor em R$', () => {
    const result = formatCurrency(1000000)
    expect(result).toContain('1.000.000')
  })

  test('retorna traço para undefined', () => {
    expect(formatCurrency(undefined)).toBe('-')
  })
})

describe('formatPercent', () => {
  test('formata 0.25 como 25.0%', () => {
    expect(formatPercent(0.25)).toBe('25.0%')
  })

  test('retorna traço para undefined', () => {
    expect(formatPercent(undefined)).toBe('-')
  })
})
