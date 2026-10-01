import { useEffect, type ReactNode } from 'react'
import {
  Home, Utensils, Car, HeartPulse, GraduationCap, ShoppingBag, Plane, Repeat, PawPrint, Receipt, Landmark,
  CircleDashed, TrendingUp, ArrowLeftRight, Circle, Baby, Gift, Coffee, Fuel, Wifi, Zap, Droplet, Flame, Shirt,
  Smartphone, Gamepad2, Film, Dumbbell, Pill, Stethoscope, Bus, Wrench, BookOpen, Tv, Scissors, Briefcase,
  PiggyBank, Wallet, CreditCard, Banknote, Send, HandHeart, Building2, Sofa, ShoppingCart, Beer, Pizza, Bike,
  Music, Sparkles, Tag, X, ChevronLeft, ChevronRight, LoaderCircle, type LucideIcon,
} from 'lucide-react'
import { nomeDoMes, somarMeses, mesAtual, type Mes } from '../lib/formato'
import { useDados } from '../lib/DadosContext'

// Ícones disponíveis para categorias (o nome fica salvo em categories.icon)
export const ICONES: Record<string, LucideIcon> = {
  home: Home, utensils: Utensils, car: Car, 'heart-pulse': HeartPulse, 'graduation-cap': GraduationCap,
  'shopping-bag': ShoppingBag, plane: Plane, repeat: Repeat, 'paw-print': PawPrint, receipt: Receipt,
  landmark: Landmark, 'circle-dashed': CircleDashed, 'trending-up': TrendingUp, 'arrow-left-right': ArrowLeftRight,
  circle: Circle, baby: Baby, gift: Gift, coffee: Coffee, fuel: Fuel, wifi: Wifi, zap: Zap, droplet: Droplet,
  flame: Flame, shirt: Shirt, smartphone: Smartphone, gamepad: Gamepad2, film: Film, dumbbell: Dumbbell, pill: Pill,
  stethoscope: Stethoscope, bus: Bus, wrench: Wrench, book: BookOpen, tv: Tv, scissors: Scissors,
  briefcase: Briefcase, 'piggy-bank': PiggyBank, wallet: Wallet, 'credit-card': CreditCard, banknote: Banknote,
  send: Send, 'hand-heart': HandHeart, building: Building2, sofa: Sofa, 'shopping-cart': ShoppingCart, beer: Beer,
  pizza: Pizza, bike: Bike, music: Music, sparkles: Sparkles, tag: Tag,
}

export function Icone({ nome, size = 18, className }: { nome: string | null | undefined; size?: number; className?: string }) {
  const I = ICONES[nome || ''] ?? Circle
  return <I size={size} className={className} />
}

export function Painel({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return <div id={id} className={`rounded-3xl border border-line bg-surface ${className}`}>{children}</div>
}

export function Titulo({ titulo, subtitulo, acao }: { titulo: string; subtitulo?: string; acao?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-fg">{titulo}</h2>
        {subtitulo && <p className="text-sm text-muted">{subtitulo}</p>}
      </div>
      {acao}
    </div>
  )
}

export function Botao({ children, variante = 'primario', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'primario' | 'secundario' | 'fantasma' }) {
  const estilos = {
    primario: 'bg-brand text-on-brand hover:bg-brand-strong font-semibold',
    secundario: 'border border-line text-fg-2 hover:bg-surface-2 font-medium',
    fantasma: 'text-muted hover:text-fg hover:bg-surface-2 font-medium',
  }
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm transition-colors disabled:opacity-50 ${estilos[variante]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Modal({ titulo, aoFechar, children, largo = false }: { titulo: string; aoFechar: () => void; children: ReactNode; largo?: boolean }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aoFechar])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center md:p-4" onMouseDown={aoFechar}>
      <div
        className={`flex max-h-[92vh] w-full flex-col rounded-t-3xl border border-line bg-surface md:rounded-3xl ${largo ? 'max-w-2xl' : 'max-w-md'}`}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 pb-3">
          <h3 className="font-semibold text-fg">{titulo}</h3>
          <button onClick={aoFechar} className="p-1 text-muted hover:text-fg" aria-label="Fechar"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </div>
  )
}

export function Carregando({ texto = 'Carregando...' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
      <LoaderCircle size={16} className="animate-spin" /> {texto}
    </div>
  )
}

export function Vazio({ icone, titulo, children }: { icone: ReactNode; titulo: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="rounded-2xl bg-brand/10 p-3 text-brand">{icone}</div>
      <p className="font-semibold text-fg">{titulo}</p>
      {children && <div className="max-w-sm text-sm text-muted">{children}</div>}
    </div>
  )
}

export function SeletorMes({ mes, aoMudar }: { mes: Mes; aoMudar: (m: Mes) => void }) {
  const ehAtual = mes >= mesAtual()
  return (
    <div className="inline-flex items-center rounded-xl border border-line bg-surface">
      <button onClick={() => aoMudar(somarMeses(mes, -1))} className="p-2 text-muted hover:text-fg" aria-label="Mês anterior"><ChevronLeft size={16} /></button>
      <span className="min-w-[9.5rem] text-center text-sm font-medium capitalize text-fg">{nomeDoMes(mes)}</span>
      <button onClick={() => aoMudar(somarMeses(mes, 1))} disabled={ehAtual} className="p-2 text-muted hover:text-fg disabled:opacity-30" aria-label="Próximo mês"><ChevronRight size={16} /></button>
    </div>
  )
}

export function Chips<T extends string>({ opcoes, valor, aoMudar }: { opcoes: { id: T; nome: string }[]; valor: T; aoMudar: (v: T) => void }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
      {opcoes.map(o => (
        <button
          key={o.id}
          onClick={() => aoMudar(o.id)}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            valor === o.id ? 'bg-fg text-canvas' : 'border border-line bg-surface text-fg-2 hover:border-muted'
          }`}
        >
          {o.nome}
        </button>
      ))}
    </div>
  )
}

// <select> agrupado: categoria-mãe como grupo, subcategorias como opções
export function SeletorCategoria({ valor, aoMudar, className = 'campo', incluirVazio }: { valor: string | null; aoMudar: (id: string | null) => void; className?: string; incluirVazio?: string }) {
  const { arvore } = useDados()
  return (
    <select value={valor ?? ''} onChange={e => aoMudar(e.target.value || null)} className={className}>
      {incluirVazio && <option value="">{incluirVazio}</option>}
      {arvore.map(({ mae, filhas }) => (
        <optgroup key={mae.id} label={mae.name}>
          <option value={mae.id}>{mae.name} (geral)</option>
          {filhas.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </optgroup>
      ))}
    </select>
  )
}
