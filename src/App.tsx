import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { LayoutDashboard, List, Tags, Landmark, Palette, Check, LogOut, ShieldAlert } from 'lucide-react'
import { supabase } from './lib/supabase'
import { DadosProvider } from './lib/DadosContext'
import { irPara, useNavegacao, type Pagina } from './lib/navegacao'
import { useTema } from './theme/TemaContext'
import { TEMAS } from './theme/temas'
import { Carregando } from './components/ui'
import Login from './pages/Login'
import Visao from './pages/Visao'
import Transacoes from './pages/Transacoes'
import Categorias from './pages/Categorias'
import Contas from './pages/Contas'

const NAV: { id: Pagina; nome: string; icone: typeof List }[] = [
  { id: 'visao', nome: 'Visão geral', icone: LayoutDashboard },
  { id: 'transacoes', nome: 'Transações', icone: List },
  { id: 'categorias', nome: 'Categorias', icone: Tags },
  { id: 'contas', nome: 'Contas', icone: Landmark },
]

export default function App() {
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined)
  const [membro, setMembro] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!sessao) return setMembro(null)
    supabase.rpc('is_member').then(({ data }) => setMembro(!!data))
  }, [sessao])

  if (sessao === undefined || (sessao && membro === null)) return <Carregando />
  if (!sessao) return <Login />
  if (!membro) return <SemAcesso email={sessao.user.email} />

  return (
    <DadosProvider>
      <Estrutura email={sessao.user.email} />
    </DadosProvider>
  )
}

function SemAcesso({ email }: { email?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-sm space-y-4 rounded-3xl border border-line bg-surface p-6 text-center">
        <ShieldAlert size={32} className="mx-auto text-negativo" />
        <p className="font-semibold text-fg">Acesso ainda não liberado</p>
        <p className="text-sm text-muted">
          O e-mail <strong className="text-fg-2">{email}</strong> não está na lista da família. Peça para quem já usa o app autorizar em Contas → Família.
        </p>
        <button onClick={() => supabase.auth.signOut()} className="text-sm font-medium text-brand hover:underline">Sair</button>
      </div>
    </div>
  )
}

function Estrutura({ email }: { email?: string }) {
  const { pagina, params } = useNavegacao()
  const [toast, setToast] = useState<string | null>(null)
  const timer = useRef<number>()

  const aviso = useCallback((m: string) => {
    setToast(m)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), 3500)
  }, [])

  return (
    <div className="flex min-h-screen flex-col pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <button onClick={() => irPara('visao')} className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand font-bold text-on-brand">F</span>
            <span className="font-semibold tracking-tight text-fg">Finanças</span>
            <span className="hidden text-sm text-muted sm:inline">da Família</span>
          </button>
          <nav className="hidden gap-1 md:flex">
            {NAV.map(n => (
              <button
                key={n.id}
                onClick={() => irPara(n.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${pagina === n.id ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg'}`}
              >
                <n.icone size={15} className={pagina === n.id ? 'text-brand' : ''} />
                {n.nome}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <SeletorTema />
            <button onClick={() => supabase.auth.signOut()} className="rounded-xl p-2 text-muted hover:bg-surface-2 hover:text-fg" title={`Sair (${email})`}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">
        {pagina === 'visao' && <Visao params={params} />}
        {pagina === 'transacoes' && <Transacoes params={params} aviso={aviso} />}
        {pagina === 'categorias' && <Categorias aviso={aviso} />}
        {pagina === 'contas' && <Contas aviso={aviso} />}
      </main>

      {/* navegação inferior no celular */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-canvas/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden">
        {NAV.map(n => (
          <button key={n.id} onClick={() => irPara(n.id)} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${pagina === n.id ? 'text-brand' : 'text-muted'}`}>
            <n.icone size={20} />
            {n.nome}
          </button>
        ))}
      </nav>

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-6" role="status">
          <div className="rounded-2xl border border-line bg-surface-3 px-4 py-2.5 text-sm text-fg shadow-lg">{toast}</div>
        </div>
      )}
    </div>
  )
}

function SeletorTema() {
  const { temaId, setTemaId } = useTema()
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    const fechar = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAberto(false) }
    document.addEventListener('mousedown', fechar)
    return () => document.removeEventListener('mousedown', fechar)
  }, [aberto])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setAberto(a => !a)} className="rounded-xl p-2 text-muted hover:bg-surface-2 hover:text-fg" title="Tema">
        <Palette size={18} />
      </button>
      {aberto && (
        <div className="absolute right-0 z-40 mt-2 w-48 rounded-2xl border border-line bg-surface-2 p-1.5">
          <p className="px-2.5 pb-2 pt-1.5 text-xs font-medium text-muted">Tema</p>
          {Object.entries(TEMAS).map(([id, t]) => (
            <button key={id} onClick={() => { setTemaId(id); setAberto(false) }} className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-fg-2 hover:bg-surface-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-line" style={{ background: t.canvas }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.brand }} />
              </span>
              <span className="flex-1 text-left">{t.nome}</span>
              {temaId === id && <Check size={14} className="text-brand" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
