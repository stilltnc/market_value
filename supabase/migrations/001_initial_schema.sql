-- ============================================================
-- Migration 001: Schema inicial do sistema de Análise de Leilões
-- ============================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABELA: profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT,
  company TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'analista' CHECK (role IN ('admin', 'analista', 'consultor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================
-- TABELA: condominiums
-- ============================================================
CREATE TABLE IF NOT EXISTS public.condominiums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  cep TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  type_pattern TEXT,
  developer TEXT,
  estimated_year INTEGER,
  monthly_iptu NUMERIC(12,2),
  monthly_condo_fee NUMERIC(12,2),
  manager_contact TEXT,
  common_area_condition TEXT,
  delinquency_notes TEXT,
  planned_works TEXT,
  vacant_units_notes TEXT,
  general_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: analyses
-- ============================================================
CREATE TABLE IF NOT EXISTS public.analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'em_analise' CHECK (
    status IN (
      'em_analise','aprovado','descartado','arrematado',
      'em_posse','em_reforma','anunciado','vendido','arquivado'
    )
  ),
  responsible_user_id UUID REFERENCES auth.users(id),
  auction_url TEXT,
  auction_source TEXT,
  process_number TEXT,
  registry_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: target_properties
-- ============================================================
CREATE TABLE IF NOT EXISTS public.target_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE NOT NULL,
  condominium_id UUID REFERENCES public.condominiums(id),
  address TEXT,
  cep TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  property_type TEXT CHECK (
    property_type IN ('apartamento','casa','comercial','terreno','galpao','sala','outro')
  ),
  private_area NUMERIC(10,2),
  bedrooms INTEGER,
  parking_spaces INTEGER,
  floor INTEGER,
  description TEXT,
  occupancy_status TEXT DEFAULT 'nao_informado' CHECK (
    occupancy_status IN (
      'desocupado','ocupado','ocupado_proprietario',
      'ocupado_inquilino','em_disputa','nao_informado'
    )
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(analysis_id)
);

-- ============================================================
-- TABELA: comparable_listings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.comparable_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE NOT NULL,
  condominium_id UUID REFERENCES public.condominiums(id),
  scope TEXT NOT NULL DEFAULT 'bairro' CHECK (
    scope IN ('mesmo_condominio','bairro','raio_5km','outro')
  ),
  origin TEXT NOT NULL DEFAULT 'manual' CHECK (
    origin IN ('busca_automatica','importacao_link','manual','corretor','fonte_publica')
  ),
  source_name TEXT,
  source_url TEXT,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  last_checked_at TIMESTAMPTZ,
  title TEXT,
  address TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_km NUMERIC(8,3),
  unit_info TEXT,
  bedrooms INTEGER,
  parking_spaces INTEGER,
  private_area NUMERIC(10,2),
  listed_price NUMERIC(14,2),
  adjusted_price NUMERIC(14,2),
  price_per_sqm NUMERIC(12,2) GENERATED ALWAYS AS (
    CASE WHEN listed_price > 0 AND private_area > 0
         THEN ROUND(listed_price / private_area, 2)
         ELSE NULL END
  ) STORED,
  floor INTEGER,
  renovated_status TEXT DEFAULT 'nao_informado' CHECK (
    renovated_status IN ('sim','nao','parcial','nao_informado')
  ),
  accepts_fgts BOOLEAN,
  listing_age TEXT,
  description TEXT,
  notes TEXT,
  listing_status TEXT NOT NULL DEFAULT 'pendente_revisao' CHECK (
    listing_status IN (
      'ativo','removido','vendido','duplicado','ignorado','pendente_revisao'
    )
  ),
  similarity_score SMALLINT CHECK (similarity_score BETWEEN 0 AND 100),
  confidence_score SMALLINT CHECK (confidence_score BETWEEN 0 AND 100),
  use_in_calculation TEXT NOT NULL DEFAULT 'revisar' CHECK (
    use_in_calculation IN ('usar','nao_usar','revisar','duplicado','outlier')
  ),
  is_outlier BOOLEAN NOT NULL DEFAULT FALSE,
  duplicate_of_id UUID REFERENCES public.comparable_listings(id),
  raw_data_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: brokers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.brokers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  company TEXT,
  whatsapp TEXT,
  email TEXT,
  creci TEXT,
  region TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: broker_opinions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.broker_opinions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE NOT NULL,
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE NOT NULL,
  consultation_date DATE,
  channel TEXT CHECK (
    channel IN ('whatsapp','telefone','email','presencial','outro')
  ),
  recently_sold BOOLEAN,
  condo_value_estimate NUMERIC(14,2),
  neighborhood_value_estimate NUMERIC(14,2),
  radius_value_estimate NUMERIC(14,2),
  reference_area NUMERIC(10,2),
  condo_price_per_sqm NUMERIC(12,2) GENERATED ALWAYS AS (
    CASE WHEN condo_value_estimate > 0 AND reference_area > 0
         THEN ROUND(condo_value_estimate / reference_area, 2)
         ELSE NULL END
  ) STORED,
  neighborhood_price_per_sqm NUMERIC(12,2) GENERATED ALWAYS AS (
    CASE WHEN neighborhood_value_estimate > 0 AND reference_area > 0
         THEN ROUND(neighborhood_value_estimate / reference_area, 2)
         ELSE NULL END
  ) STORED,
  radius_price_per_sqm NUMERIC(12,2) GENERATED ALWAYS AS (
    CASE WHEN radius_value_estimate > 0 AND reference_area > 0
         THEN ROUND(radius_value_estimate / reference_area, 2)
         ELSE NULL END
  ) STORED,
  absorption_days INTEGER,
  confidence_level TEXT DEFAULT 'medio' CHECK (
    confidence_level IN ('alto','medio','baixo')
  ),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: market_consolidations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.market_consolidations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE NOT NULL,
  condo_avg_price_per_sqm NUMERIC(12,2),
  neighborhood_avg_price_per_sqm NUMERIC(12,2),
  radius_avg_price_per_sqm NUMERIC(12,2),
  broker_avg_price_per_sqm NUMERIC(12,2),
  condo_weight NUMERIC(5,4) NOT NULL DEFAULT 0.35,
  neighborhood_weight NUMERIC(5,4) NOT NULL DEFAULT 0.25,
  radius_weight NUMERIC(5,4) NOT NULL DEFAULT 0.20,
  broker_weight NUMERIC(5,4) NOT NULL DEFAULT 0.20,
  normalize_weights BOOLEAN NOT NULL DEFAULT TRUE,
  weighted_price_per_sqm NUMERIC(12,2),
  estimated_value NUMERIC(14,2),
  negotiation_discount NUMERIC(5,4) NOT NULL DEFAULT 0.11,
  pfv NUMERIC(14,2),
  conservative_value NUMERIC(14,2),
  optimistic_value NUMERIC(14,2),
  confidence_score SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(analysis_id)
);

-- ============================================================
-- TABELA: viability_scenarios
-- ============================================================
CREATE TABLE IF NOT EXISTS public.viability_scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE NOT NULL,
  bid_value NUMERIC(14,2),
  advisory_percentage NUMERIC(5,4) NOT NULL DEFAULT 0.05,
  advisory_minimum NUMERIC(12,2) NOT NULL DEFAULT 0,
  auctioneer_percentage NUMERIC(5,4) NOT NULL DEFAULT 0.05,
  immediate_disbursement NUMERIC(14,2),
  acquisition_total NUMERIC(14,2),
  possession_total NUMERIC(14,2),
  fixed_management_total NUMERIC(14,2),
  monthly_carrying_cost NUMERIC(12,2),
  pfv NUMERIC(14,2),
  sale_costs_total NUMERIC(14,2),
  total_investment NUMERIC(14,2),
  expected_sale_months SMALLINT,
  net_profit NUMERIC(14,2),
  roi NUMERIC(8,4),
  annualized_return NUMERIC(8,4),
  verdict TEXT CHECK (verdict IN ('viavel','limitrofe','revisar','indefinido')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(analysis_id)
);

-- ============================================================
-- TABELA: viability_monthly_scenarios
-- ============================================================
CREATE TABLE IF NOT EXISTS public.viability_monthly_scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  viability_scenario_id UUID REFERENCES public.viability_scenarios(id) ON DELETE CASCADE NOT NULL,
  months SMALLINT NOT NULL,
  carrying_cost NUMERIC(14,2) NOT NULL,
  total_cost NUMERIC(14,2) NOT NULL,
  net_profit NUMERIC(14,2) NOT NULL,
  roi NUMERIC(8,4) NOT NULL,
  annualized_return NUMERIC(8,4) NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('viavel','limitrofe','revisar','indefinido')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(viability_scenario_id, months)
);

