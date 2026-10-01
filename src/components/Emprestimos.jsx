import { useState } from 'react'
import { Plus, Trash2, CheckCircle2, Circle, X } from 'lucide-react'
import { MESES, MESES_COMPLETOS } from '../data/initialData.js'

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

const GRUPOS = ['Entrada Casa', 'Creditas', 'Bradesco']

function Modal({ onSave, onClose }) {
  const now = new Date()
  const [form, setForm] = useState({
    desc: '', valor: '', mes: now.getMonth() + 1, ano: now.getFullYear(), pago: false
  })
  function handleSave() {
    if (!form.desc || !form.valor) return
    onSave({ ...form, valor: parseFloat(form.valor), mes: parseInt(form.mes), ano: parseInt(form.ano) })
  }
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-surface rounded-2xl w-full max-w-md p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-fg">Nova Parcela</h3>
          <button onClick={onClose}><X size={18} className="text-muted" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-fg-2 mb-1 block">Descrição / Credor</label>
            <input
              className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              value={form.desc}
              onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
              placeholder="Ex: Entrada Casa, Creditas..."
              list="emprestimo-sugestoes"
            />
            <datalist id="emprestimo-sugestoes">
              {GRUPOS.map(g => <option key={g} value={g} />)}
            </datalist>
          </div>
          <div>
            <label className="text-xs font-medium text-fg-2 mb-1 block">Valor (R$)</label>
            <input
              type="number"
              className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              value={form.valor}
              onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-fg-2 mb-1 block">Mês</label>
              <select
                className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                value={form.mes}
                onChange={e => setForm(f => ({ ...f, mes: e.target.value }))}
              >
                {MESES_COMPLETOS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-fg-2 mb-1 block">Ano</label>
              <input
                type="number"
                className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                value={form.ano}
                onChange={e => setForm(f => ({ ...f, ano: e.target.value }))}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.pago} onChange={e => setForm(f => ({ ...f, pago: e.target.checked }))} className="w-4 h-4 accent-brand" />
            <span className="text-sm text-fg-2">Já pago</span>
          </label>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 border border-line rounded-xl text-sm font-medium text-fg-2 hover:bg-surface-2">Cancelar</button>
          <button onClick={handleSave} className="flex-1 py-2 bg-brand rounded-xl text-sm font-medium text-on-brand hover:bg-brand-strong">Salvar</button>
        </div>
      </div>
    </div>
  )
}

export default function Emprestimos({ items, onChange }) {
  const [showModal, setShowModal] = useState(false)
  const [filtroGrupo, setFiltroGrupo] = useState('Todos')

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

  const grupos = ['Todos', ...Array.from(new Set(items.map(i => i.desc)))]
  const filtered = filtroGrupo === 'Todos' ? items : items.filter(i => i.desc === filtroGrupo)

  const totalAberto = items.filter(i => !i.pago).reduce((s, i) => s + i.valor, 0)
  const totalPago = items.filter(i => i.pago).reduce((s, i) => s + i.valor, 0)

  // Group by creditor for summary
  const byDesc = {}
  items.forEach(i => {
    if (!byDesc[i.desc]) byDesc[i.desc] = { total: 0, aberto: 0, parcelas: 0 }
    byDesc[i.desc].total += i.valor
    if (!i.pago) byDesc[i.desc].aberto += i.valor
    byDesc[i.desc].parcelas++
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="hidden md:block">
          <h2 className="text-xl font-bold text-fg">Empréstimos</h2>
          <p className="text-sm text-muted">Controle de parcelas e financiamentos</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-brand text-on-brand px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-strong"
        >
          <Plus size={16} /> Nova Parcela
        </button>
      </div>

      {/* Summary per creditor */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Object.entries(byDesc).map(([desc, info]) => (
          <div key={desc} className="bg-surface rounded-xl border border-line p-3 ">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide">{desc}</p>
            <p className="text-lg font-bold text-fg mt-1">{fmt(info.aberto)}</p>
            <p className="text-xs text-muted">em aberto · {info.parcelas} parcelas</p>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-orange-500/10 rounded-xl p-3">
          <p className="text-xs font-medium text-orange-400">Total em Aberto</p>
          <p className="text-lg font-bold text-orange-300">{fmt(totalAberto)}</p>
        </div>
        <div className="bg-green-500/10 rounded-xl p-3">
          <p className="text-xs font-medium text-green-400">Total Pago</p>
          <p className="text-lg font-bold text-green-300">{fmt(totalPago)}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {grupos.map(g => (
          <button
            key={g}
            onClick={() => setFiltroGrupo(g)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filtroGrupo === g ? 'bg-brand text-on-brand' : 'bg-surface border border-line text-fg-2 hover:border-brand'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* List grouped by month */}
      {(() => {
        const byMesAno = {}
        filtered.forEach(i => {
          const key = `${i.ano}-${String(i.mes).padStart(2, '0')}`
          if (!byMesAno[key]) byMesAno[key] = []
          byMesAno[key].push(i)
        })
        return Object.entries(byMesAno)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, parcelas]) => {
            const [ano, mes] = key.split('-')
            const total = parcelas.reduce((s, p) => s + p.valor, 0)
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-fg-2">
                    {MESES_COMPLETOS[parseInt(mes) - 1]} / {ano}
                  </h3>
                  <span className="text-sm font-bold text-fg">{fmt(total)}</span>
                </div>
                <div className="space-y-2">
                  {parcelas.map(p => (
                    <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border ${p.pago ? 'bg-green-500/10 border-green-500/20' : 'bg-surface border-line'}`}>
                      <button onClick={() => togglePago(p.id)} className="shrink-0">
                        {p.pago ? <CheckCircle2 size={20} className="text-green-500" /> : <Circle size={20} className="text-subtle" />}
                      </button>
                      <span className={`flex-1 text-sm font-medium ${p.pago ? 'text-muted line-through' : 'text-fg'}`}>{p.desc}</span>
                      <span className="text-sm font-bold text-fg shrink-0">{fmt(p.valor)}</span>
                      <button onClick={() => deleteItem(p.id)} className="p-1.5 text-subtle hover:text-red-500 hover:bg-red-500/10 rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
      })()}

      {showModal && <Modal onSave={saveModal} onClose={() => setShowModal(false)} />}
    </div>
  )
}
