// Lê arquivos de fatura de cartão (CSV, OFX ou PDF) e devolve:
//   { lancamentos: [{ data: 'YYYY-MM-DD' | null, descricao, valor, parcela, portador }], info }
// valor > 0 = compra; valor < 0 = estorno/crédito. Pagamentos da fatura anterior são descartados.
// portador = titular do cartão (só em PDFs que listam vários cartões, ex.: adicionais).
// info = { vencimento: { mes, ano }, total } quando dá para extrair do PDF.
//
// `ref` = { mes, ano } da fatura, usado para descobrir o ano de datas sem ano ("12/09").

import { normalizar } from './categorias.js'

const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export async function lerFatura(file, ref) {
  const nome = file.name.toLowerCase()
  if (nome.endsWith('.pdf')) {
    return lerPaginasPdf(await paginasDoPdf(file), ref)
  }
  const texto = decodificar(await file.arrayBuffer())
  const lancamentos = /<OFX>|OFXHEADER/i.test(texto) ? lerOfx(texto) : lerCsv(texto, ref)
  return finalizar({ lancamentos, info: {} })
}

function finalizar({ lancamentos, info }) {
  return { lancamentos: normalizarSinais(lancamentos.filter(l => l.valor && !ehPagamento(l.descricao))), info }
}

// separado de paginasDoPdf para poder ser testado sem o pdfjs do navegador
export function lerPaginasPdf(paginas, ref) {
  return finalizar(lancamentosDoPdf(paginas, ref))
}

// ---------- utilidades ----------

function decodificar(buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    // muitos bancos exportam CSV/OFX em Windows-1252
    return new TextDecoder('windows-1252').decode(buffer)
  }
}

function ehPagamento(descricao) {
  const d = normalizar(descricao)
  return /^(pagamento|pgto|pagto|pag fatura)|pagamento (efetuado|recebido|de fatura|fatura)|saldo anterior|total (da fatura|a pagar)|^saldo em/.test(d)
}

// Se a maioria vier negativa, o arquivo usa a convenção "compra = negativo" (comum em OFX)
function normalizarSinais(lancamentos) {
  const negativos = lancamentos.filter(l => l.valor < 0).length
  if (negativos > lancamentos.length / 2) {
    return lancamentos.map(l => ({ ...l, valor: -l.valor }))
  }
  return lancamentos
}

export function parseValor(bruto) {
  if (bruto == null) return null
  let s = String(bruto).trim()
  if (!s) return null
  const negativo = /^-|-$|^\(.*\)$|^-?\s*R\$\s*-/.test(s) || /\bD$/.test(s)
  s = s.replace(/[^\d.,]/g, '')
  if (!/\d/.test(s)) return null
  const ultimoPonto = s.lastIndexOf('.')
  const ultimaVirgula = s.lastIndexOf(',')
  if (ultimoPonto >= 0 && ultimaVirgula >= 0) {
    // o separador que aparece por último é o decimal
    s = ultimaVirgula > ultimoPonto ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (ultimaVirgula >= 0) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (ultimoPonto >= 0 && /\.\d{3}$/.test(s)) {
    s = s.replace(/\./g, '') // "1.234" = mil duzentos e trinta e quatro
  }
  const n = parseFloat(s)
  if (isNaN(n)) return null
  return negativo ? -n : n
}

export function parseData(bruto, ref) {
  if (!bruto) return null
  const s = String(bruto).trim().toLowerCase()
  let d, m, a
  let r
  if ((r = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) {
    ;[a, m, d] = [+r[1], +r[2], +r[3]]
  } else if ((r = s.match(/^(\d{4})(\d{2})(\d{2})/))) {
    ;[a, m, d] = [+r[1], +r[2], +r[3]]
  } else if ((r = s.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/))) {
    ;[d, m] = [+r[1], +r[2]]
    if (r[3]) a = r[3].length === 2 ? 2000 + +r[3] : +r[3]
  } else if ((r = s.match(/^(\d{1,2})\s*(?:de\s+)?([a-z]{3})/))) {
    d = +r[1]
    m = MESES_ABREV.indexOf(r[2]) + 1
    if (!m) return null
  } else {
    return null
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  if (!a) {
    // compra de um mês "depois" do mês da fatura só pode ser do ano anterior
    a = ref ? (m > ref.mes ? ref.ano - 1 : ref.ano) : new Date().getFullYear()
  }
  return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function extrairParcela(descricao) {
  const r = descricao.match(/\s*(?:parc(?:ela)?\.?\s*)?(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})\s*$/i)
  if (r && +r[1] >= 1 && +r[1] <= +r[2] && +r[2] > 1) {
    return { descricao: descricao.slice(0, r.index).replace(/[\s\-–:]+$/, ''), parcela: `${+r[1]}/${+r[2]}` }
  }
  return { descricao: descricao.trim(), parcela: null }
}

function montar(data, descricao, valor) {
  const p = extrairParcela(descricao.replace(/\s+/g, ' '))
  return { data, descricao: p.descricao, valor, parcela: p.parcela }
}

// ---------- OFX ----------

function lerOfx(texto) {
  const blocos = texto.split(/<STMTTRN>/i).slice(1)
  return blocos.map(bloco => {
    const campo = tag => {
      const r = bloco.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i'))
      return r ? r[1].trim() : ''
    }
    const descricao = campo('MEMO') || campo('NAME')
    return montar(parseData(campo('DTPOSTED')), descricao, parseValor(campo('TRNAMT')))
  })
}

// ---------- CSV ----------

function dividirLinhaCsv(linha, sep) {
  const campos = []
  let atual = ''
  let aspas = false
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]
    if (c === '"') {
      if (aspas && linha[i + 1] === '"') { atual += '"'; i++ } else aspas = !aspas
    } else if (c === sep && !aspas) {
      campos.push(atual.trim()); atual = ''
    } else {
      atual += c
    }
  }
  campos.push(atual.trim())
  return campos
}

