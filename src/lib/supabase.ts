import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)

export type Tipo = 'despesa' | 'receita' | 'transferencia'

export interface Categoria {
  id: string
  parent_id: string | null
  name: string
  icon: string
  kind: Tipo
  system_key: string | null
  position: number
}

export interface Pessoa {
  id: string
  name: string
}

export interface Conexao {
  id: string
  connector_name: string | null
  connector_image_url: string | null
  status: string | null
  execution_status: string | null
  last_updated_at: string | null
  consent_expires_at: string | null
  synced_at: string | null
}

export interface Conta {
  id: string
  item_id: string
  type: 'BANK' | 'CREDIT'
  subtype: string | null
  name: string
  nickname: string | null
  number: string | null
  owner: string | null
  balance: number | null
  credit_limit: number | null
  available_credit_limit: number | null
  balance_due_date: string | null
  balance_close_date: string | null
  person_id: string | null
  hidden: boolean
}

export interface Cartao {
  account_id: string
  last4: string
  person_id: string | null
  nickname: string | null
}

export type OrigemCategoria = 'regra' | 'sistema' | 'pluggy' | 'palavra' | 'padrao' | 'manual'

export interface Transacao {
  id: string
  account_id: string
  date: string
  description: string
  amount: number
  type: 'DEBIT' | 'CREDIT'
  status: 'POSTED' | 'PENDING' | null
  operation_type: string | null
  pluggy_category: string | null
  merchant_name: string | null
  counterpart_name: string | null
  payment_method: string | null
  card_last4: string | null
  installment_number: number | null
  total_installments: number | null
  category_id: string | null
  category_source: OrigemCategoria | null
  rule_key: string | null
  notes: string | null
  ignored: boolean
  // da view v_transactions
  person_id: string | null
  account_name: string
  account_type: 'BANK' | 'CREDIT'
  connector_name: string | null
  top_category_id: string | null
  kind: Tipo
}

export interface Regra {
  key: string
  label: string
  category_id: string
  hits: number
  updated_at: string
}

export interface Sincronizacao {
  id: number
  trigger: 'manual' | 'agendado'
  started_at: string
  finished_at: string | null
  status: 'rodando' | 'ok' | 'erro'
  message: string | null
  stats: { conexoes: number; contas: number; novas: number; atualizadas: number; removidasPendentes: number } | null
}

// O PostgREST devolve no máximo 1000 linhas por vez; isto busca todas as páginas
export async function buscarTodas<T>(montar: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const todas: T[] = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await montar(de, de + 999)
    if (error) throw error
    todas.push(...(data ?? []))
    if (!data || data.length < 1000) return todas
  }
}
