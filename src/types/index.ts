// ============================================================
// Tipos centrais do sistema de Análise Mercadológica de Leilões
// ============================================================

export type AnalysisStatus =
  | 'em_analise'
  | 'aprovado'
  | 'descartado'
  | 'arrematado'
  | 'em_posse'
  | 'em_reforma'
  | 'anunciado'
  | 'vendido'
  | 'arquivado'

export type PropertyType =
  | 'apartamento'
  | 'casa'
  | 'comercial'
  | 'terreno'
  | 'galpao'
  | 'sala'
  | 'outro'

export type OccupancyStatus =
  | 'desocupado'
  | 'ocupado'
  | 'ocupado_proprietario'
  | 'ocupado_inquilino'
  | 'em_disputa'
  | 'nao_informado'

export type ComparableScope =
  | 'mesmo_condominio'
  | 'bairro'
  | 'raio_5km'
  | 'outro'

export type ComparableOrigin =
  | 'busca_automatica'
  | 'importacao_link'
  | 'manual'
  | 'corretor'
  | 'fonte_publica'

export type ListingStatus =
  | 'ativo'
  | 'removido'
  | 'vendido'
  | 'duplicado'
  | 'ignorado'
  | 'pendente_revisao'

export type RenovatedStatus = 'sim' | 'nao' | 'parcial' | 'nao_informado'

export type UseInCalculation =
  | 'usar'
  | 'nao_usar'
  | 'revisar'
  | 'duplicado'
  | 'outlier'

export type ConsultationChannel =
  | 'whatsapp'
  | 'telefone'
  | 'email'
  | 'presencial'
  | 'outro'

export type ConfidenceLevel = 'alto' | 'medio' | 'baixo'

export type SearchJobStatus =
  | 'pendente'
  | 'em_andamento'
  | 'concluido'
  | 'erro'

export type SearchType =
  | 'endereco'
  | 'bairro'
  | 'raio'
  | 'importacao_link'

export type Verdict = 'viavel' | 'limitrofe' | 'revisar' | 'indefinido'

export type UserRole = 'admin' | 'analista' | 'consultor'

export type ReferenceType =
  | 'portal_imobiliario'
  | 'fonte_publica'
  | 'link_util'
  | 'condominio_chave'
  | 'premissa_mercado'
  | 'observacao_itbi'
  | 'regra_cartorio'
  | 'parametro_fiscal'
  | 'outro'

// ============================================================
// Entidades do banco de dados
// ============================================================

export interface Profile {
  id: string
  user_id: string
  full_name: string
  company?: string
  phone?: string
  role: UserRole
  created_at: string
}

export interface Condominium {
  id: string
  name: string
  address?: string
  cep?: string
  neighborhood?: string
  city?: string
  state?: string
  latitude?: number
  longitude?: number
  type_pattern?: string
  developer?: string
  estimated_year?: number
  monthly_iptu?: number
  monthly_condo_fee?: number
  manager_contact?: string
  common_area_condition?: string
  delinquency_notes?: string
  planned_works?: string
  vacant_units_notes?: string
  general_notes?: string
  created_at: string
  updated_at: string
}

export interface Analysis {
  id: string
  name: string
  status: AnalysisStatus
  responsible_user_id?: string
  auction_url?: string
  auction_source?: string
  process_number?: string
  registry_number?: string
  notes?: string
  created_at: string
  updated_at: string
  // Joined
  target_property?: TargetProperty
  market_consolidation?: MarketConsolidation
  viability_scenario?: ViabilityScenario
}

export interface TargetProperty {
  id: string
  analysis_id: string
  condominium_id?: string
  address?: string
  cep?: string
  neighborhood?: string
  city?: string
  state?: string
  latitude?: number
  longitude?: number
  property_type?: PropertyType
  private_area?: number
  bedrooms?: number
  parking_spaces?: number
  floor?: number
  description?: string
  occupancy_status?: OccupancyStatus
  created_at: string
  updated_at: string
  // Joined
  condominium?: Condominium
}

export interface ComparableListing {
  id: string
  analysis_id: string
  condominium_id?: string
  scope: ComparableScope
  origin: ComparableOrigin
  source_name?: string
  source_url?: string
  collected_at?: string
  last_checked_at?: string
  title?: string
  address?: string
  neighborhood?: string
  city?: string
  state?: string
  latitude?: number
  longitude?: number
  distance_km?: number
  unit_info?: string
  bedrooms?: number
  parking_spaces?: number
  private_area?: number
  listed_price?: number
  adjusted_price?: number
  price_per_sqm?: number
  floor?: number
  renovated_status?: RenovatedStatus
  accepts_fgts?: boolean
  listing_age?: string
  description?: string
  notes?: string
  listing_status: ListingStatus
  similarity_score?: number
  confidence_score?: number
  use_in_calculation: UseInCalculation
  is_outlier: boolean
  duplicate_of_id?: string
  raw_data_json?: Record<string, unknown>
  created_at: string
  updated_at: string
  // Joined
  condominium?: Condominium
}

