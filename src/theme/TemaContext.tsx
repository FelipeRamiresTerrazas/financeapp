import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { TEMAS, aplicarTema, salvarTema, temaSalvo, type Tema } from './temas'

interface Valor {
  temaId: string
  tema: Tema
  setTemaId: (id: string) => void
}

const TemaContext = createContext<Valor | null>(null)

export function TemaProvider({ children }: { children: ReactNode }) {
  const [temaId, setTemaId] = useState(temaSalvo)

  useEffect(() => {
    aplicarTema(temaId)
    salvarTema(temaId)
  }, [temaId])

  return <TemaContext.Provider value={{ temaId, tema: TEMAS[temaId], setTemaId }}>{children}</TemaContext.Provider>
}

export function useTema() {
  const v = useContext(TemaContext)
  if (!v) throw new Error('useTema fora do TemaProvider')
  return v
}

// Estilos comuns para os gráficos Recharts (que não leem classes Tailwind)
export function useEstiloGrafico() {
  const { tema } = useTema()
  return {
    tema,
    tick: { fontSize: 11, fill: tema.muted },
    tooltip: {
      contentStyle: { background: tema.surface2, border: `1px solid ${tema.line}`, borderRadius: 12, color: tema.fg, fontSize: 12 },
      labelStyle: { color: tema.muted, fontWeight: 600 },
      itemStyle: { color: tema.fg },
      cursor: { fill: tema.surface3, opacity: 0.5 },
    },
  }
}
