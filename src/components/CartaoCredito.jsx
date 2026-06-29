import { useState } from 'react'
import { Plus, Trash2, CheckCircle2, Circle, X } from 'lucide-react'
import { MESES, MESES_COMPLETOS } from '../data/initialData.js'

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function Modal({ onSave, onClose, showObservacao }) {
  const now = new Date()
  const [form, setForm] = useState({
    conta: '', valor: '', mes: now.getMonth() + 1, ano: now.getFullYear(), pago: false, observacao: ''
  })
  function handleSave() {
    if (!form.conta || !form.valor) return
    onSave({ ...form, valor: parseFloat(form.valor), mes: parseInt(form.mes), ano: parseInt(form.ano) })
  }
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900">Nova Fatura</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Conta / Banco</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.conta}
              onChange={e => setForm(f => ({ ...f, conta: e.target.value }))}
              placeholder="Ex: Itaú, Porto, Santander..."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Valor (R$)</label>
            <input
              type="number"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.valor}
              onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Mês</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.mes}
                onChange={e => setForm(f => ({ ...f, mes: e.target.value }))}
              >
                {MESES_COMPLETOS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Ano</label>
              <input
                type="number"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.ano}
                onChange={e => setForm(f => ({ ...f, ano: e.target.value }))}
              />
            </div>
          </div>
          {showObservacao && (
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Observação</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.observacao}
                onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.pago} onChange={e => setForm(f => ({ ...f, pago: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
            <span className="text-sm text-gray-700">Já pago</span>
          </label>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSave} className="flex-1 py-2 bg-blue-600 rounded-xl text-sm font-medium text-white hover:bg-blue-700">Salvar</button>
        </div>
      </div>
    </div>
  )
}

export default function CartaoCredito({ items, title, showObservacao, onChange }) {
  const [showModal, setShowModal] = useState(false)
  const [filtroConta, setFiltroConta] = useState('Todos')
  const [filtroAno, setFiltroAno] = useState('Todos')

  function togglePago(id) {
    onChange(items.map(i => i.id === id ? { ...i, pago: !i.pago } : i))
  }

  function deleteItem(id) {
    onChange(items.filter(i => i.id !== id))
  }

  function saveModal(form) {
    const maxId = Math.max(0, ...items.map(i => i.id))
    onChange([...items, { ...form, id: maxId + 1 }])
    setShowModal(false)
  }

  const contas = ['Todos', ...Array.from(new Set(items.map(i => i.conta))).sort()]
  const anos = ['Todos', ...Array.from(new Set(items.map(i => i.ano))).sort((a, b) => b - a)]

  let filtered = items
  if (filtroConta !== 'Todos') filtered = filtered.filter(i => i.conta === filtroConta)
  if (filtroAno !== 'Todos') filtered = filtered.filter(i => i.ano === parseInt(filtroAno))

  const totalGeral = items.reduce((s, i) => s + (i.valor || 0), 0)
  const totalPendente = items.filter(i => !i.pago).reduce((s, i) => s + (i.valor || 0), 0)
  const totalFiltrado = filtered.reduce((s, i) => s + (i.valor || 0), 0)

  // By month
  const byMesAno = {}
  filtered.forEach(i => {
    const key = `${i.ano}-${String(i.mes).padStart(2, '0')}`
    if (!byMesAno[key]) byMesAno[key] = []
    byMesAno[key].push(i)
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="hidden md:block">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">Faturas por mês e conta</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} /> Nova Fatura
        </button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 rounded-xl p-3">
          <p className="text-xs font-medium text-blue-600">Total Histórico</p>
          <p className="text-lg font-bold text-blue-800">{fmt(totalGeral)}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3">
          <p className="text-xs font-medium text-red-600">Pendente</p>
          <p className="text-lg font-bold text-red-800">{fmt(totalPendente)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {contas.map(c => (
            <button
              key={c}
              onClick={() => setFiltroConta(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filtroConta === c ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-400'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {anos.map(a => (
            <button
              key={a}
              onClick={() => setFiltroAno(a)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filtroAno === a ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-400 py-8 text-sm">Nenhuma fatura encontrada.</p>
      )}

      {/* By month */}
      {Object.entries(byMesAno)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([key, faturas]) => {
          const [ano, mes] = key.split('-')
          const total = faturas.reduce((s, f) => s + (f.valor || 0), 0)
          const allPaid = faturas.every(f => f.pago)
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                  {MESES_COMPLETOS[parseInt(mes) - 1]} / {ano}
                  {allPaid && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Pago</span>}
                </h3>
                <span className="text-sm font-bold text-gray-800">{fmt(total)}</span>
              </div>
              <div className="space-y-2">
                {faturas.map(f => (
                  <div key={f.id} className={`flex items-center gap-3 p-3 rounded-xl border ${f.pago ? 'bg-green-50 border-green-100' : 'bg-white border-gray-100'}`}>
                    <button onClick={() => togglePago(f.id)} className="shrink-0">
                      {f.pago ? <CheckCircle2 size={20} className="text-green-500" /> : <Circle size={20} className="text-gray-300" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium ${f.pago ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{f.conta}</span>
                      {showObservacao && f.observacao && (
                        <p className="text-xs text-gray-400 truncate">{f.observacao}</p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-gray-900 shrink-0">{fmt(f.valor)}</span>
                    <button onClick={() => deleteItem(f.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

      {showModal && <Modal onSave={saveModal} onClose={() => setShowModal(false)} showObservacao={showObservacao} />}
    </div>
  )
}