-- ============================================================
-- TABELA: cost_items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cost_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE NOT NULL,
  viability_scenario_id UUID REFERENCES public.viability_scenarios(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (
    category IN ('leilao','aquisicao','imissao_posse','gestao_reforma','venda','outro')
  ),
  name TEXT NOT NULL,
  amount NUMERIC(14,2),
  percentage NUMERIC(5,4),
  base_amount NUMERIC(14,2),
  is_monthly BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: search_jobs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.search_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (
    status IN ('pendente','em_andamento','concluido','erro')
  ),
  search_type TEXT NOT NULL CHECK (
    search_type IN ('endereco','bairro','raio','importacao_link')
  ),
  query TEXT,
  filters_json JSONB,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  results_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: search_results
-- ============================================================
CREATE TABLE IF NOT EXISTS public.search_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_job_id UUID REFERENCES public.search_jobs(id) ON DELETE CASCADE NOT NULL,
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE NOT NULL,
  source_name TEXT,
  source_url TEXT,
  title TEXT,
  extracted_data_json JSONB,
  imported_listing_id UUID REFERENCES public.comparable_listings(id),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (
    status IN ('pendente','importado','ignorado','erro')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: reference_sources
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reference_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'outro' CHECK (
    type IN (
      'portal_imobiliario','fonte_publica','link_util','condominio_chave',
      'premissa_mercado','observacao_itbi','regra_cartorio','parametro_fiscal','outro'
    )
  ),
  url TEXT,
  description TEXT,
  region TEXT,
  tags TEXT[],
  last_checked_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: attachments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE NOT NULL,
  related_table TEXT,
  related_id UUID,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL CHECK (action IN ('create','update','delete','view')),
  before_json JSONB,
  after_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_analyses_status ON public.analyses(status);
CREATE INDEX IF NOT EXISTS idx_analyses_responsible ON public.analyses(responsible_user_id);
CREATE INDEX IF NOT EXISTS idx_target_properties_analysis ON public.target_properties(analysis_id);
CREATE INDEX IF NOT EXISTS idx_comparable_listings_analysis ON public.comparable_listings(analysis_id);
CREATE INDEX IF NOT EXISTS idx_comparable_listings_scope ON public.comparable_listings(scope);
CREATE INDEX IF NOT EXISTS idx_comparable_listings_use ON public.comparable_listings(use_in_calculation);
CREATE INDEX IF NOT EXISTS idx_broker_opinions_analysis ON public.broker_opinions(analysis_id);
CREATE INDEX IF NOT EXISTS idx_market_consolidations_analysis ON public.market_consolidations(analysis_id);
CREATE INDEX IF NOT EXISTS idx_viability_scenarios_analysis ON public.viability_scenarios(analysis_id);
CREATE INDEX IF NOT EXISTS idx_search_jobs_analysis ON public.search_jobs(analysis_id);
CREATE INDEX IF NOT EXISTS idx_search_results_job ON public.search_results(search_job_id);
CREATE INDEX IF NOT EXISTS idx_cost_items_analysis ON public.cost_items(analysis_id);
CREATE INDEX IF NOT EXISTS idx_cost_items_viability ON public.cost_items(viability_scenario_id);

-- ============================================================
-- FUNÇÕES: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'condominiums','analyses','target_properties','comparable_listings',
    'brokers','broker_opinions','market_consolidations','viability_scenarios',
    'cost_items','reference_sources'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_at_%I ON public.%I;
       CREATE TRIGGER trg_updated_at_%I
         BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();',
      t, t, t, t
    );
  END LOOP;
END $$;

-- ============================================================
-- FUNÇÃO: Auto-criar profile após signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
