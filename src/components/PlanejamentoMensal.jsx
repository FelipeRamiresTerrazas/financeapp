import { useState } from 'react'
import { Plus, Trash2, CheckCircle2, Circle, Pencil, X, Check } from 'lucide-react'

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function ItemRow({ item, onTogglePago, onEdit, onDelete }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
      item.pago ? 'bg-green-50 border-green-100' : 'bg-white border-gray-100'
    }`}>
      <button onClick={() => onTogglePago(item.id)} className="shrink-0">
        {item.pago
          ? <CheckCircle2 size={20} className="text-green-500" />
          : <Circle size={20} className="text-gray-300" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${item.pago ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
          {item.descricao}
        </p>
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
          item.tipoPagamento === 'saldo' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
        }`}>
          {item.tipoPagamento === 'saldo' ? 'Saldo' : 'Crédito'}
        </span>
      </div>
      <span className="text-sm font-bold text-gray-900 shrink-0">{fmt(item.valor)}</span>
      <div className="flex gap-1 shrink-0">
        <button onClick={() => onEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
          <Pencil size={14} />
        </button>
        <button onClick={() => onDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

function Modal({ item, onSave, onClose }) {
  const [form, setForm] = useState(item || { descricao: '', valor: '', tipoPagamento: 'saldo', pago: false })
  function handleSave() {
    if (!form.descricao || !form.valor) return
    onSave({ ...form, valor: parseFloat(form.valor) })
  }
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900">{item ? 'Editar Item' : 'Novo Item'}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Descrição</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder="Ex: Escola, Aluguel..."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Valor (R$)</label>
            <input
              type="number"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.valor}
              onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
              placeholder="0,00"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo de Pagamento</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.tipoPagamento}
              onChange={e => setForm(f => ({ ...f, tipoPagamento: e.target.value }))}
            >
              <option value="saldo">Saldo (débito/transferência)</option>
              <option value="credito">Crédito</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.pago}
              onChange={e => setForm(f => ({ ...f, pago: e.target.checked }))}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm text-gray-700">Já pago</span>
          </label>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handleSave} className="flex-1 py-2 bg-blue-600 rounded-xl text-sm font-medium text-white hover:bg-blue-700">
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PlanejamentoMensal({ items, onChange }) {
  const [modal, setModal] = useState(null) // null | 'new' | item

  function togglePago(id) {
    onChange(items.map(i => i.id === id ? { ...i, pago: !i.pago } : i))
  }

  function deleteItem(id) {
    onChange(items.filter(i => i.id !== id))
  }

  function saveModal(form) {
    if (modal === 'new') {
      const maxId = Math.max(0, ...items.map(i => i.id))
      onChange([...items, { ...form, id: maxId + 1, incluirConta: true }])
    } else {
      onChange(items.map(i => i.id === form.id ? form : i))
    }
    setModal(null)
  }

  const totalSaldo = items.filter(i => i.tipoPagamento === 'saldo').reduce((s, i) => s + i.valor, 0)
  const totalCredito = items.filter(i => i.tipoPagamento === 'credito').reduce((s, i) => s + i.valor, 0)
  const totalPago = items.filter(i => i.pago).reduce((s, i) => s + i.valor, 0)
  const totalGeral = totalSaldo + totalCredito

  const saldoItems = items.filter(i => i.tipoPagamento === 'saldo')
  const creditoItems = items.filter(i => i.tipoPagamento === 'credito')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="hidden md:block">
          <h2 className="text-xl font-bold text-gray-900">Planejamento Mensal</h2>
          <p className="text-sm text-gray-500">Gastos fixos recorrentes</p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Novo Item
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-xs text-blue-600 font-medium">Via Saldo</p>
          <p className="text-base font-bold text-blue-800">{fmt(totalSaldo)}</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-3 text-center">
          <p className="text-xs text-purple-600 font-medium">Via Crédito</p>
          <p className="text-base font-bold text-purple-800">{fmt(totalCredito)}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-xs text-green-600 font-medium">Pago</p>
          <p className="text-base font-bold text-green-800">{fmt(totalPago)}</p>
        </div>
      </div>

      {/* Lists */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 bg-blue-500 rounded-full inline-block" />
            Pagos pelo Saldo ({saldoItems.length})
          </h3>
          <div className="space-y-2">
            {saldoItems.map(item => (
              <ItemRow key={item.id} item={item} onTogglePago={togglePago} onEdit={setModal} onDelete={deleteItem} />
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 bg-purple-500 rounded-full inline-block" />
            Pagos no Crédito ({creditoItems.length})
          </h3>
          <div className="space-y-2">
            {creditoItems.map(item => (
              <ItemRow key={item.id} item={item} onTogglePago={togglePago} onEdit={setModal} onDelete={deleteItem} />
            ))}
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="bg-gray-900 text-white rounded-2xl p-4 flex justify-between items-center">
        <span className="font-medium">Total Mensal</span>
        <span className="text-xl font-bold">{fmt(totalGeral)}</span>
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