function lerCsv(texto, ref) {
  const linhas = texto.split(/\r?\n/).filter(l => l.trim())
  if (!linhas.length) return []
  const amostra = linhas.slice(0, 5).join('\n')
  const sep = [';', '\t', ','].sort((a, b) => amostra.split(b).length - amostra.split(a).length)[0]
  const tabela = linhas.map(l => dividirLinhaCsv(l, sep))

  // 1) tenta achar o cabeçalho pelos nomes das colunas
  const idxCab = tabela.findIndex(cols => cols.some(c => /^(data|date)/i.test(normalizar(c))))
  if (idxCab >= 0) {
    const cab = tabela[idxCab].map(normalizar)
    const iData = cab.findIndex(c => /^(data|date)/.test(c))
    const iDesc = cab.findIndex(c => /(descri|title|titulo|lancamento|estabelecimento|historico|memo)/.test(c))
    const iValor = cab.findIndex(c => /(valor|amount|quantia)/.test(c) && !/dolar|usd/.test(c))
    if (iData >= 0 && iDesc >= 0 && iValor >= 0) {
      return tabela.slice(idxCab + 1)
        .map(cols => montar(parseData(cols[iData], ref), cols[iDesc] || '', parseValor(cols[iValor])))
        .filter(l => l.data)
    }
  }

  // 2) sem cabeçalho reconhecível: deduz pelas células de cada linha
  return tabela.map(cols => {
    const iData = cols.findIndex(c => parseData(c, ref))
    if (iData < 0) return null
    const valores = cols.map((c, i) => (i !== iData && /\d[.,]\d{2}\s*-?$/.test(c) ? i : -1)).filter(i => i >= 0)
    if (!valores.length) return null
    const iValor = valores[valores.length - 1]
    const desc = cols
      .filter((c, i) => i !== iData && i !== iValor && /[a-z]/i.test(c))
      .sort((a, b) => b.length - a.length)[0]
    return desc ? montar(parseData(cols[iData], ref), desc, parseValor(cols[iValor])) : null
  }).filter(Boolean)
}

// ---------- PDF ----------

// Extrai os pedaços de texto de cada página com suas coordenadas (só isso depende do pdfjs)
async function paginasDoPdf(file) {
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const paginas = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const { items } = await page.getTextContent()
    paginas.push({
      largura: page.getViewport({ scale: 1 }).width,
      itens: items.filter(i => i.str.trim()).map(i => ({ x: i.transform[4], y: i.transform[5], str: i.str.trim() })),
    })
  }
  return paginas
}

