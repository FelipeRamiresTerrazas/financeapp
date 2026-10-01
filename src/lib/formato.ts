const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const moedaCurta = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 })

export const brl = (v: number | null | undefined) => moeda.format(v ?? 0)
export const brlCurto = (v: number) => moedaCurta.format(v)

export const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

// Mês de referência no formato "2026-10"
export type Mes = string

export const mesAtual = (): Mes => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function somarMeses(mes: Mes, n: number): Mes {
  const [a, m] = mes.split('-').map(Number)
  const d = new Date(Date.UTC(a, m - 1 + n, 1))
  return d.toISOString().slice(0, 7)
}

export function limitesDoMes(mes: Mes) {
  return { de: `${mes}-01`, ate: `${somarMeses(mes, 1)}-01` }
}

export function ultimoDia(mes: Mes) {
  const [a, m] = mes.split('-').map(Number)
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10)
}

export function nomeDoMes(mes: Mes, curto = false) {
  const [a, m] = mes.split('-').map(Number)
  return curto ? `${MESES[m - 1]}/${String(a).slice(2)}` : `${MESES_LONGOS[m - 1]} de ${a}`
}

export function dataCurta(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export function diaPorExtenso(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function dataHora(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function normalizar(texto: string | null | undefined) {
  return (texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}
