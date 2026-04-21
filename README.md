# Leilão Analytics — Análise Mercadológica de Imóveis em Leilão

Sistema web completo para substituição da planilha de análise mercadológica e viabilidade de compra de imóveis em leilão. Banco de dados histórico, automatizado e inteligente para análise de preço de mercado, PFV e viabilidade de arremate.

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth |
| Storage | Supabase Storage |
| Gráficos | Recharts |
| Formulários | React Hook Form + Zod |
| Tabelas | Tanstack Table (nas telas de análise) |
| Testes | Jest + ts-jest |
| Deploy | Vercel (recomendado) |

---

## Pré-requisitos

- Node.js 18+
- npm 9+
- Conta no [Supabase](https://supabase.com)

---

## Como Rodar Localmente

### 1. Clonar o repositório

```bash
git clone https://github.com/stilltnc/market_value.git
cd market_value
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local` e preencha pelo menos as variáveis obrigatórias do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xsxliznkbqgabcdwohgx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-anon-key-JWT>
```

> **Importante:** A `NEXT_PUBLIC_SUPABASE_ANON_KEY` deve ser a chave em formato JWT (começa com `eyJ...`), não a `sb_publishable_`. Você encontra a anon key em **Supabase → Settings → API → Project API keys → anon public**.

### 4. Aplicar migrations no Supabase

Acesse o **SQL Editor** do seu projeto Supabase e execute os arquivos na ordem:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_storage.sql
```

Opcionalmente, execute o seed de dados de demonstração:
```
supabase/seed/001_demo_data.sql
```

### 5. Rodar o servidor de desenvolvimento

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## Variáveis de Ambiente

### Obrigatórias

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon em formato JWT do Supabase |

### Opcionais (Funcionalidades Avançadas)

| Variável | Funcionalidade |
|----------|---------------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Geocodificação precisa (fallback: OpenStreetMap) |
| `SEARCH_API_KEY` | SerpAPI — busca automática via Google Search |
| `FIRECRAWL_API_KEY` | Extração de dados de páginas de portais |
| `APIFY_API_TOKEN` | Automação de coleta em portais |
| `BROWSERLESS_API_KEY` | Navegador headless para extração |
| `OPENAI_API_KEY` | Extração inteligente de dados de anúncios |
| `PERPLEXITY_API_KEY` | Pesquisa e análise de mercado com IA |

Sem as chaves opcionais, o sistema funciona em **modo demo** com dados mockados realistas.

---

## Deploy (Vercel)

1. Conecte o repositório no [Vercel](https://vercel.com)
2. Configure as variáveis de ambiente no painel do Vercel
3. Deploy automático a cada push na branch `main`

```bash
# Build de produção local
npm run build
npm start
```

---

## Estrutura do Projeto

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/          # Tela de login
│   │   └── register/       # Tela de cadastro
│   ├── (dashboard)/
│   │   ├── dashboard/      # Dashboard principal
│   │   ├── analyses/       # Lista e detalhe de análises
│   │   │   ├── [id]/       # Detalhe com 9 abas
│   │   │   └── new/        # Nova análise
│   │   ├── condominiums/   # Cadastro de condomínios
│   │   ├── brokers/        # Cadastro de corretores
│   │   ├── references/     # Base de referências
│   │   ├── reports/        # Relatórios e exportações
│   │   └── settings/       # Configurações
│   └── api/
│       ├── extract-listing/ # Extração de dados por URL
│       └── geocode/         # Geocodificação
├── components/
│   ├── layout/             # Sidebar e TopBar
│   ├── analyses/           # Componentes de análise
│   ├── comparables/        # Lista e CRUD de comparáveis
│   ├── consolidation/      # Consolidado e PFV
│   ├── viability/          # Viabilidade financeira
│   ├── search/             # Busca automatizada
│   ├── dashboard/          # Cards de KPI
│   └── charts/             # Gráficos Recharts
├── lib/
│   ├── calculations/       # Funções de cálculo testáveis
│   ├── search-adapters/    # Adapters de busca (Mock, URL, Google, Firecrawl)
│   ├── geocoding/          # Geocodificação (Google Maps / Nominatim)
│   ├── supabase/           # Clientes Supabase (client/server)
│   └── utils.ts
├── services/               # Camada de acesso ao banco
│   ├── analyses.ts
│   ├── comparables.ts
│   ├── consolidation.ts
│   ├── viability.ts
│   ├── brokers.ts
│   └── search.ts
└── types/index.ts          # Tipos TypeScript centrais
```

---

## Telas Implementadas

| Tela | Rota | Status |
|------|------|--------|
| Login | `/login` | ✅ |
| Cadastro | `/register` | ✅ |
| Dashboard | `/dashboard` | ✅ |
| Lista de Análises | `/analyses` | ✅ |
| Nova Análise | `/analyses/new` | ✅ |
| Detalhe da Análise (9 abas) | `/analyses/[id]` | ✅ |
| Comparáveis (aba) | (dentro do detalhe) | ✅ |
| Busca Automatizada (aba) | (dentro do detalhe) | ✅ |
| Consolidado + PFV (aba) | (dentro do detalhe) | ✅ |
| Viabilidade Financeira (aba) | (dentro do detalhe) | ✅ |
| Condomínios | `/condominiums` | ✅ |
| Corretores | `/brokers` | ✅ |
| Referências | `/references` | ✅ |
| Relatórios / Exportação | `/reports` | ✅ |
| Configurações | `/settings` | ✅ |

---

## Banco de Dados

### Migrations

| Arquivo | Descrição |
|---------|-----------|
| `001_initial_schema.sql` | Todas as tabelas com constraints, índices e triggers |
| `002_rls_policies.sql` | Row Level Security — políticas por tabela |
| `003_storage.sql` | Bucket de storage para anexos |

### Tabelas Principais

- `analyses` — Análises de leilão
- `target_properties` — Imóvel-alvo de cada análise
- `condominiums` — Cadastro reutilizável de condomínios
- `comparable_listings` — Comparáveis de mercado com `price_per_sqm` calculado automaticamente (coluna gerada)
- `broker_opinions` — Opiniões de corretores com R$/m² calculado
- `market_consolidations` — Consolidado com pesos, PFV e intervalos
- `viability_scenarios` — Cenário de viabilidade
- `viability_monthly_scenarios` — Cenários de 2 a 12 meses
- `cost_items` — Itens de custo por categoria
- `search_jobs` / `search_results` — Histórico de buscas automáticas
- `reference_sources` — Base de conhecimento e referências
- `attachments` — Metadados de arquivos no Storage
- `audit_logs` — Trilha de auditoria

---

## Funções de Cálculo (Testáveis)

Todas as funções estão em `src/lib/calculations/index.ts` e são puras (sem efeitos colaterais):

| Função | Descrição |
|--------|-----------|
| `calculatePricePerSqm` | R$/m² = preço / área |
| `calculateMean` | Média aritmética |
| `calculateMedian` | Mediana |
| `calculateStdDev` | Desvio padrão |
| `detectOutliers` | Detecção de outliers por IQR |
| `normalizeWeights` | Normalização de pesos entre fontes com dados |
| `calculateWeightedMarketValue` | Consolidado completo com pesos, médias e PFV |
| `calculatePFV` | PFV = valor estimado × (1 - deságio) |
| `calculateAcquisitionCosts` | Custos de aquisição (ITBI, assessoria, comissão) |
| `calculateCapitalGainTax` | IR = max(PFV - custo IR, 0) × alíquota |
| `calculateViability` | Lucro, ROI e retorno anualizado para N meses |
| `calculateMonthlyScenarios` | Tabela de cenários de 2 a 12 meses |
| `determineVerdict` | Viável / Limítrofe / Revisar |
| `calculateSimilarityScore` | Score 0-100 de similaridade do comparável |
| `detectPossibleDuplicates` | Detecção de anúncios duplicados |
| `haversineDistance` | Distância em km entre dois pontos (lat/lng) |

### Executar Testes

```bash
npm test
npm run test:coverage
```

---

## Módulo de Busca Automatizada

Arquitetura de adapters em `src/lib/search-adapters/index.ts`:

| Adapter | Status | Requer |
|---------|--------|--------|
| `MockSearchAdapter` | ✅ Funcional | Nenhuma chave |
| `UrlImportAdapter` | ✅ Funcional | Nenhuma chave |
| `GoogleSearchAdapter` | 🔧 Estruturado | `SEARCH_API_KEY` (SerpAPI) |
| `FirecrawlAdapter` | 🔧 Estruturado | `FIRECRAWL_API_KEY` |

Para adicionar um novo adapter, implemente a interface `SearchAdapter`:

```typescript
interface SearchAdapter {
  name: string
  label: string
  isAvailable(): boolean
  search(query: SearchQuery): Promise<ExtractedListing[]>
}
```

---

## Regras de Cálculo

### R$/m²
```
price_per_sqm = listed_price / private_area
(somente se listed_price > 0 e private_area > 0)
```

### PFV
```
valor_estimado = área_alvo × R$/m² ponderado
PFV = valor_estimado × (1 - deságio)
deságio_padrão = 11%
intervalo_conservador = PFV × 0,92
intervalo_otimista = PFV × 1,08
```

### Assessoria
```
assessoria = max(bid_value × advisory_percentage, advisory_minimum)
```

### IR sobre Ganho de Capital
```
ganho_capital = PFV - custo_aquisição_IR
IR = max(ganho_capital, 0) × alíquota_IR
(nunca negativo)
```

### ROI
```
lucro_liquido = PFV - custo_total_por_prazo - custos_venda
ROI = lucro_liquido / custo_total_por_prazo
retorno_anualizado = ROI × 12 / meses
```

### Veredito
- ROI ≥ 25% → **Viável**
- ROI ≥ 15% e < 25% → **Limítrofe**
- ROI < 15% → **Revisar**

---

## Próximos Passos Recomendados

### Prioridade 1 — Imediato
- [ ] Configurar `NEXT_PUBLIC_SUPABASE_ANON_KEY` com a chave JWT
- [ ] Aplicar migrations no Supabase via SQL Editor
- [ ] Testar fluxo completo: criar análise → adicionar comparáveis → calcular PFV → viabilidade

### Prioridade 2 — Curto Prazo
- [ ] Implementar aba "Imóvel-alvo" no detalhe da análise (edição de target_property)
- [ ] Implementar aba "Corretores" no detalhe (BrokerOpinion form)
- [ ] Integrar Google Maps para geocodificação (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)
- [ ] Configurar SerpAPI ou Firecrawl para busca automatizada real

### Prioridade 3 — Médio Prazo
- [ ] Relatório PDF com `@react-pdf/renderer` ou Puppeteer
- [ ] Importação da planilha Excel legada
- [ ] Automações recorrentes (revalidação de anúncios)
- [ ] Score de similaridade automático ao importar comparável
- [ ] Deduplicação automática com alerta na interface
- [ ] Mapa de comparáveis com Leaflet/Google Maps

### Prioridade 4 — Longo Prazo
- [ ] App mobile (PWA ou React Native)
- [ ] Integração com Portal Caixa para dados de leilões
- [ ] Análise histórica de preços por região
- [ ] Alertas de novos leilões por critérios de busca

---

## Segurança

- ✅ Variáveis de ambiente nunca commitadas
- ✅ `.env.local` no `.gitignore`
- ✅ Service Role Key **nunca** exposta no frontend
- ✅ Row Level Security habilitado em todas as tabelas
- ✅ Supabase Auth com JWT
- ✅ Extração de URLs sem bypass de captcha/login/paywall
- ✅ `robots.txt` respeitado nos adapters de busca

---

## Licença

Proprietário. Todos os direitos reservados.
