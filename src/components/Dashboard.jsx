import { TrendingUp, TrendingDown, CreditCard, Landmark, PiggyBank, CheckCircle2, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { MESES } from '../data/initialData.js'

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex items-start gap-3 border border-gray-100">
      <div className={`rounded-xl p-2.5 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function Dashboard({ data }) {
  const { planejamento, emprestimos, cartao, cartaoDay, saldoReserva } = data

  // Fixed expenses this month
  const totalFixoSaldo = planejamento
    .filter(i => i.tipoPagamento === 'saldo')
    .reduce((s, i) => s + i.valor, 0)
  const totalFixoCredito = planejamento
    .filter(i => i.tipoPagamento === 'credito')
    .reduce((s, i) => s + i.valor, 0)
  const totalFixo = totalFixoSaldo + totalFixoCredito

  const pagoFixo = planejamento.filter(i => i.pago).reduce((s, i) => s + i.valor, 0)
  const aPagarFixo = totalFixo - pagoFixo

  // Current month loans
  const now = new Date()
  const meAtual = now.getMonth() + 1
  const anoAtual = now.getFullYear()
  const emprestimosMes = emprestimos
    .filter(e => e.mes === meAtual && e.ano === anoAtual)
    .reduce((s, e) => s + e.valor, 0)

  const totalEmprestimosAbertos = emprestimos
    .filter(e => !e.pago)
    .reduce((s, e) => s + e.valor, 0)

  // Credit cards total
  const totalCartao = cartao.reduce((s, c) => s + (c.valor || 0), 0)
  const totalCartaoDay = cartaoDay.reduce((s, c) => s + (c.valor || 0), 0)

  // Reserve
  const ultimaReserva = [...saldoReserva]
    .filter(r => r.valor != null)
    .sort((a, b) => a.ano !== b.ano ? b.ano - a.ano : b.mes - a.mes)[0]

  // Chart: credit cards per month (last 6 months)
  const cartaoByMonth = {}
  const allCartao = [...cartao, ...cartaoDay]
  allCartao.forEach(c => {
    const key = `${c.ano}-${String(c.mes).padStart(2, '0')}`
    cartaoByMonth[key] = (cartaoByMonth[key] || 0) + (c.valor || 0)
  })
  const chartData = Object.entries(cartaoByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, total]) => {
      const [ano, mes] = key.split('-')
      return { name: `${MESES[parseInt(mes) - 1]}/${ano.slice(2)}`, total }
    })

  // Pending items
  const pendentesFixo = planejamento.filter(i => !i.pago).length
  const pendentesEmprestimos = emprestimos.filter(e => !e.pago && (e.mes < meAtual && e.ano <= anoAtual || e.ano < anoAtual)).length
  const pendentesCartao = cartao.filter(c => !c.pago).length + cartaoDay.filter(c => !c.pago).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 hidden md:block">Dashboard</h2>
        <p className="text-sm text-gray-500 hidden md:block">Resumo financeiro da família</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Gastos Fixos / Mês"
          value={fmt(totalFixo)}
          sub={`${pendentesFixo} a pagar`}
          icon={TrendingDown}
          color="bg-red-500"
        />
        <StatCard
          label="Empréstimos Mês Atual"
          value={fmt(emprestimosMes)}
          sub={`${fmt(totalEmprestimosAbertos)} em aberto`}
          icon={Landmark}
          color="bg-orange-500"
        />
        <StatCard
          label="Cartão de Crédito Total"
          value={fmt(totalCartao + totalCartaoDay)}
          sub={`${pendentesCartao} faturas pendentes`}
          icon={CreditCard}
          color="bg-blue-500"
        />
        <StatCard
          label="Saldo Reserva"
          value={ultimaReserva ? fmt(ultimaReserva.valor) : 'N/A'}
          sub={ultimaReserva ? `${MESES[ultimaReserva.mes - 1]}/${ultimaReserva.ano}` : ''}
          icon={PiggyBank}
          color="bg-green-500"
        />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-800 mb-4">Gastos no Cartão (últimos 6 meses)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={v => fmt(v)} labelStyle={{ fontWeight: 600 }} />
            <Bar dataKey="total" radius={[6, 6, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={i === chartData.length - 1 ? '#3b82f6' : '#93c5fd'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Split: fixed + loans summary */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Fixed expenses breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <TrendingDown size={16} className="text-red-500" />
            Gastos Fixos Mensais
          </h3>
          <div className="space-y-2">
            {planejamento.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {item.pago
                    ? <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                    : <Clock size={14} className="text-gray-400 shrink-0" />
                  }
                  <span className="text-sm text-gray-700 truncate">{item.descricao}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    item.tipoPagamento === 'saldo' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {item.tipoPagamento === 'saldo' ? 'Saldo' : 'Crédito'}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{fmt(item.valor)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t flex justify-between">
            <span className="text-sm font-medium text-gray-600">Total</span>
            <span className="text-sm font-bold text-gray-900">{fmt(totalFixo)}</span>
          </div>
        </div>

        {/* Upcoming loans */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Landmark size={16} className="text-orange-500" />
            Próximas Parcelas
          </h3>
          <div className="space-y-2">
            {emprestimos
              .filter(e => !e.pago)
              .slice(0, 8)
              .map(e => (
                <div key={e.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock size={14} className="text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-700 truncate">{e.desc}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-500">
                      {MESES[e.mes - 1]}/{e.ano}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{fmt(e.valor)}</span>
                  </div>
                </div>
              ))}
          </div>
          <div className="mt-3 pt-3 border-t flex justify-between">
            <span className="text-sm font-medium text-gray-600">Total em aberto</span>
            <span className="text-sm font-bold text-orange-600">{fmt(totalEmprestimosAbertos)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