export interface Broker {
  id: string
  name: string
  company?: string
  whatsapp?: string
  email?: string
  creci?: string
  region?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface BrokerOpinion {
  id: string
  broker_id: string
  analysis_id: string
  consultation_date?: string
  channel?: ConsultationChannel
  recently_sold?: boolean
  condo_value_estimate?: number
  neighborhood_value_estimate?: number
  radius_value_estimate?: number
  reference_area?: number
  condo_price_per_sqm?: number
  neighborhood_price_per_sqm?: number
  radius_price_per_sqm?: number
  absorption_days?: number
  confidence_level?: ConfidenceLevel
  notes?: string
  created_at: string
  updated_at: string
  // Joined
  broker?: Broker
}

export interface MarketConsolidation {
  id: string
  analysis_id: string
  condo_avg_price_per_sqm?: number
  neighborhood_avg_price_per_sqm?: number
  radius_avg_price_per_sqm?: number
  broker_avg_price_per_sqm?: number
  condo_weight: number
  neighborhood_weight: number
  radius_weight: number
  broker_weight: number
  normalize_weights: boolean
  weighted_price_per_sqm?: number
  estimated_value?: number
  negotiation_discount: number
  pfv?: number
  conservative_value?: number
  optimistic_value?: number
  confidence_score?: number
  created_at: string
  updated_at: string
}

export interface ViabilityScenario {
  id: string
  analysis_id: string
  bid_value?: number
  advisory_percentage: number
  advisory_minimum: number
  auctioneer_percentage: number
  immediate_disbursement?: number
  acquisition_total?: number
  possession_total?: number
  fixed_management_total?: number
  monthly_carrying_cost?: number
  pfv?: number
  sale_costs_total?: number
  total_investment?: number
  expected_sale_months?: number
  net_profit?: number
  roi?: number
  annualized_return?: number
  verdict?: Verdict
  created_at: string
  updated_at: string
  // Joined
  monthly_scenarios?: ViabilityMonthlyScenario[]
  cost_items?: CostItem[]
}

export interface ViabilityMonthlyScenario {
  id: string
  viability_scenario_id: string
  months: number
  carrying_cost: number
  total_cost: number
  net_profit: number
  roi: number
  annualized_return: number
  verdict: Verdict
  created_at: string
}

export interface CostItem {
  id: string
  analysis_id: string
  viability_scenario_id?: string
  category: string
  name: string
  amount?: number
  percentage?: number
  base_amount?: number
  is_monthly: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface SearchJob {
  id: string
  analysis_id: string
  status: SearchJobStatus
  search_type: SearchType
  query?: string
  filters_json?: Record<string, unknown>
  started_at?: string
  finished_at?: string
  results_count?: number
  error_message?: string
  created_at: string
}

export interface SearchResult {
  id: string
  search_job_id: string
  analysis_id: string
  source_name?: string
  source_url?: string
  title?: string
  extracted_data_json?: Record<string, unknown>
  imported_listing_id?: string
  status: string
  created_at: string
}

export interface ReferenceSource {
  id: string
  title: string
  type: ReferenceType
  url?: string
  description?: string
  region?: string
  tags?: string[]
  last_checked_at?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Attachment {
  id: string
  analysis_id: string
  related_table?: string
  related_id?: string
  file_url: string
  file_name: string
  file_type?: string
  uploaded_by?: string
  created_at: string
}

// ============================================================
// Tipos para cálculos
// ============================================================

export interface ConsolidationSource {
  name: string
  label: string
  avg_price_per_sqm?: number
  median_price_per_sqm?: number
  min_price_per_sqm?: number
  max_price_per_sqm?: number
  std_dev?: number
  count: number
  weight: number
  contribution: number
  confidence_score?: number
}

export interface CalculatedConsolidation {
  sources: ConsolidationSource[]
  weighted_price_per_sqm: number
  estimated_value: number
  pfv: number
  conservative_value: number
  optimistic_value: number
  has_sufficient_data: boolean
  warnings: string[]
}

export interface MonthlyScenarioResult {
  months: number
  carrying_cost: number
  total_cost: number
  net_profit: number
  roi: number
  annualized_return: number
  verdict: Verdict
}

// ============================================================
// Tipos para importação de anúncios
// ============================================================

export interface ExtractedListing {
  portal?: string
  title?: string
  address?: string
  neighborhood?: string
  price?: number
  private_area?: number
  bedrooms?: number
  parking_spaces?: number
  floor?: number
  condominium_name?: string
  monthly_condo_fee?: number
  monthly_iptu?: number
  description?: string
  image_urls?: string[]
  collected_at: string
  source_url: string
  confidence: number
  raw?: Record<string, unknown>
}

// ============================================================
// Tipos para Dashboard
// ============================================================

export interface DashboardStats {
  analyses_in_progress: number
  analyses_approved: number
  analyses_discarded: number
  purchases_made: number
  properties_sold: number
  avg_pfv: number
  avg_roi: number
  total_estimated_profit: number
  total_comparables: number
  total_search_jobs: number
}
