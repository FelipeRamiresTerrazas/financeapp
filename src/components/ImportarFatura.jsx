import { useState } from 'react'
import { X, Upload, FileText, Loader2, ArrowLeftRight, AlertTriangle, ChevronLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { MESES_COMPLETOS } from '../data/initialData.js'
import { lerFatura } from '../lib/faturaParser.js'
import { CATEGORIAS, CATEGORIA_POR_ID, categorizar, chaveEstabelecimento, normalizar } from '../lib/categorias.js'
import { conciliar, mesmaConta } from '../lib/duplicados.js'

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

const soma = ls => ls.reduce((s, l) => s + l.valor, 0)

export const CARTOES = [
  { id: 'cartao', nome: 'Cartão Felipe', apelido: 'Felipe' },
  { id: 'cartaoDay', nome: 'Cartão Day', apelido: 'Day' },
]

const inputCls = 'w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand'

// "DAYSI Y O TERRAZAS · final 5270" -> Cartão Day; "FELIPE RAMIRES ..." -> Cartão Felipe
function cartaoDoPortador(portador, padrao) {
  const nome = normalizar(portador)
  return CARTOES.find(c => nome.startsWith(normalizar(c.apelido)))?.id || padrao
}

function dataCurta(data) {
  return data ? `${data.slice(8, 10)}/${data.slice(5, 7)}` : '—'
}

export default function ImportarFatura({ data, onImport, onClose }) {
  const now = new Date()
  const [config, setConfig] = useState({
    cartao: 'cartao', conta: '', mes: now.getMonth() + 1, ano: now.getFullYear(),
  })
  const [arquivo, setArquivo] = useState(null)
  const [arrastando, setArrastando] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [linhas, setLinhas] = useState(null) // null = etapa de configuração
  const [ausentes, setAusentes] = useState([])
  const [remover, setRemover] = useState(new Set())
  const [mostrarExistentes, setMostrarExistentes] = useState(false)
  const [info, setInfo] = useState({})
  const [cartaoPorPortador, setCartaoPorPortador] = useState({})
  const [regrasNovas, setRegrasNovas] = useState({})
  const [registrarFatura, setRegistrarFatura] = useState(true)

  const salvas = data.transacoes || []
  const regras = data.regrasCategoria || {}
  const contasSugeridas = Array.from(new Set([...data.cartao, ...data.cartaoDay].map(c => c.conta))).sort()

  // Separa o que já foi importado antes (mesma fatura enviada de novo, ex.: ao longo do mês)
  function aplicarConciliacao(lancamentos, fatura) {
    const r = conciliar(lancamentos, salvas, fatura)
    setLinhas(r.lancamentos.map((l, i) => ({
      ...l,
      tmpId: i,
      categoria: l.existente?.categoria || categorizar(l.descricao, regras),
      incluir: !l.existente,
    })))
    setAusentes(r.ausentes)
    setRemover(new Set())
  }

  async function processar() {
    if (!arquivo) return setErro('Escolha o arquivo da fatura.')
    if (!config.conta.trim()) return setErro('Informe o banco/conta do cartão.')
    setErro('')
    setCarregando(true)
    try {
      const { lancamentos, info } = await lerFatura(arquivo, { mes: +config.mes, ano: +config.ano })
      if (!lancamentos.length) {
        setErro('Não encontrei lançamentos nesse arquivo. Se for PDF, tente exportar a fatura em CSV ou OFX pelo app/site do banco.')
        return
      }
      const fatura = { conta: config.conta.trim(), mes: info.vencimento?.mes ?? +config.mes, ano: info.vencimento?.ano ?? +config.ano }
      setConfig(c => ({ ...c, mes: fatura.mes, ano: fatura.ano }))
      const portadores = Array.from(new Set(lancamentos.map(l => l.portador).filter(Boolean)))
      setCartaoPorPortador(Object.fromEntries(portadores.map(p => [p, cartaoDoPortador(p, config.cartao)])))
      setInfo(info)
      setMostrarExistentes(false)
      aplicarConciliacao(lancamentos, fatura)
    } catch (e) {
      console.error(e)
      setErro('Não consegui ler esse arquivo. Formatos aceitos: CSV, OFX e PDF (com texto, não escaneado).')
    } finally {
      setCarregando(false)
    }
  }

  const cartaoDe = l => (l.portador && cartaoPorPortador[l.portador]) || config.cartao

  function mudarCategoria(linha, categoria) {
    const chave = chaveEstabelecimento(linha.descricao)
    // aplica a todos os lançamentos do mesmo estabelecimento e lembra para as próximas faturas
    setLinhas(ls => ls.map(l => (chaveEstabelecimento(l.descricao) === chave ? { ...l, categoria } : l)))
    setRegrasNovas(r => ({ ...r, [chave]: categoria }))
  }

  function alternar(tmpId) {
    setLinhas(ls => ls.map(l => (l.tmpId === tmpId ? { ...l, incluir: !l.incluir } : l)))
  }

  function alternarRemocao(id) {
    setRemover(s => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function inverterSinais() {
    const invertidos = linhas.map(({ existente, tmpId, incluir, categoria, ...l }) => ({ ...l, valor: -l.valor }))
    aplicarConciliacao(invertidos, { conta: config.conta.trim(), mes: +config.mes, ano: +config.ano })
  }

  const novas = (linhas || []).filter(l => !l.existente)
  const existentes = (linhas || []).filter(l => l.existente)
  const selecionadas = novas.filter(l => l.incluir)
  const totalArquivo = soma(linhas || [])
  const portadores = Object.keys(cartaoPorPortador)
  const variosPortadores = portadores.length > 1
  const confere = info.total != null && Math.abs(info.total - totalArquivo) < 0.05

  // Ausentes só contam para os cartões/portadores presentes neste arquivo (importar o
  // Nubank do Felipe não deve sugerir remover o Nubank da Day do mesmo mês).
  const ausentesRelevantes = ausentes.filter(t =>
    portadores.length ? portadores.includes(t.portador) : t.cartao === config.cartao,
  )

  // Prévia do valor da fatura de cada cartão depois da importação (salvas + novas − removidas)
  const salvasDaFatura = salvas.filter(t =>
    mesmaConta(t.conta, config.conta) && t.mes === +config.mes && t.ano === +config.ano && !remover.has(t.id),
  )
  const totalPorCartao = CARTOES
    .map(c => ({
      ...c,
      valor: soma(salvasDaFatura.filter(t => t.cartao === c.id)) + soma(selecionadas.filter(l => cartaoDe(l) === c.id)),
    }))
    .filter(c => Math.abs(c.valor) >= 0.005)

  const nadaAFazer = selecionadas.length === 0 && remover.size === 0

  function salvar() {
    const importId = `${Date.now()}`
    const transacoes = selecionadas.map(l => ({
      id: crypto.randomUUID(),
      importId,
      cartao: cartaoDe(l),
      conta: config.conta.trim(),
      portador: l.portador || null,
      mes: +config.mes,
      ano: +config.ano,
      data: l.data,
      descricao: l.descricao,
      parcela: l.parcela,
      valor: Math.round(l.valor * 100) / 100,
      categoria: l.categoria,
    }))
    onImport({
      transacoes,
      remover: [...remover],
      regras: regrasNovas,
      fatura: { conta: config.conta.trim(), mes: +config.mes, ano: +config.ano },
      registrarFatura,
    })
  }

  function renderLinha(l) {
    const jaImportado = !!l.existente
    return (
      <div
        key={l.tmpId}
        className={`flex flex-wrap md:flex-nowrap items-center gap-x-3 gap-y-1.5 p-2.5 rounded-xl border border-line ${
          jaImportado ? 'opacity-50' : l.incluir ? 'bg-surface-2' : 'opacity-50'
        }`}
      >
        {jaImportado ? (
          <CheckCircle2 size={16} className="text-muted shrink-0" />
        ) : (
          <input type="checkbox" checked={l.incluir} onChange={() => alternar(l.tmpId)} className="w-4 h-4 accent-brand shrink-0" />
        )}
        <span className="text-xs text-muted w-11 shrink-0">{dataCurta(l.data)}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-fg truncate">
            {l.descricao}
            {l.parcela && <span className="ml-1.5 text-xs text-muted">{l.parcela}</span>}
          </p>
          {variosPortadores && l.portador && <p className="text-xs text-subtle truncate">{l.portador}</p>}
        </div>
        {jaImportado ? (
          <span className="text-xs text-muted ml-7 md:ml-0">{CATEGORIA_POR_ID[l.categoria]?.nome} · já importado</span>
        ) : (
          <select
            value={l.categoria}
            onChange={e => mudarCategoria(l, e.target.value)}
            className="text-xs border border-line rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand ml-7 md:ml-0 max-w-[11rem]"
          >
            {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}
        <span className={`text-sm font-semibold w-24 text-right shrink-0 ml-auto md:ml-0 ${l.valor < 0 ? 'text-green-400' : 'text-fg'}`}>
          {fmt(l.valor)}
        </span>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className={`bg-surface border border-line rounded-t-3xl md:rounded-3xl w-full ${linhas ? 'max-w-3xl' : 'max-w-md'} max-h-[92vh] flex flex-col`}>
        <div className="flex justify-between items-center p-5 pb-3">
          <div className="flex items-center gap-2">
            {linhas && (
              <button onClick={() => setLinhas(null)} className="p-1 -ml-1 text-muted hover:text-fg"><ChevronLeft size={18} /></button>
            )}
            <h3 className="font-semibold text-fg">{linhas ? 'Revisar lançamentos' : 'Importar fatura'}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-muted hover:text-fg"><X size={18} /></button>
        </div>

        {!linhas ? (
          <div className="px-5 pb-5 space-y-3 overflow-y-auto">
            <div>
              <label className="text-xs font-medium text-fg-2 mb-1 block">Cartão</label>
              <div className="grid grid-cols-2 gap-2">
                {CARTOES.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setConfig(f => ({ ...f, cartao: c.id }))}
                    className={`py-2 rounded-xl text-sm font-medium border transition-colors ${
                      config.cartao === c.id ? 'bg-brand text-on-brand border-brand' : 'border-line text-fg-2 hover:border-muted'
                    }`}
                  >
                    {c.nome}
                  </button>
                ))}
              </div>
              <p className="text-xs text-subtle mt-1">Se a fatura tiver cartões adicionais, você separa por portador na próxima etapa.</p>
            </div>
            <div>
              <label className="text-xs font-medium text-fg-2 mb-1 block">Banco / Conta</label>
              <input
                className={inputCls}
                value={config.conta}
                onChange={e => setConfig(f => ({ ...f, conta: e.target.value }))}
                placeholder="Ex: Itaú, Nubank, Santander..."
                list="contas-cartao"
              />
              <datalist id="contas-cartao">
                {contasSugeridas.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-fg-2 mb-1 block">Mês da fatura</label>
                <select className={inputCls} value={config.mes} onChange={e => setConfig(f => ({ ...f, mes: e.target.value }))}>
                  {MESES_COMPLETOS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-fg-2 mb-1 block">Ano</label>
                <input type="number" className={inputCls} value={config.ano} onChange={e => setConfig(f => ({ ...f, ano: e.target.value }))} />
              </div>
            </div>

            <label
              onDragOver={e => { e.preventDefault(); setArrastando(true) }}
              onDragLeave={() => setArrastando(false)}
              onDrop={e => { e.preventDefault(); setArrastando(false); setArquivo(e.dataTransfer.files[0] || null) }}
              className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-colors ${
                arrastando ? 'border-brand bg-brand/5' : 'border-line hover:border-muted'
              }`}
            >
              <input type="file" accept=".csv,.ofx,.qfx,.pdf,.txt" className="hidden" onChange={e => setArquivo(e.target.files[0] || null)} />
              {arquivo ? (
                <>
                  <FileText size={24} className="text-brand" />
                  <span className="text-sm text-fg font-medium text-center break-all">{arquivo.name}</span>
                  <span className="text-xs text-muted">Clique para trocar</span>
                </>
              ) : (
                <>
                  <Upload size={24} className="text-muted" />
                  <span className="text-sm text-fg-2 font-medium">Arraste a fatura ou clique</span>
                  <span className="text-xs text-muted">CSV, OFX ou PDF</span>
                </>
              )}
            </label>

            {erro && <p className="text-xs text-red-400">{erro}</p>}

            <button
              onClick={processar}
              disabled={carregando}
              className="w-full py-2.5 bg-brand rounded-xl text-sm font-semibold text-on-brand hover:bg-brand-strong disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {carregando && <Loader2 size={16} className="animate-spin" />}
              {carregando ? 'Lendo fatura...' : 'Continuar'}
            </button>
            <p className="text-xs text-subtle text-center">
              Pode importar a mesma fatura quantas vezes quiser ao longo do mês: só os lançamentos novos entram.
            </p>
          </div>
        ) : (
          <>
            <div className="px-5 pb-3 space-y-2.5">
              {/* Conferência com o PDF */}
              {(info.vencimento || info.total != null) && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                  {info.vencimento && (
                    <span>Fatura de <strong className="text-fg-2">{MESES_COMPLETOS[info.vencimento.mes - 1]}/{info.vencimento.ano}</strong> (pelo vencimento)</span>
                  )}
                  {info.total != null && (
                    confere ? (
                      <span className="flex items-center gap-1 text-green-400">
                        <CheckCircle2 size={12} /> Arquivo confere com o total da fatura ({fmt(info.total)})
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-orange-400">
                        <AlertTriangle size={12} /> Soma do arquivo {fmt(totalArquivo)} ≠ total da fatura {fmt(info.total)}
                      </span>
                    )
                  )}
                </div>
              )}

              {/* Resumo da sincronização */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className="text-fg font-medium">{novas.length} {novas.length === 1 ? 'novo' : 'novos'}</span>
                {existentes.length > 0 && (
                  <button onClick={() => setMostrarExistentes(m => !m)} className="flex items-center gap-1 text-muted hover:text-fg">
                    {mostrarExistentes ? <EyeOff size={12} /> : <Eye size={12} />}
                    {existentes.length} já importado{existentes.length > 1 ? 's' : ''}
                  </button>
                )}
                {ausentesRelevantes.length > 0 && (
                  <span className="text-orange-400">{ausentesRelevantes.length} não aparece{ausentesRelevantes.length > 1 ? 'm' : ''} mais</span>
                )}
                <button onClick={inverterSinais} className="ml-auto flex items-center gap-1 text-muted hover:text-fg" title="Use se compras aparecerem como créditos">
                  <ArrowLeftRight size={12} /> Inverter sinais
                </button>
              </div>

              {/* Portadores (cartões adicionais) */}
              {variosPortadores && novas.length > 0 && (
                <div className="bg-surface-2 border border-line rounded-2xl p-2 space-y-1">
                  {portadores.filter(p => novas.some(l => l.portador === p)).map(p => {
                    const doPortador = selecionadas.filter(l => l.portador === p)
                    return (
                      <div key={p} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 py-1.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-fg truncate">{p}</p>
                          <p className="text-xs text-muted">{doPortador.length} novos · {fmt(soma(doPortador))}</p>
                        </div>
                        <div className="flex rounded-lg border border-line overflow-hidden shrink-0">
                          {CARTOES.map(c => (
                            <button
                              key={c.id}
                              onClick={() => setCartaoPorPortador(m => ({ ...m, [p]: c.id }))}
                              className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                                cartaoPorPortador[p] === c.id ? 'bg-brand text-on-brand' : 'text-muted hover:text-fg'
                              }`}
                            >
                              {c.apelido}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="overflow-y-auto px-5 flex-1 space-y-1.5">
              {/* Lançamentos salvos que sumiram do arquivo */}
              {ausentesRelevantes.length > 0 && (
                <div className="border border-orange-500/30 bg-orange-500/5 rounded-2xl p-3 mb-2 space-y-2">
                  <p className="text-xs text-orange-300">
                    Estes lançamentos foram importados antes mas não estão neste arquivo — compra cancelada ou valor que mudou
                    (ex.: pré-autorização de posto). Marque os que quer remover:
                  </p>
                  {ausentesRelevantes.map(t => (
                    <label key={t.id} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={remover.has(t.id)} onChange={() => alternarRemocao(t.id)} className="w-4 h-4 accent-brand shrink-0" />
                      <span className="text-xs text-muted w-11 shrink-0">{dataCurta(t.data)}</span>
                      <span className={`flex-1 min-w-0 text-sm truncate ${remover.has(t.id) ? 'text-muted line-through' : 'text-fg'}`}>{t.descricao}</span>
                      <span className="text-sm font-semibold text-fg shrink-0">{fmt(t.valor)}</span>
                    </label>
                  ))}
                </div>
              )}

              {novas.length === 0 && ausentesRelevantes.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <CheckCircle2 size={28} className="text-brand" />
                  <p className="text-sm font-medium text-fg">Tudo em dia</p>
                  <p className="text-xs text-muted">Todos os lançamentos deste arquivo já foram importados.</p>
                </div>
              )}

              {novas.map(renderLinha)}
              {mostrarExistentes && existentes.map(renderLinha)}
            </div>

            <div className="p-5 pt-3 border-t border-line space-y-3">
              {totalPorCartao.length > 0 && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={registrarFatura} onChange={e => setRegistrarFatura(e.target.checked)} className="w-4 h-4 mt-0.5 accent-brand" />
                  <span className="text-sm text-fg-2">
                    {salvasDaFatura.length ? 'Atualizar' : 'Registrar'} fatura {config.conta} de {MESES_COMPLETOS[config.mes - 1]}/{config.ano}:{' '}
                    {totalPorCartao.map((c, i) => (
                      <span key={c.id}>
                        {i > 0 && ' · '}
                        {c.nome} <strong className="text-fg">{fmt(c.valor)}</strong>
                      </span>
                    ))}
                  </span>
                </label>
              )}
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 py-2.5 border border-line rounded-xl text-sm font-medium text-fg-2 hover:bg-surface-2">
                  {nadaAFazer ? 'Fechar' : 'Cancelar'}
                </button>
                <button
                  onClick={salvar}
                  disabled={nadaAFazer}
                  className="flex-1 py-2.5 bg-brand rounded-xl text-sm font-semibold text-on-brand hover:bg-brand-strong disabled:opacity-60"
                >
                  {nadaAFazer
                    ? 'Nada para importar'
                    : [selecionadas.length && `Importar ${selecionadas.length}`, remover.size && `remover ${remover.size}`].filter(Boolean).join(' e ').replace(/^./, c => c.toUpperCase())}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
