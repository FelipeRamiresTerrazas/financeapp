import { useMemo, useState } from 'react'
import { Upload, ChevronDown, Trash2, Receipt, TrendingUp, TrendingDown } from 'lucide-react'
import { MESES, MESES_COMPLETOS } from '../data/initialData.js'
import { CATEGORIAS, CATEGORIA_POR_ID, chaveEstabelecimento, normalizar } from '../lib/categorias.js'
import { mesmaConta } from '../lib/duplicados.js'
import ImportarFatura, { CARTOES } from './ImportarFatura.jsx'

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

const chavePeriodo = (ano, mes) => `${ano}-${String(mes).padStart(2, '0')}`
const chaveFatura = t => `${normalizar(t.conta)}|${chavePeriodo(t.ano, t.mes)}`

function dataHora(ms) {
  return new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function periodoAnterior(chave) {
  const [ano, mes] = chave.split('-').map(Number)
  return mes === 1 ? chavePeriodo(ano - 1, 12) : chavePeriodo(ano, mes - 1)
}

function somarPorCategoria(transacoes) {
  const totais = {}
  transacoes.forEach(t => { totais[t.categoria] = (totais[t.categoria] || 0) + t.valor })
  return totais
}

export default function Gastos({ data, onChange }) {
  const transacoes = data.transacoes || []
  const [showImport, setShowImport] = useState(false)
  const [filtroCartao, setFiltroCartao] = useState('todos')
  const [periodoSel, setPeriodoSel] = useState(null)
  const [aberta, setAberta] = useState(null)

  const periodos = useMemo(
    () => Array.from(new Set(transacoes.map(t => chavePeriodo(t.ano, t.mes)))).sort().reverse(),
    [transacoes],
  )
  const periodo = periodoSel && periodos.includes(periodoSel) ? periodoSel : periodos[0]

  const doCartao = filtroCartao === 'todos' ? transacoes : transacoes.filter(t => t.cartao === filtroCartao)
  const doPeriodo = doCartao.filter(t => chavePeriodo(t.ano, t.mes) === periodo)
  const anteriores = somarPorCategoria(doCartao.filter(t => chavePeriodo(t.ano, t.mes) === periodoAnterior(periodo || '')))
  const temAnterior = Object.keys(anteriores).length > 0

  const total = doPeriodo.reduce((s, t) => s + t.valor, 0)
  const totalAnterior = Object.values(anteriores).reduce((s, v) => s + v, 0)
  const porCategoria = Object.entries(somarPorCategoria(doPeriodo))
    .map(([id, valor]) => ({ id, valor, itens: doPeriodo.filter(t => t.categoria === id).sort((a, b) => b.valor - a.valor) }))
    .filter(c => c.valor !== 0)
    .sort((a, b) => b.valor - a.valor)
  const maior = porCategoria[0]?.valor || 1

  // Uma linha por fatura (conta + mês), não por upload: a mesma fatura pode ser importada várias vezes
  const faturasImportadas = Object.values(
    transacoes.reduce((acc, t) => {
      const chave = chaveFatura(t)
      const f = (acc[chave] ||= { chave, cartoes: new Set(), conta: t.conta, mes: t.mes, ano: t.ano, qtd: 0, total: 0, ultimoUpload: 0 })
      f.cartoes.add(t.cartao)
      f.qtd++
      f.total += t.valor
      f.ultimoUpload = Math.max(f.ultimoUpload, Number(t.importId) || 0)
      return acc
    }, {}),
  ).sort((a, b) => chavePeriodo(b.ano, b.mes).localeCompare(chavePeriodo(a.ano, a.mes)))

  function importar({ transacoes: novas, remover, regras, fatura, registrarFatura }) {
    const regrasCategoria = { ...(data.regrasCategoria || {}), ...regras }
    const removidas = new Set(remover)
    // correções de categoria feitas na revisão valem também para o que já estava salvo
    const todas = [...transacoes.filter(t => !removidas.has(t.id)), ...novas].map(t => {
      const categoria = regras[chaveEstabelecimento(t.descricao)]
      return categoria ? { ...t, categoria } : t
    })
    const patch = { transacoes: todas, regrasCategoria }

    if (registrarFatura) {
      // valor = todos os lançamentos desta fatura (não só os novos), um registro por cartão
      const daFatura = todas.filter(t => chaveFatura(t) === chaveFatura(fatura))
      for (const { id: cartao } of CARTOES) {
        const lancs = daFatura.filter(t => t.cartao === cartao)
        if (!lancs.length) continue
        const valor = Math.round(lancs.reduce((s, t) => s + t.valor, 0) * 100) / 100
        const lista = data[cartao]
        const existente = lista.find(f => mesmaConta(f.conta, fatura.conta) && f.mes === fatura.mes && f.ano === fatura.ano)
        patch[cartao] = existente
          ? lista.map(f => (f === existente ? { ...f, valor } : f))
          : [...lista, { id: Math.max(0, ...lista.map(f => f.id)) + 1, conta: fatura.conta, valor, mes: fatura.mes, ano: fatura.ano, pago: false, observacao: '' }]
      }
    }
    onChange(patch)
    setPeriodoSel(chavePeriodo(fatura.ano, fatura.mes))
    setShowImport(false)
  }

  function mudarCategoria(transacao, categoria) {
    // recategoriza todo o estabelecimento e lembra a escolha para próximas importações
    const chave = chaveEstabelecimento(transacao.descricao)
    onChange({
      transacoes: transacoes.map(t => (chaveEstabelecimento(t.descricao) === chave ? { ...t, categoria } : t)),
      regrasCategoria: { ...(data.regrasCategoria || {}), [chave]: categoria },
    })
  }

  function excluirTransacao(id) {
    onChange({ transacoes: transacoes.filter(t => t.id !== id) })
  }

  function excluirFatura(chave) {
    if (!confirm('Excluir todos os lançamentos importados dessa fatura?')) return
    onChange({ transacoes: transacoes.filter(t => chaveFatura(t) !== chave) })
  }

  const variacao = temAnterior && totalAnterior ? (total - totalAnterior) / totalAnterior : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="hidden md:block">
          <h2 className="text-xl font-bold text-fg">Gastos por Categoria</h2>
          <p className="text-sm text-muted">Importe a fatura do cartão e veja para onde vai o dinheiro</p>
        </div>
        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-1.5 bg-brand text-on-brand px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-strong"
        >
          <Upload size={16} /> Importar fatura
        </button>
      </div>

      {transacoes.length === 0 ? (
        <button
          onClick={() => setShowImport(true)}
          className="w-full bg-surface border border-dashed border-line rounded-3xl p-10 flex flex-col items-center gap-3 text-center hover:border-muted transition-colors"
        >
          <div className="rounded-2xl p-3 bg-brand/10 text-brand"><Receipt size={28} /></div>
          <p className="font-semibold text-fg">Nenhuma fatura importada ainda</p>
          <p className="text-sm text-muted max-w-sm">
            Exporte a fatura do cartão em CSV, OFX ou PDF pelo app/site do banco e importe aqui.
            Os gastos são separados por categoria automaticamente — e o app aprende com suas correções.
          </p>
        </button>
      ) : (
        <>
          {/* Filtros */}
          <div className="space-y-2">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {periodos.map(p => {
                const [ano, mes] = p.split('-')
                return (
                  <button
                    key={p}
                    onClick={() => setPeriodoSel(p)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      periodo === p ? 'bg-brand text-on-brand' : 'bg-surface border border-line text-fg-2 hover:border-brand'
                    }`}
                  >
                    {MESES[+mes - 1]}/{ano.slice(2)}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-2">
              {[{ id: 'todos', nome: 'Todos os cartões' }, ...CARTOES].map(c => (
                <button
                  key={c.id}
                  onClick={() => setFiltroCartao(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    filtroCartao === c.id ? 'bg-fg text-canvas' : 'bg-surface border border-line text-fg-2 hover:border-muted'
                  }`}
                >
                  {c.nome}
                </button>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="bg-surface border border-line rounded-3xl p-5">
            <p className="text-xs font-medium text-muted uppercase tracking-wider">
              Total da fatura · {periodo && MESES_COMPLETOS[+periodo.split('-')[1] - 1]}
            </p>
            <p className="text-3xl md:text-4xl font-bold text-fg mt-1 tracking-tight">{fmt(total)}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted">
              <span>{doPeriodo.length} lançamentos</span>
              <span>{porCategoria.length} categorias</span>
              {variacao != null && (
                <span className={`flex items-center gap-1 ${variacao > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {variacao > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {variacao > 0 ? '+' : ''}{(variacao * 100).toFixed(0)}% vs mês anterior
                </span>
              )}
            </div>
          </div>

          {/* Categorias */}
          <div className="bg-surface border border-line rounded-3xl p-2 md:p-3">
            {doPeriodo.length === 0 && (
              <p className="text-center text-muted py-8 text-sm">Nenhum lançamento nesse filtro.</p>
            )}
            {porCategoria.map(c => {
              const cat = CATEGORIA_POR_ID[c.id] || CATEGORIA_POR_ID.outros
              const pct = total ? (c.valor / total) * 100 : 0
              const ant = anteriores[c.id]
              const delta = temAnterior ? c.valor - (ant || 0) : null
              const expandida = aberta === c.id
              return (
                <div key={c.id} className="rounded-2xl">
                  <button
                    onClick={() => setAberta(expandida ? null : c.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-2 transition-colors text-left"
                  >
                    <div className="rounded-xl p-2 bg-surface-2 text-fg-2 shrink-0">
                      <cat.icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-fg truncate">{cat.nome}</span>
                        <span className="text-sm font-semibold text-fg shrink-0">{fmt(c.valor)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-surface-3 overflow-hidden">
                        <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(0, (c.valor / maior) * 100)}%` }} />
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-muted">
                        <span>{pct.toFixed(1)}% · {c.itens.length} {c.itens.length === 1 ? 'lançamento' : 'lançamentos'}</span>
                        {delta != null && Math.abs(delta) >= 1 && (
                          <span className={delta > 0 ? 'text-red-400' : 'text-green-400'}>
                            {delta > 0 ? '+' : '−'}{fmt(Math.abs(delta))}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown size={16} className={`text-subtle shrink-0 transition-transform ${expandida ? 'rotate-180' : ''}`} />
                  </button>

                  {expandida && (
                    <div className="pl-3 md:pl-14 pr-3 pb-3 space-y-1">
                      {c.itens.map(t => (
                        <div key={t.id} className="flex flex-wrap md:flex-nowrap items-center gap-x-3 gap-y-1 py-2 border-b border-line last:border-0">
                          <span className="text-xs text-muted w-11 shrink-0">
                            {t.data ? `${t.data.slice(8, 10)}/${t.data.slice(5, 7)}` : '—'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-fg-2 truncate">
                              {t.descricao}
                              {t.parcela && <span className="ml-1.5 text-xs text-muted">{t.parcela}</span>}
                            </p>
                            <p className="text-xs text-subtle">{t.conta}</p>
                          </div>
                          <select
                            value={t.categoria}
                            onChange={e => mudarCategoria(t, e.target.value)}
                            className="text-xs border border-line rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand ml-14 md:ml-0 max-w-[11rem]"
                          >
                            {CATEGORIAS.map(k => <option key={k.id} value={k.id}>{k.nome}</option>)}
                          </select>
                          <span className={`text-sm font-semibold w-24 text-right shrink-0 ml-auto md:ml-0 ${t.valor < 0 ? 'text-green-400' : 'text-fg'}`}>
                            {fmt(t.valor)}
                          </span>
                          <button onClick={() => excluirTransacao(t.id)} className="p-1.5 text-subtle hover:text-red-400 hover:bg-red-500/10 rounded-lg shrink-0">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Importações */}
          <div>
            <h3 className="text-sm font-semibold text-fg-2 mb-2">Faturas importadas</h3>
            <div className="space-y-1.5">
              {faturasImportadas.map(f => (
                <div key={f.chave} className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-line">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg truncate">
                      {f.conta} · {MESES[f.mes - 1]}/{f.ano}
                    </p>
                    <p className="text-xs text-muted">
                      {CARTOES.filter(c => f.cartoes.has(c.id)).map(c => c.nome).join(' + ')} · {f.qtd} lançamentos
                      {f.ultimoUpload > 0 && ` · atualizada ${dataHora(f.ultimoUpload)}`}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-fg shrink-0">{fmt(f.total)}</span>
                  <button onClick={() => excluirFatura(f.chave)} className="p-1.5 text-subtle hover:text-red-400 hover:bg-red-500/10 rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {showImport && <ImportarFatura data={data} onImport={importar} onClose={() => setShowImport(false)} />}
    </div>
  )
}
