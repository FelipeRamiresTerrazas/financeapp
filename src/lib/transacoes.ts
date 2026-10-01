import { useCallback, useEffect, useState } from 'react'
import { buscarTodas, supabase, type Transacao } from './supabase'

const COLUNAS = [
  'id', 'account_id', 'date', 'description', 'amount', 'type', 'status', 'operation_type', 'pluggy_category',
  'merchant_name', 'counterpart_name', 'payment_method', 'card_last4', 'installment_number', 'total_installments',
  'category_id', 'category_source', 'rule_key', 'notes', 'ignored', 'person_id', 'account_name', 'account_type',
  'connector_name', 'top_category_id', 'kind',
].join(', ')

// Transações de um intervalo [de, ate) — datas ISO
export function useTransacoes(de: string, ate: string) {
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    setCarregando(true)
    const linhas = await buscarTodas<Transacao>((i, f) =>
      supabase.from('v_transactions').select(COLUNAS).gte('date', de).lt('date', ate)
        .order('date', { ascending: false }).order('id').range(i, f)
        .returns<Transacao[]>(),
    )
    setTransacoes(linhas)
    setCarregando(false)
  }, [de, ate])

  useEffect(() => { recarregar() }, [recarregar])

  return { transacoes, carregando, recarregar }
}

// Valor que conta como gasto (positivo) ou receita (positivo); transferências e ignoradas ficam de fora
export const valorGasto = (t: Transacao) => (t.kind === 'despesa' && !t.ignored ? -t.amount : 0)
export const valorReceita = (t: Transacao) => (t.kind === 'receita' && !t.ignored ? t.amount : 0)

// Precisa de revisão: o app não reconheceu e jogou no padrão
export const aRevisar = (t: Transacao) => t.category_source === 'padrao' || !t.category_id

export async function definirCategoria(transacaoId: string, categoriaId: string | null, aprender: boolean) {
  const { data, error } = await supabase.rpc('set_transaction_category', {
    p_transaction_id: transacaoId,
    p_category_id: categoriaId,
    p_aprender: aprender,
  })
  if (error) throw error
  return data as number
}
