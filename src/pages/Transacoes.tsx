import { useMemo, useState } from 'react'
import { Search, Sparkles, ArrowLeftRight, Clock, ReceiptText } from 'lucide-react'
import { Chips, Icone, Painel, SeletorCategoria, SeletorMes, Carregando, Vazio } from '../components/ui'
import EditarTransacao from '../components/EditarTransacao'
import { useDados } from '../lib/DadosContext'
import { brl, diaPorExtenso, limitesDoMes, mesAtual, normalizar, type Mes } from '../lib/formato'
import { irPara } from '../lib/navegacao'
import { aRevisar, useTransacoes, valorGasto, valorReceita } from '../lib/transacoes'
import type { Transacao } from '../lib/supabase'

type FiltroTipo = 'todos' | 'despesa' | 'receita' | 'transferencia' | 'revisar'

const TIPOS: { id: FiltroTipo; nome: string }[] = [
  { id: 'todos', nome: 'Tudo' },
  { id: 'despesa', nome: 'Gastos' },
  { id: 'receita', nome: 'Receitas' },
  { id: 'transferencia', nome: 'Transferências' },
  { id: 'revisar', nome: 'A revisar' },
]

export default function Transacoes({ params, aviso }: { params: URLSearchParams; aviso: (m: string) => void }) {
  const { categoriaPorId, contas, pessoas } = useDados()
  const mes: Mes = params.get('mes') || mesAtual()
  const categoria = params.get('categoria')
  const tipo = (params.get('tipo') as FiltroTipo) || 'todos'
  const pessoa = params.get('pessoa') || 'todos'
  const conta = params.get('conta')
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState<Transacao | null>(null)

  const { de, ate } = limitesDoMes(mes)
  const { transacoes, carregando, recarregar } = useTransacoes(de, ate)

  // atualiza um filtro mantendo os outros
  const filtrar = (mudanca: Record<string, string | null>) =>
    irPara('transacoes', { mes, categoria, tipo: tipo === 'todos' ? null : tipo, pessoa: pessoa === 'todos' ? null : pessoa, conta, ...mudanca })

  const filtradas = useMemo(() => {
    const termo = normalizar(busca)
    return transacoes.filter(t =>
      (!categoria || t.category_id === categoria || t.top_category_id === categoria) &&
      (tipo === 'todos' || (tipo === 'revisar' ? aRevisar(t) : t.kind === tipo)) &&
      (pessoa === 'todos' || t.person_id === pessoa) &&
      (!conta || t.account_id === conta) &&
      (!termo || normalizar(`${t.description} ${t.merchant_name ?? ''} ${t.counterpart_name ?? ''} ${t.notes ?? ''}`).includes(termo)),
    )
  }, [transacoes, categoria, tipo, pessoa, conta, busca])

  const porDia = useMemo(() => {
    const grupos = new Map<string, Transacao[]>()
    for (const t of filtradas) grupos.set(t.date, [...(grupos.get(t.date) ?? []), t])
    return [...grupos.entries()]
  }, [filtradas])

  const gastos = filtradas.reduce((s, t) => s + valorGasto(t), 0)
  const receitas = filtradas.reduce((s, t) => s + valorReceita(t), 0)
  const contaPorId = new Map(contas.map(c => [c.id, c]))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="hidden text-xl font-bold text-fg md:block">Transações</h2>
        <SeletorMes mes={mes} aoMudar={m => filtrar({ mes: m })} />
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input className="campo pl-9" placeholder="Buscar por descrição, loja ou pessoa" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <Chips opcoes={TIPOS} valor={tipo} aoMudar={v => filtrar({ tipo: v === 'todos' ? null : v })} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <SeletorCategoria valor={categoria} aoMudar={id => filtrar({ categoria: id })} incluirVazio="Todas as categorias" className="campo py-1.5 text-xs" />
          <select className="campo py-1.5 text-xs" value={conta ?? ''} onChange={e => filtrar({ conta: e.target.value || null })}>
            <option value="">Todas as contas e cartões</option>
            {contas.filter(c => !c.hidden).map(c => <option key={c.id} value={c.id}>{c.nickname || c.name}</option>)}
          </select>
          <select className="campo py-1.5 text-xs" value={pessoa} onChange={e => filtrar({ pessoa: e.target.value === 'todos' ? null : e.target.value })}>
            <option value="todos">Toda a família</option>
            {pessoas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <span className="text-muted">{filtradas.length} transações</span>
        <span className="text-muted">Gastos <strong className="text-fg">{brl(gastos)}</strong></span>
        <span className="text-muted">Receitas <strong className="text-positivo">{brl(receitas)}</strong></span>
      </div>

      {carregando ? <Carregando /> : filtradas.length === 0 ? (
        <Painel>
          <Vazio icone={<ReceiptText size={28} />} titulo="Nenhuma transação aqui">
            {transacoes.length ? 'Tente outro filtro ou outro mês.' : 'Conecte seus bancos em Contas e sincronize para ver suas transações.'}
          </Vazio>
        </Painel>
      ) : (
        <div className="space-y-4">
          {porDia.map(([dia, lista]) => (
            <div key={dia}>
              <p className="mb-1.5 px-1 text-xs font-medium capitalize text-muted">{diaPorExtenso(dia)}</p>
              <Painel className="divide-y divide-line overflow-hidden">
                {lista.map(t => {
                  const cat = t.category_id ? categoriaPorId.get(t.category_id) : null
                  const mae = cat?.parent_id ? categoriaPorId.get(cat.parent_id) : null
                  const revisar = aRevisar(t)
                  return (
                    <button key={t.id} onClick={() => setEditando(t)} className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 ${t.ignored ? 'opacity-50' : ''}`}>
                      <div className="shrink-0 rounded-xl bg-surface-2 p-2 text-fg-2">
                        {t.kind === 'transferencia' ? <ArrowLeftRight size={18} /> : <Icone nome={cat?.icon} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-fg">
                          {t.description}
                          {t.total_installments && t.total_installments > 1 && <span className="ml-1.5 text-xs font-normal text-muted">{t.installment_number}/{t.total_installments}</span>}
                        </p>
                        <p className="flex items-center gap-1 truncate text-xs text-muted">
                          {revisar ? (
                            <span className="flex items-center gap-1 text-brand"><Sparkles size={11} /> Escolher categoria</span>
                          ) : (
                            <span>{mae ? `${mae.name} › ${cat?.name}` : cat?.name}</span>
                          )}
                          <span className="text-subtle">· {contaPorId.get(t.account_id)?.nickname || t.account_name}{t.card_last4 ? ` ·${t.card_last4}` : ''}</span>
                          {t.status === 'PENDING' && <Clock size={11} className="shrink-0 text-subtle" aria-label="pendente" />}
                        </p>
                      </div>
                      <span className={`shrink-0 text-sm font-semibold ${t.amount > 0 ? 'text-positivo' : 'text-fg'}`}>
                        {t.amount > 0 ? '+' : ''}{brl(t.amount)}
                      </span>
                    </button>
                  )
                })}
              </Painel>
            </div>
          ))}
        </div>
      )}

      {editando && (
        <EditarTransacao
          transacao={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={msg => { setEditando(null); aviso(msg); recarregar() }}
        />
      )}
    </div>
  )
}
