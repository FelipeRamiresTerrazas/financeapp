import { useState } from 'react'
import { Plus, Trash2, Pencil, X } from 'lucide-react'
import { MESES, MESES_COMPLETOS } from '../data/initialData.js'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function Modal({ item, onSave, onClose }) {
  const now = new Date()
  const [form, setForm] = useState(item || {
    desc: 'Creditas', valor: '', mes: now.getMonth() + 1, ano: now.getFullYear()
  })
  function handleSave() {
    if (!form.desc || !form.mes || !form.ano) return
    onSave({ ...form, valor: form.valor !== '' ? parseFloat(form.valor) : null, mes: parseInt(form.mes), ano: parseInt(form.ano) })
  }
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900">{item ? 'Editar Saldo' : 'Novo Saldo'}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Descrição</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.desc}
              onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Valor (R$) — deixe vazio se ainda não souber</label>
            <input
              type="number"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.valor ?? ''}
              onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
              placeholder="Opcional"
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
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSave} className="flex-1 py-2 bg-blue-600 rounded-xl text-sm font-medium text-white hover:bg-blue-700">Salvar</button>
        </div>
      </div>
    </div>
  )
}

export default function SaldoReserva({ items, onChange }) {
  const [modal, setModal] = useState(null)

  function deleteItem(id) {
    onChange(items.filter(i => i.id !== id))
  }

  function saveModal(form) {
    if (modal === 'new') {
      const maxId = Math.max(0, ...items.map(i => i.id))
      onChange([...items, { ...form, id: maxId + 1 }])
    } else {
      onChange(items.map(i => i.id === form.id ? form : i))
    }
    setModal(null)
  }

  const sorted = [...items].sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes)
  const chartData = sorted
    .filter(i => i.valor != null)
    .map(i => ({ name: `${MESES[i.mes - 1]}/${i.ano}`, valor: i.valor }))

  const latest = [...sorted].filter(i => i.valor != null).pop()
  const previous = [...sorted].filter(i => i.valor != null).slice(-2)[0]
  const diff = latest && previous && latest !== previous ? latest.valor - previous.valor : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="hidden md:block">
          <h2 className="text-xl font-bold text-gray-900">Saldo de Reserva</h2>
          <p className="text-sm text-gray-500">Acompanhamento mensal do saldo</p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} /> Novo Mês
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-xs font-medium text-green-600">Saldo Atual</p>
          <p className="text-xl font-bold text-green-800">{latest ? fmt(latest.valor) : 'N/A'}</p>
          {latest && <p className="text-xs text-green-600 mt-0.5">{MESES_COMPLETOS[latest.mes - 1]}/{latest.ano}</p>}
        </div>
        <div className={`rounded-xl p-4 ${diff != null ? (diff >= 0 ? 'bg-blue-50' : 'bg-red-50') : 'bg-gray-50'}`}>
          <p className={`text-xs font-medium ${diff != null ? (diff >= 0 ? 'text-blue-600' : 'text-red-600') : 'text-gray-500'}`}>Variação</p>
          <p className={`text-xl font-bold ${diff != null ? (diff >= 0 ? 'text-blue-800' : 'text-red-800') : 'text-gray-400'}`}>
            {diff != null ? (diff >= 0 ? '+' : '') + fmt(diff) : 'N/A'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">vs. mês anterior</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Evolução do Saldo</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => fmt(v)} />
              <Line type="monotone" dataKey="valor" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Descrição</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Mês / Ano</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Saldo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {sorted.map(item => (
              <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-800">{item.desc}</td>
                <td className="px-4 py-3 text-gray-500">{MESES_COMPLETOS[item.mes - 1]}/{item.ano}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                  {item.valor != null ? fmt(item.valor) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setModal(item)} className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => deleteItem(item.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal
          item={modal === 'new' ? null : modal}
          onSave={saveModal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
