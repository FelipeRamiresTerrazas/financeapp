import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Sparkles, TrendingDown, TrendingUp, Wallet, CreditCard, Landmark } from 'lucide-react'
import { Chips, Icone, Painel, SeletorMes, Carregando, Vazio } from '../components/ui'
import { useDados } from '../lib/DadosContext'
import { useEstiloGrafico } from '../theme/TemaContext'
import RoscaGastos from '../components/RoscaGastos'
import { brl, brlCurto, limitesDoMes, mesAtual, nomeDoMes, somarMeses, ultimoDia, type Mes } from '../lib/formato'
import { irPara } from '../lib/navegacao'
import { aRevisar, useTransacoes, valorGasto, valorReceita } from '../lib/transacoes'
import { supabase } from '../lib/supabase'

interface TotalMensal { month: string; top_category_id: string | null; kind: string; total: number }

export default function Visao({ params }: { params: URLSearchParams }) {
  const { categoriaPorId, pessoas, contas, conexoes, carregando: carregandoDados } = useDados()
  const grafico = useEstiloGrafico()
  const mes: Mes = params.get('mes') || mesAtual()
  const pessoa = params.get('pessoa') || 'todos'
  const [categoriaEvolucao, setCategoriaEvolucao] = useState<string | null>(null)
  const [mensais, setMensais] = useState<TotalMensal[]>([])

  const navegar = (m: Record<string, string | null>) =>
    irPara('visao', { mes, pessoa: pessoa === 'todos' ? null : pessoa, ...m })

  const { de, ate } = limitesDoMes(mes)
  const { transacoes: todas, carregando } = useTransacoes(de, ate)
  const transacoes = useMemo(() => (pessoa === 'todos' ? todas : todas.filter(t => t.person_id === pessoa)), [todas, pessoa])

  // últimos 12 meses para a evolução e a comparação com o mês anterior
  const inicio12 = somarMeses(mes, -11)
  useEffect(() => {
    supabase.rpc('monthly_totals', { p_from: `${inicio12}-01`, p_to: ultimoDia(mes), p_person: pessoa === 'todos' ? null : pessoa })
      .then(({ data }) => setMensais((data as TotalMensal[]) ?? []))
  }, [inicio12, mes, pessoa])

  const gastos = transacoes.reduce((s, t) => s + valorGasto(t), 0)
  const receitas = transacoes.reduce((s, t) => s + valorReceita(t), 0)
  const mesAnterior = somarMeses(mes, -1)
  const gastosAnterior = mensais.filter(m => m.month.startsWith(mesAnterior) && m.kind === 'despesa').reduce((s, m) => s - m.total, 0)
  const variacao = gastosAnterior > 0 ? (gastos - gastosAnterior) / gastosAnterior : null
  const revisar = transacoes.filter(aRevisar).length

  const contasVisiveis = contas.filter(c => !c.hidden && (pessoa === 'todos' || c.person_id === pessoa))
  const saldoContas = contasVisiveis.filter(c => c.type === 'BANK').reduce((s, c) => s + (c.balance ?? 0), 0)
  const faturasAbertas = contasVisiveis.filter(c => c.type === 'CREDIT').reduce((s, c) => s + (c.balance ?? 0), 0)

  const evolucao = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const m = somarMeses(inicio12, i)
    const total = mensais
      .filter(x => x.month.startsWith(m) && x.kind === 'despesa' && (!categoriaEvolucao || x.top_category_id === categoriaEvolucao))
      .reduce((s, x) => s - x.total, 0)
    return { mes: m, rotulo: nomeDoMes(m, true), total: Math.max(0, total) }
  }), [mensais, inicio12, categoriaEvolucao])

  const maiores = [...transacoes].filter(t => valorGasto(t) > 0).sort((a, b) => valorGasto(b) - valorGasto(a)).slice(0, 6)

  const porPessoa = useMemo(() => {
    const totais = new Map<string, number>()
    for (const t of todas) {
      const v = valorGasto(t)
      if (v) totais.set(t.person_id ?? 'sem', (totais.get(t.person_id ?? 'sem') ?? 0) + v)
    }
    return [...totais.entries()].sort((a, b) => b[1] - a[1])
  }, [todas])

  const nomeCategoria = (id: string) => (id === 'sem' ? 'Sem categoria' : categoriaPorId.get(id)?.name ?? '—')
  const nomePessoa = (id: string) => pessoas.find(p => p.id === id)?.name ?? 'Sem pessoa definida'

  if (carregandoDados) return <Carregando />

  if (!conexoes.length) {
    return (
      <Painel>
        <Vazio icone={<Landmark size={28} />} titulo="Conecte seus bancos para começar">
          <p>Os dados chegam pelo Open Finance via Meu Pluggy (gratuito para uso pessoal).</p>
          <button onClick={() => irPara('contas')} className="mt-3 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-on-brand hover:bg-brand-strong">
            Configurar conexões
          </button>
        </Vazio>
      </Painel>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="hidden text-xl font-bold text-fg md:block">Visão geral</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Chips
            opcoes={[{ id: 'todos', nome: 'Família' }, ...pessoas.map(p => ({ id: p.id, nome: p.name }))]}
            valor={pessoa}
            aoMudar={v => navegar({ pessoa: v === 'todos' ? null : v })}
          />
          <SeletorMes mes={mes} aoMudar={m => navegar({ mes: m })} />
        </div>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Painel className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted"><TrendingDown size={14} /> Gastos do mês</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-fg">{brl(gastos)}</p>
          {variacao != null && (
            <p className={`mt-0.5 text-xs ${variacao > 0 ? 'text-negativo' : 'text-positivo'}`}>
              {variacao > 0 ? '+' : ''}{(variacao * 100).toFixed(0)}% vs {nomeDoMes(mesAnterior, true)}
            </p>
          )}
        </Painel>
        <Painel className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted"><TrendingUp size={14} /> Receitas do mês</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-fg">{brl(receitas)}</p>
          <p className={`mt-0.5 text-xs ${receitas - gastos >= 0 ? 'text-positivo' : 'text-negativo'}`}>
            Sobra {brl(receitas - gastos)}
          </p>
        </Painel>
        <Painel className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted"><Wallet size={14} /> Saldo em contas</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-fg">{brl(saldoContas)}</p>
          <p className="mt-0.5 text-xs text-muted">agora</p>
        </Painel>
        <Painel className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted"><CreditCard size={14} /> Faturas abertas</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-fg">{brl(faturasAbertas)}</p>
          <p className="mt-0.5 text-xs text-muted">soma dos cartões</p>
        </Painel>
      </div>

      {revisar > 0 && (
        <button
          onClick={() => irPara('transacoes', { mes, tipo: 'revisar', pessoa: pessoa === 'todos' ? null : pessoa })}
          className="flex w-full items-center gap-3 rounded-2xl border border-brand/30 bg-brand/5 px-4 py-3 text-left hover:bg-brand/10"
        >
          <Sparkles size={18} className="shrink-0 text-brand" />
          <span className="text-sm text-fg-2">
            <strong className="text-fg">{revisar} {revisar === 1 ? 'transação' : 'transações'} sem categoria certa.</strong>{' '}
            Categorize uma vez e o app aprende para as próximas.
          </span>
        </button>
      )}

      {carregando ? <Carregando /> : (
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Gastos por categoria: rosca com aprofundamento para subcategorias */}
          <Painel className="p-4 md:p-5 lg:col-span-3">
            <h3 className="mb-3 font-semibold text-fg">Gastos por categoria</h3>
            {gastos > 0 ? (
              <RoscaGastos
                key={`${mes}-${pessoa}`}
                transacoes={transacoes}
                aoAbrirTransacoes={id => irPara('transacoes', { mes, categoria: id, tipo: 'despesa', pessoa: pessoa === 'todos' ? null : pessoa })}
                aoVerEvolucao={id => {
                  setCategoriaEvolucao(id)
                  document.getElementById('evolucao')?.scrollIntoView({ behavior: 'smooth' })
                }}
              />
            ) : (
              <p className="py-8 text-center text-sm text-muted">
                Nenhum gasto em {nomeDoMes(mes)} ainda.{' '}
                <button onClick={() => navegar({ mes: mesAnterior })} className="font-medium text-brand hover:underline">
                  Ver {nomeDoMes(mesAnterior)}
                </button>
              </p>
            )}
          </Painel>

          <div className="space-y-4 lg:col-span-2">
            {/* Maiores gastos */}
            <Painel className="p-4">
              <h3 className="mb-2 font-semibold text-fg">Maiores gastos</h3>
              <div className="space-y-2.5">
                {maiores.map(t => (
                  <div key={t.id} className="flex items-center gap-3">
                    <Icone nome={t.category_id ? categoriaPorId.get(t.category_id)?.icon : 'circle-dashed'} size={16} className="shrink-0 text-muted" />
                    <span className="min-w-0 flex-1 truncate text-sm text-fg-2">{t.description}</span>
                    <span className="shrink-0 text-sm font-semibold text-fg">{brl(valorGasto(t))}</span>
                  </div>
                ))}
                {!maiores.length && <p className="text-sm text-muted">Nenhum gasto neste mês.</p>}
              </div>
            </Painel>

            {/* Por pessoa */}
            {pessoa === 'todos' && porPessoa.length > 0 && (
              <Painel className="p-4">
                <h3 className="mb-3 font-semibold text-fg">Gastos por pessoa</h3>
                <div className="space-y-3">
                  {porPessoa.map(([id, total]) => (
                    <button key={id} onClick={() => id !== 'sem' && navegar({ pessoa: id })} className="block w-full text-left">
                      <div className="flex justify-between text-sm">
                        <span className="text-fg-2">{nomePessoa(id)}</span>
                        <span className="font-semibold text-fg">{brl(total)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                        <div className="h-full rounded-full bg-brand" style={{ width: `${(total / porPessoa[0][1]) * 100}%` }} />
                      </div>
                    </button>
                  ))}
                </div>
                {porPessoa.some(([id]) => id === 'sem') && (
                  <p className="mt-3 text-xs text-muted">
                    Defina de quem é cada conta e cartão em{' '}
                    <button onClick={() => irPara('contas')} className="text-brand hover:underline">Contas</button>.
                  </p>
                )}
              </Painel>
            )}
          </div>
        </div>
      )}

      {/* Evolução */}
      <Painel id="evolucao" className="scroll-mt-20 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-fg">
            Gastos nos últimos 12 meses{categoriaEvolucao && <span className="text-muted"> · {nomeCategoria(categoriaEvolucao)}</span>}
          </h3>
          {categoriaEvolucao && (
            <button onClick={() => setCategoriaEvolucao(null)} className="text-xs font-medium text-brand hover:underline">Ver todos os gastos</button>
          )}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={evolucao} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={grafico.tema.line} strokeDasharray="3 3" />
            <XAxis dataKey="rotulo" tick={grafico.tick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={grafico.tick} axisLine={false} tickLine={false} tickFormatter={v => brlCurto(v)} width={64} />
            <Tooltip formatter={v => [brl(Number(v)), 'Gastos']} {...grafico.tooltip} />
            <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={36} onClick={(d: { payload?: { mes: string } }) => d.payload && navegar({ mes: d.payload.mes })} className="cursor-pointer">
              {evolucao.map(e => (
                <Cell key={e.mes} fill={grafico.tema.brand} fillOpacity={e.mes === mes ? 1 : 0.35} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Painel>
    </div>
  )
}
