// Rosca de gastos por categoria, com aprofundamento para subcategorias no mesmo gráfico.
// Mostra no máximo 5 fatias + "Demais" (rosca acima de ~6 pedaços fica ilegível); clicar em
// "Demais" abre as próximas. A lista ao lado traz todos os itens do nível, com valor e %, para que
// nenhuma categoria dependa só da cor.

import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ChevronRight, TrendingUp } from 'lucide-react'
import { Icone } from './ui'
import { useDados } from '../lib/DadosContext'
import { useEstiloGrafico } from '../theme/TemaContext'
import { brl } from '../lib/formato'
import { valorGasto } from '../lib/transacoes'
import type { Transacao } from '../lib/supabase'

// Paleta categórica validada para o fundo escuro do app (luminosidade, croma, daltonismo, contraste)
const CORES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181']
const FATIAS = CORES.length

// Cada nível da navegação: todas as categorias ou as subcategorias de uma; `inicio` pula os itens
// já mostrados quando se abre "Demais"
type Nivel = { categoriaId: string | null; inicio: number }

interface Item {
  id: string
  nome: string
  icone: string
  valor: number
  // categoria-mãe: dá para aprofundar; subcategoria: abre as transações
  temFilhas: boolean
}

export default function RoscaGastos({ transacoes, aoAbrirTransacoes, aoVerEvolucao }: {
  transacoes: Transacao[]
  aoAbrirTransacoes: (categoriaId: string | null) => void
  aoVerEvolucao: (categoriaId: string) => void
}) {
  const { categoriaPorId } = useDados()
  const { tema, tooltip } = useEstiloGrafico()
  const [trilha, setTrilha] = useState<Nivel[]>([{ categoriaId: null, inicio: 0 }])
  const nivel = trilha[trilha.length - 1]

  // todos os itens do nível atual, do maior para o menor
  const todos = useMemo<Item[]>(() => {
    const totais = new Map<string, number>()
    for (const t of transacoes) {
      const v = valorGasto(t)
      if (!v) continue
      if (nivel.categoriaId === null) {
        const id = t.top_category_id ?? 'sem'
        totais.set(id, (totais.get(id) ?? 0) + v)
      } else if (t.top_category_id === nivel.categoriaId) {
        const id = t.category_id ?? 'sem'
        totais.set(id, (totais.get(id) ?? 0) + v)
      }
    }
    return [...totais.entries()]
      .filter(([, v]) => v > 0.005)
      .sort((a, b) => b[1] - a[1])
      .map(([id, valor]) => {
        const cat = categoriaPorId.get(id)
        const geral = nivel.categoriaId !== null && id === nivel.categoriaId
        return {
          id,
          nome: id === 'sem' ? 'Sem categoria' : geral ? `${cat?.name} (geral)` : cat?.name ?? '—',
          icone: cat?.icon ?? 'circle-dashed',
          valor,
          temFilhas: nivel.categoriaId === null && id !== 'sem',
        }
      })
  }, [transacoes, nivel.categoriaId, categoriaPorId])

  const itens = todos.slice(nivel.inicio)
  const subtotal = itens.reduce((s, i) => s + i.valor, 0)
  const visiveis = itens.slice(0, FATIAS)
  const resto = itens.slice(FATIAS)
  const valorResto = resto.reduce((s, i) => s + i.valor, 0)
  // sobrou um só item: ele mesmo vira a 6ª fatia (cinza), em vez de um "Demais" de um item
  const fatiaResto = resto.length === 1
    ? [{ ...resto[0], cor: tema.subtle }]
    : resto.length
      ? [{ id: '__demais', nome: `Demais (${resto.length})`, icone: 'circle-dashed', valor: valorResto, temFilhas: true, cor: tema.subtle }]
      : []
  const fatias = [...visiveis.map((i, n) => ({ ...i, cor: CORES[n] })), ...fatiaResto]

  function abrir(item: Item) {
    if (item.id === '__demais') return setTrilha([...trilha, { categoriaId: nivel.categoriaId, inicio: nivel.inicio + FATIAS }])
    if (item.temFilhas) return setTrilha([...trilha, { categoriaId: item.id, inicio: 0 }])
    aoAbrirTransacoes(item.id === 'sem' ? null : item.id)
  }

  const rotuloNivel = (n: Nivel) => {
    const base = n.categoriaId ? categoriaPorId.get(n.categoriaId)?.name ?? '—' : 'Todas'
    return n.inicio ? `Demais (${n.inicio + 1}ª em diante)` : base
  }
  const pct = (v: number) => (subtotal ? `${((v / subtotal) * 100).toFixed(1).replace('.', ',')}%` : '')

  if (!todos.length) return null

  return (
    <div className="space-y-4">
      {/* trilha: Todas › Alimentação › Demais */}
      <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Nível do gráfico">
        {trilha.map((n, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={14} className="text-subtle" />}
            {i < trilha.length - 1 ? (
              <button onClick={() => setTrilha(trilha.slice(0, i + 1))} className="text-muted hover:text-fg hover:underline">{rotuloNivel(n)}</button>
            ) : (
              <span className="font-medium text-fg">{rotuloNivel(n)}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:items-start">
        <div className="relative mx-auto aspect-square w-full max-w-[15rem]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={fatias}
                dataKey="valor"
                nameKey="nome"
                innerRadius="64%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
                stroke={tema.surface}
                strokeWidth={fatias.length > 1 ? 2 : 0}
                isAnimationActive={false}
                onClick={(_, i) => abrir(fatias[i])}
                className="cursor-pointer outline-none"
              >
                {fatias.map(f => <Cell key={f.id} fill={f.cor} className="outline-none" />)}
              </Pie>
              <Tooltip
                {...tooltip}
                formatter={(v, nome) => [`${brl(Number(v))} · ${pct(Number(v))}`, nome]}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* total no centro */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-muted">{nivel.categoriaId || nivel.inicio ? rotuloNivel(nivel) : 'Total de gastos'}</span>
            <span className="text-lg font-bold tracking-tight text-fg">{brl(subtotal)}</span>
          </div>
        </div>

        {/* lista completa do nível: as 5 primeiras com a cor da fatia, as demais em cinza */}
        <ul className="space-y-0.5">
          {itens.map((item, n) => (
            <li key={item.id}>
              <button
                onClick={() => abrir(item)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-2"
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: n < FATIAS ? CORES[n] : tema.subtle }} />
                <Icone nome={item.icone} size={16} className="hidden shrink-0 text-muted sm:block" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg-2">{item.nome}</span>
                  <span className="block text-xs text-muted">{pct(item.valor)}</span>
                </span>
                <span className="shrink-0 text-right text-sm font-semibold text-fg">{brl(item.valor)}</span>
                <ChevronRight size={14} className={`shrink-0 ${item.temFilhas ? 'text-subtle' : 'text-transparent'}`} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {nivel.categoriaId && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <button onClick={() => aoAbrirTransacoes(nivel.categoriaId)} className="font-medium text-brand hover:underline">
            Ver transações de {categoriaPorId.get(nivel.categoriaId)?.name}
          </button>
          <button onClick={() => aoVerEvolucao(nivel.categoriaId!)} className="flex items-center gap-1 font-medium text-brand hover:underline">
            <TrendingUp size={12} /> Evolução nos últimos 12 meses
          </button>
        </div>
      )}
    </div>
  )
}
