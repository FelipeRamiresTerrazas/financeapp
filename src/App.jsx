import { useState, useEffect } from 'react'
import { LayoutDashboard, List, CreditCard, Landmark, PiggyBank, Menu, X } from 'lucide-react'
import Dashboard from './components/Dashboard.jsx'
import PlanejamentoMensal from './components/PlanejamentoMensal.jsx'
import Emprestimos from './components/Emprestimos.jsx'
import CartaoCredito from './components/CartaoCredito.jsx'
import SaldoReserva from './components/SaldoReserva.jsx'
import {
  initialPlanejamento,
  initialEmprestimos,
  initialSaldoReserva,
  initialCartaoCredito,
  initialCartaoCreditoDay,
} from './data/initialData.js'

const STORAGE_KEY = 'financas_familia_v1'

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return null
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'planejamento', label: 'Planejamento', icon: List },
  { id: 'emprestimos', label: 'Empréstimos', icon: Landmark },
  { id: 'cartao', label: 'Cartão Felipe', icon: CreditCard },
  { id: 'cartaoday', label: 'Cartão Day', icon: CreditCard },
  { id: 'reserva', label: 'Saldo Reserva', icon: PiggyBank },
]

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)

  const [data, setData] = useState(() => {
    const saved = loadData()
    if (saved) return saved
    return {
      planejamento: initialPlanejamento,
      emprestimos: initialEmprestimos,
      saldoReserva: initialSaldoReserva,
      cartao: initialCartaoCredito,
      cartaoDay: initialCartaoCreditoDay,
    }
  })

  useEffect(() => {
    saveData(data)
  }, [data])

  function update(key, value) {
    setData(prev => ({ ...prev, [key]: value }))
  }

  const current = NAV_ITEMS.find(n => n.id === page)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="bg-blue-700 text-white shadow-md sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">💰 Finanças</span>
            <span className="hidden sm:inline text-blue-200 text-sm font-medium">Família</span>
          </div>
          {/* Desktop nav */}
          <nav className="hidden md:flex gap-1">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  page === item.id
                    ? 'bg-white text-blue-700'
                    : 'text-blue-100 hover:bg-blue-600'
                }`}
              >
                <item.icon size={15} />
                {item.label}
              </button>
            ))}
          </nav>
          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-blue-600"
            onClick={() => setMenuOpen(o => !o)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="md:hidden bg-blue-800 px-4 pb-3 flex flex-col gap-1">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => { setPage(item.id); setMenuOpen(false) }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  page === item.id
                    ? 'bg-white text-blue-700'
                    : 'text-blue-100 hover:bg-blue-700'
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Page title bar */}
      <div className="bg-white border-b px-4 py-3 md:hidden">
        <h1 className="font-semibold text-gray-800 flex items-center gap-2">
          {current && <current.icon size={18} className="text-blue-600" />}
          {current?.label}
        </h1>
      </div>

      {/* Content */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        {page === 'dashboard' && (
          <Dashboard data={data} />
        )}
        {page === 'planejamento' && (
          <PlanejamentoMensal
            items={data.planejamento}
            onChange={v => update('planejamento', v)}
          />
        )}
        {page === 'emprestimos' && (
          <Emprestimos
            items={data.emprestimos}
            onChange={v => update('emprestimos', v)}
          />
        )}
        {page === 'cartao' && (
          <CartaoCredito
            items={data.cartao}
            title="Cartão de Crédito — Felipe"
            storageKey="cartao"
            onChange={v => update('cartao', v)}
          />
        )}
        {page === 'cartaoday' && (
          <CartaoCredito
            items={data.cartaoDay}
            title="Cartão de Crédito — Day"
            storageKey="cartaoDay"
            showObservacao
            onChange={v => update('cartaoDay', v)}
          />
        )}
        {page === 'reserva' && (
          <SaldoReserva
            items={data.saldoReserva}
            onChange={v => update('saldoReserva', v)}
          />
        )}
      </main>
    </div>
  )
}
