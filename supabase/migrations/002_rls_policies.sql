-- ============================================================
-- Migration 002: Row Level Security (RLS) Policies
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condominiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparable_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_opinions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_consolidations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viability_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viability_monthly_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS: profiles
-- ============================================================
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins podem ver todos os perfis"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- POLÍTICAS: condominiums (todos os autenticados podem ver e criar)
-- ============================================================
CREATE POLICY "Autenticados podem ver condomínios"
  ON public.condominiums FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Autenticados podem criar condomínios"
  ON public.condominiums FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Autenticados podem atualizar condomínios"
  ON public.condominiums FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================================
-- POLÍTICAS: analyses
-- ============================================================
CREATE POLICY "Autenticados podem ver análises"
  ON public.analyses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Autenticados podem criar análises"
  ON public.analyses FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Responsáveis ou admins podem atualizar análises"
  ON public.analyses FOR UPDATE
  TO authenticated
  USING (
    responsible_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins podem deletar análises"
  ON public.analyses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- POLÍTICAS: tabelas filhas de analyses (target_properties, comparables, etc.)
-- Todas as tabelas com analysis_id herdam acesso via análise
-- ============================================================

-- target_properties
CREATE POLICY "Autenticados podem ver imóveis-alvo"
  ON public.target_properties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem criar imóveis-alvo"
  ON public.target_properties FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados podem atualizar imóveis-alvo"
  ON public.target_properties FOR UPDATE TO authenticated USING (true);

-- comparable_listings
CREATE POLICY "Autenticados podem ver comparáveis"
  ON public.comparable_listings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem criar comparáveis"
  ON public.comparable_listings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados podem atualizar comparáveis"
  ON public.comparable_listings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Autenticados podem deletar comparáveis"
  ON public.comparable_listings FOR DELETE TO authenticated USING (true);

-- brokers
CREATE POLICY "Autenticados podem ver corretores"
  ON public.brokers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem criar corretores"
  ON public.brokers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados podem atualizar corretores"
  ON public.brokers FOR UPDATE TO authenticated USING (true);

-- broker_opinions
CREATE POLICY "Autenticados podem ver opiniões de corretores"
  ON public.broker_opinions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem criar opiniões de corretores"
  ON public.broker_opinions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados podem atualizar opiniões de corretores"
  ON public.broker_opinions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Autenticados podem deletar opiniões de corretores"
  ON public.broker_opinions FOR DELETE TO authenticated USING (true);

-- market_consolidations
CREATE POLICY "Autenticados podem ver consolidados"
  ON public.market_consolidations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem criar consolidados"
  ON public.market_consolidations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados podem atualizar consolidados"
  ON public.market_consolidations FOR UPDATE TO authenticated USING (true);

-- viability_scenarios
CREATE POLICY "Autenticados podem ver cenários de viabilidade"
  ON public.viability_scenarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem criar cenários de viabilidade"
  ON public.viability_scenarios FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados podem atualizar cenários de viabilidade"
  ON public.viability_scenarios FOR UPDATE TO authenticated USING (true);

-- viability_monthly_scenarios
CREATE POLICY "Autenticados podem ver cenários mensais"
  ON public.viability_monthly_scenarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem criar cenários mensais"
  ON public.viability_monthly_scenarios FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados podem atualizar cenários mensais"
  ON public.viability_monthly_scenarios FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Autenticados podem deletar cenários mensais"
  ON public.viability_monthly_scenarios FOR DELETE TO authenticated USING (true);

-- cost_items
CREATE POLICY "Autenticados podem ver itens de custo"
  ON public.cost_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem criar itens de custo"
  ON public.cost_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados podem atualizar itens de custo"
  ON public.cost_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Autenticados podem deletar itens de custo"
  ON public.cost_items FOR DELETE TO authenticated USING (true);

-- search_jobs
CREATE POLICY "Autenticados podem ver buscas"
  ON public.search_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem criar buscas"
  ON public.search_jobs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados podem atualizar buscas"
  ON public.search_jobs FOR UPDATE TO authenticated USING (true);

-- search_results
CREATE POLICY "Autenticados podem ver resultados de busca"
  ON public.search_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem criar resultados de busca"
  ON public.search_results FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados podem atualizar resultados de busca"
  ON public.search_results FOR UPDATE TO authenticated USING (true);

-- reference_sources
CREATE POLICY "Autenticados podem ver referências"
  ON public.reference_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem criar referências"
  ON public.reference_sources FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados podem atualizar referências"
  ON public.reference_sources FOR UPDATE TO authenticated USING (true);

-- attachments
CREATE POLICY "Autenticados podem ver anexos"
  ON public.attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem criar anexos"
  ON public.attachments FOR INSERT TO authenticated WITH CHECK (true);

-- audit_logs
CREATE POLICY "Admins podem ver audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
CREATE POLICY "Sistema pode inserir audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
