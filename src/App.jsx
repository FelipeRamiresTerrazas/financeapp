import { useState, useEffect, useRef } from 'react'
import { LayoutDashboard, List, CreditCard, Landmark, PiggyBank, Menu, X, PieChart, Palette, Check } from 'lucide-react'
import Dashboard from './components/Dashboard.jsx'
import PlanejamentoMensal from './components/PlanejamentoMensal.jsx'
import Emprestimos from './components/Emprestimos.jsx'
import CartaoCredito from './components/CartaoCredito.jsx'
import SaldoReserva from './components/SaldoReserva.jsx'
import Gastos from './components/Gastos.jsx'
import { useTheme } from './theme/ThemeContext.jsx'
import { THEMES } from './theme/themes.js'
import {
  initialPlanejamento,
  initialEmprestimos,
  initialSaldoReserva,
  initialCartaoCredito,
  initialCartaoCreditoDay,
} from './data/initialData.js'

const STORAGE_KEY = 'financas_familia_v1'

const DEFAULT_DATA = {
  planejamento: initialPlanejamento,
  emprestimos: initialEmprestimos,
  saldoReserva: initialSaldoReserva,
  cartao: initialCartaoCredito,
  cartaoDay: initialCartaoCreditoDay,
  transacoes: [],
  regrasCategoria: {},
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    // completa com chaves novas (ex.: transacoes) para dados salvos por versões antigas
    if (saved) return { ...DEFAULT_DATA, ...JSON.parse(saved) }
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
  { id: 'gastos', label: 'Gastos', icon: PieChart },
  { id: 'planejamento', label: 'Planejamento', icon: List },
  { id: 'emprestimos', label: 'Empréstimos', icon: Landmark },
  { id: 'cartao', label: 'Cartão Felipe', icon: CreditCard },
  { id: 'cartaoday', label: 'Cartão Day', icon: CreditCard },
  { id: 'reserva', label: 'Saldo Reserva', icon: PiggyBank },
]

function ThemePicker() {
  const { themeId, setThemeId } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const fechar = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fechar)
    return () => document.removeEventListener('mousedown', fechar)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="p-2 rounded-xl text-muted hover:text-fg hover:bg-surface-2 transition-colors"
        title="Tema"
      >
        <Palette size={18} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-surface-2 border border-line rounded-2xl p-1.5 z-40">
          <p className="px-2.5 pt-1.5 pb-2 text-xs font-medium text-muted">Tema</p>
          {Object.entries(THEMES).map(([id, t]) => (
            <button
              key={id}
              onClick={() => { setThemeId(id); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm text-fg-2 hover:bg-surface-3"
            >
              <span className="w-5 h-5 rounded-full border border-line flex items-center justify-center" style={{ background: t.canvas }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.brand }} />
              </span>
              <span className="flex-1 text-left">{t.nome}</span>
              {themeId === id && <Check size={14} className="text-brand" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function App() {
  // a aba atual fica na URL (#gastos) para sobreviver ao recarregar a página
  const [page, setPageState] = useState(() => {
    const hash = window.location.hash.slice(1)
    return NAV_ITEMS.some(n => n.id === hash) ? hash : 'dashboard'
  })
  const [menuOpen, setMenuOpen] = useState(false)

  function setPage(id) {
    setPageState(id)
    window.history.replaceState(null, '', `#${id}`)
  }

  const [data, setData] = useState(() => loadData() || DEFAULT_DATA)

  useEffect(() => {
    saveData(data)
  }, [data])

  function update(key, value) {
    setData(prev => ({ ...prev, [key]: value }))
  }

  function updateMany(patch) {
    setData(prev => ({ ...prev, ...patch }))
  }

  const current = NAV_ITEMS.find(n => n.id === page)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="bg-canvas/80 backdrop-blur-lg border-b border-line sticky top-0 z-30">
        <div className="flex items-center justify-between gap-4 px-4 h-16 max-w-7xl mx-auto">
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="w-8 h-8 rounded-xl bg-brand text-on-brand flex items-center justify-center font-bold">F</span>
            <span className="text-base font-semibold tracking-tight text-fg">Finanças</span>
            <span className="hidden sm:inline text-muted text-sm">Família</span>
          </div>
          {/* Desktop nav */}
          <nav className="hidden lg:flex gap-1 overflow-x-auto scrollbar-hide">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  page === item.id
                    ? 'bg-surface-2 text-fg'
                    : 'text-muted hover:text-fg'
                }`}
              >
                <item.icon size={15} className={page === item.id ? 'text-brand' : ''} />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <ThemePicker />
            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 rounded-xl text-fg-2 hover:bg-surface-2"
              onClick={() => setMenuOpen(o => !o)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="lg:hidden border-t border-line px-4 py-3 flex flex-col gap-1">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => { setPage(item.id); setMenuOpen(false) }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  page === item.id
                    ? 'bg-surface-2 text-fg'
                    : 'text-muted hover:text-fg'
                }`}
              >
                <item.icon size={16} className={page === item.id ? 'text-brand' : ''} />
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Page title bar */}
      <div className="px-4 pt-4 md:hidden">
        <h1 className="text-xl font-bold text-fg flex items-center gap-2">
          {current && <current.icon size={20} className="text-brand" />}
          {current?.label}
        </h1>
      </div>

      {/* Content */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        {page === 'dashboard' && (
          <Dashboard data={data} />
        )}
        {page === 'gastos' && (
          <Gastos data={data} onChange={updateMany} />
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
