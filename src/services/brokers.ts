/**
 * Serviço de CRUD para Corretores e Opiniões de Corretores
 */

import { createClient } from '@/lib/supabase/client'
import type { Broker, BrokerOpinion } from '@/types'

// ============================================================
// Corretores
// ============================================================

export async function getBrokers(): Promise<Broker[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('brokers')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Erro ao buscar corretores: ${error.message}`)
  }

  return (data as Broker[]) ?? []
}

export async function createBroker(data: Partial<Broker>): Promise<Broker> {
  const supabase = createClient()

  const { data: created, error } = await supabase
    .from('brokers')
    .insert(data)
    .select()
    .single()

  if (error) {
    throw new Error(`Erro ao criar corretor: ${error.message}`)
  }

  return created as Broker
}

export async function updateBroker(id: string, data: Partial<Broker>): Promise<Broker> {
  const supabase = createClient()

  const { data: updated, error } = await supabase
    .from('brokers')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Erro ao atualizar corretor: ${error.message}`)
  }

  return updated as Broker
}

export async function deleteBroker(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('brokers')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Erro ao excluir corretor: ${error.message}`)
  }
}

// ============================================================
// Opiniões de Corretores
// ============================================================

export async function getBrokerOpinions(analysisId: string): Promise<BrokerOpinion[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('broker_opinions')
    .select(`
      *,
      broker: brokers (*)
    `)
    .eq('analysis_id', analysisId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Erro ao buscar opiniões de corretores: ${error.message}`)
  }

  return (data as unknown as BrokerOpinion[]) ?? []
}

export async function createBrokerOpinion(
  data: Partial<BrokerOpinion>
): Promise<BrokerOpinion> {
  const supabase = createClient()

  const { data: created, error } = await supabase
    .from('broker_opinions')
    .insert(data)
    .select(`
      *,
      broker: brokers (*)
    `)
    .single()

  if (error) {
    throw new Error(`Erro ao criar opinião de corretor: ${error.message}`)
  }

  return created as unknown as BrokerOpinion
}

export async function updateBrokerOpinion(
  id: string,
  data: Partial<BrokerOpinion>
): Promise<BrokerOpinion> {
  const supabase = createClient()

  const { data: updated, error } = await supabase
    .from('broker_opinions')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(`
      *,
      broker: brokers (*)
    `)
    .single()

  if (error) {
    throw new Error(`Erro ao atualizar opinião de corretor: ${error.message}`)
  }

  return updated as unknown as BrokerOpinion
}

export async function deleteBrokerOpinion(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('broker_opinions')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Erro ao excluir opinião de corretor: ${error.message}`)
  }
}