// Agrupa os pedaços de texto em linhas (mesma coordenada y), de cima para baixo
function agruparLinhas(itens) {
  const linhas = []
  for (const it of itens) {
    let linha = linhas.find(l => Math.abs(l.y - it.y) < 3)
    if (!linha) linhas.push((linha = { y: it.y, partes: [] }))
    linha.partes.push(it)
  }
  return linhas
    .sort((a, b) => b.y - a.y)
    .map(l => l.partes.sort((a, b) => a.x - b.x).map(p => p.str).join(' '))
}

const RE_INICIO_LANCAMENTO = /^(?:\d\s+)?\d{1,2}\/\d{1,2}\s/

// Faturas em duas colunas (ex.: Santander, Itaú): lê a coluna da esquerda inteira e depois a da
// direita, senão as linhas das duas se misturam e os lançamentos ficam com o portador errado.
function linhasDaPagina({ largura, itens }) {
  const meio = largura / 2
  const direita = agruparLinhas(itens.filter(i => i.x >= meio))
  if (direita.filter(l => RE_INICIO_LANCAMENTO.test(l)).length >= 3) {
    return [...agruparLinhas(itens.filter(i => i.x < meio)), ...direita]
  }
  return agruparLinhas(itens)
}

const DATA = String.raw`(\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?|\d{1,2}\s(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez))`
const VALOR = String.raw`(-\s?R?\$?\s?[\d.]{1,11},\d{2}|R?\$?\s?-?\s?[\d.]{1,11},\d{2}-?)`
// data, descrição, valor em R$ e, opcionalmente, valor em US$ (ignorado). O lookahead permite
// um segundo lançamento na mesma linha, opcionalmente precedido de um ícone lido como dígito.
const RE_LANCAMENTO = new RegExp(
  String.raw`${DATA}\s+(.+?)\s+${VALOR}(?:\s+[\d.]{1,9},\d{2})?(?=\s+(?:\d\s+)?${DATA}\s|\s*$)`,
  'gi',
)
// encargos sem data, logo abaixo da compra a que se referem ("IOF DESPESA NO EXTERIOR 2,33")
const RE_ENCARGO = /^(IOF[A-Za-zÀ-ú ]*?)\s+(-?[\d.]{1,9},\d{2})$/i
// cabeçalho de cada cartão: "DAYSI Y O TERRAZAS - 5228 XXXX XXXX 5270"
const RE_PORTADOR = /([A-ZÀ-Ú][A-ZÀ-Ú .]{3,}?)\s*-\s*\d{4}\s+X{4}\s+X{4}\s+(\d{4})/

function infoDaFatura(texto) {
  const info = {}
  const venc = texto.match(/vencimento[\s\S]{0,80}?(\d{2})\/(\d{2})\/(\d{4})/i)
  if (venc) info.vencimento = { mes: +venc[2], ano: +venc[3] }
  const total =
    texto.match(/saldo desta fatura\s+R?\$?\s?([\d.]+,\d{2})/i) ||
    texto.match(/total (?:a pagar|desta fatura)[\s\S]{0,60}?R\$\s?([\d.]+,\d{2})/i)
  if (total) info.total = parseValor(total[1])
  return info
}

function lancamentosDoPdf(paginas, ref) {
  const linhas = paginas.flatMap(linhasDaPagina)
  const info = infoDaFatura(linhas.join(' '))
  // o vencimento impresso no PDF é mais confiável que o mês escolhido no formulário
  const refData = info.vencimento || ref

  const lancamentos = []
  let portador = null
  for (const linha of linhas) {
    const p = linha.match(RE_PORTADOR)
    if (p) portador = `${p[1].trim()} · final ${p[2]}`

    const encargo = linha.match(RE_ENCARGO)
    if (encargo && lancamentos.length) {
      const anterior = lancamentos[lancamentos.length - 1]
      lancamentos.push({ data: anterior.data, descricao: encargo[1].trim(), valor: parseValor(encargo[2]), parcela: null, portador })
      continue
    }

    for (const r of linha.matchAll(RE_LANCAMENTO)) {
      const data = parseData(r[1], refData)
      const descricao = r[2].replace(/^[•*]+\s*\d{4}\s+/, '') // remove "•••• 1234" do cartão
      if (data && /[a-z]/i.test(descricao)) lancamentos.push({ ...montar(data, descricao, parseValor(r[3])), portador })
    }
  }
  return { lancamentos, info }
}
