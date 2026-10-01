import { chaveEstabelecimento, normalizar } from './categorias.js'

// Identidade de um lançamento. A parcela entra na chave porque "LOJA 3/4" e "LOJA 4/4" têm a
// mesma data de compra e o mesmo valor, mas são lançamentos de faturas diferentes.
function chaveLancamento(t) {
  return [t.data, t.valor.toFixed(2), chaveEstabelecimento(t.descricao), t.parcela || '', t.portador || ''].join('|')
}

export const mesmaConta = (a, b) => normalizar(a) === normalizar(b)

// Compara os lançamentos lidos de um arquivo com os já salvos da mesma conta, para que a mesma
// fatura possa ser importada várias vezes (ex.: ao longo do mês, antes de fechar) sem duplicar.
// Conta ocorrências em vez de usar um Set: duas compras iguais no mesmo dia (dois cafés de
// R$ 3,00) são dois lançamentos, e se só um já foi importado o outro precisa entrar.
//
// Devolve:
//   lancamentos: os lidos, cada um com `existente` (a transação salva correspondente) ou null
//   ausentes: transações salvas desta fatura (conta + mês/ano) que não estão no arquivo —
//             compra cancelada, ou valor/descrição que mudou desde o último upload
export function conciliar(lidos, salvos, { conta, mes, ano }) {
  const daConta = salvos.filter(t => mesmaConta(t.conta, conta))

  const disponiveis = new Map()
  for (const t of daConta) {
    const k = chaveLancamento(t)
    if (!disponiveis.has(k)) disponiveis.set(k, [])
    disponiveis.get(k).push(t)
  }

  const casados = new Set()
  const lancamentos = lidos.map(l => {
    const existente = disponiveis.get(chaveLancamento(l))?.shift() || null
    if (existente) casados.add(existente.id)
    return { ...l, existente }
  })

  const ausentes = daConta.filter(t => t.mes === mes && t.ano === ano && !casados.has(t.id))
  return { lancamentos, ausentes }
}
