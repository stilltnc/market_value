import {
  Clock,
  CheckCircle2,
  XCircle,
  Gavel,
  Home,
  TrendingUp,
  BarChart2,
  DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatPercent } from '@/lib/calculations'
import type { DashboardStats } from '@/types'

// ----------------------------------------------------------------
// Individual card
// ----------------------------------------------------------------

interface CardConfig {
  key: keyof DashboardStats
  label: string
  icon: React.ElementType
  iconClass: string
  bgClass: string
  formatter: (v: number) => string
  description?: string
}

const CARDS: CardConfig[] = [
  {
    key: 'analyses_in_progress',
    label: 'Em Análise',
    icon: Clock,
    iconClass: 'text-blue-600',
    bgClass: 'bg-blue-50',
    formatter: (v) => v.toString(),
    description: 'Análises em andamento',
  },
  {
    key: 'analyses_approved',
    label: 'Aprovadas',
    icon: CheckCircle2,
    iconClass: 'text-green-600',
    bgClass: 'bg-green-50',
    formatter: (v) => v.toString(),
    description: 'Análises aprovadas para lance',
  },
  {
    key: 'analyses_discarded',
    label: 'Descartadas',
    icon: XCircle,
    iconClass: 'text-red-500',
    bgClass: 'bg-red-50',
    formatter: (v) => v.toString(),
    description: 'Análises descartadas',
  },
  {
    key: 'purchases_made',
    label: 'Arrematados',
    icon: Gavel,
    iconClass: 'text-purple-600',
    bgClass: 'bg-purple-50',
    formatter: (v) => v.toString(),
    description: 'Imóveis arrematados',
  },
  {
    key: 'properties_sold',
    label: 'Vendidos',
    icon: Home,
    iconClass: 'text-teal-600',
    bgClass: 'bg-teal-50',
    formatter: (v) => v.toString(),
    description: 'Imóveis vendidos',
  },
  {
    key: 'avg_pfv',
    label: 'PFV Médio',
    icon: DollarSign,
    iconClass: 'text-amber-600',
    bgClass: 'bg-amber-50',
    formatter: (v) => formatCurrency(v),
    description: 'Preço final de venda médio estimado',
  },
  {
    key: 'avg_roi',
    label: 'ROI Médio',
    icon: TrendingUp,
    iconClass: 'text-emerald-600',
    bgClass: 'bg-emerald-50',
    formatter: (v) => formatPercent(v),
    description: 'Retorno médio sobre investimento',
  },
  {
    key: 'total_estimated_profit',
    label: 'Lucro Estimado Total',
    icon: BarChart2,
    iconClass: 'text-indigo-600',
    bgClass: 'bg-indigo-50',
    formatter: (v) => formatCurrency(v),
    description: 'Soma de lucros estimados de todas as análises',
  },
]

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

interface Props {
  stats: DashboardStats
}

export function StatsCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {CARDS.map((card) => {
        const Icon = card.icon
        const value = stats[card.key] as number
        return (
          <div
            key={card.key}
            className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow"
          >
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', card.bgClass)}>
              <Icon size={18} className={card.iconClass} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-none">
                {card.formatter(value ?? 0)}
              </p>
              <p className="text-sm font-medium text-gray-700 mt-1">{card.label}</p>
              {card.description && (
                <p className="text-[11px] text-gray-400 mt-0.5">{card.description}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
