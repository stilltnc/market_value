-- ============================================================
-- Dados de demonstração (seed)
-- Execute apenas em ambiente de desenvolvimento
-- ============================================================

-- Condomínio de exemplo
INSERT INTO public.condominiums (
  id, name, address, cep, neighborhood, city, state,
  latitude, longitude, type_pattern, developer, estimated_year,
  monthly_iptu, monthly_condo_fee, general_notes
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Residencial Jardins da Paz',
  'Rua das Flores, 500',
  '01310-100',
  'Jardins',
  'São Paulo',
  'SP',
  -23.5641,
  -46.6535,
  'Padrão Médio',
  'Construtora ABC',
  2010,
  350.00,
  800.00,
  'Condomínio bem conservado, inadimplência baixa'
) ON CONFLICT DO NOTHING;

-- Referências padrão do sistema
INSERT INTO public.reference_sources (title, type, url, description, region) VALUES
  ('ZAP Imóveis', 'portal_imobiliario', 'https://www.zapimoveis.com.br', 'Principal portal imobiliário do Brasil', 'Nacional'),
  ('VivaReal', 'portal_imobiliario', 'https://www.vivareal.com.br', 'Portal imobiliário', 'Nacional'),
  ('OLX Imóveis', 'portal_imobiliario', 'https://www.olx.com.br/imoveis', 'Portal de classificados com imóveis', 'Nacional'),
  ('Imovelweb', 'portal_imobiliario', 'https://www.imovelweb.com.br', 'Portal imobiliário', 'Nacional'),
  ('QuintoAndar', 'portal_imobiliario', 'https://www.quintoandar.com.br', 'Plataforma de aluguel e venda', 'Nacional'),
  ('Portal Caixa CEF', 'fonte_publica', 'https://venda-imoveis.caixa.gov.br', 'Imóveis da Caixa Econômica Federal em leilão', 'Nacional'),
  ('IPTU SP - Prefeitura', 'fonte_publica', 'https://www.prefeitura.sp.gov.br/cidade/secretarias/financas/servicos/iptu/', 'Consulta de IPTU do município de São Paulo', 'São Paulo'),
  ('Alíquota ITBI SP', 'observacao_itbi', NULL, 'ITBI em SP: 3% sobre o valor venal de referência ou valor de transação, o que for maior', 'São Paulo'),
  ('Deságio padrão de negociação', 'premissa_mercado', NULL, '11% é o deságio médio praticado em negociações de mercado secundário em SP', 'São Paulo'),
  ('Absição média apartamentos SP', 'premissa_mercado', NULL, 'Apartamentos padrão médio em SP: 90-120 dias de absorção', 'São Paulo')
ON CONFLICT DO NOTHING;
