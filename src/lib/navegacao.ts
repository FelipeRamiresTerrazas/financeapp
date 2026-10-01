// Navegação pelo hash da URL: "#transacoes?mes=2026-10&categoria=<id>".
// Mantém a tela e os filtros ao recarregar e permite links entre telas.

import { useEffect, useState } from 'react'

export type Pagina = 'visao' | 'transacoes' | 'categorias' | 'contas'
const PAGINAS: Pagina[] = ['visao', 'transacoes', 'categorias', 'contas']

function ler(): { pagina: Pagina; params: URLSearchParams } {
  const [nome, query] = window.location.hash.slice(1).split('?')
  return {
    pagina: PAGINAS.includes(nome as Pagina) ? (nome as Pagina) : 'visao',
    params: new URLSearchParams(query ?? ''),
  }
}

export function irPara(pagina: Pagina, params: Record<string, string | null | undefined> = {}) {
  const q = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1])).toString()
  window.location.hash = q ? `${pagina}?${q}` : pagina
}

export function useNavegacao() {
  const [estado, setEstado] = useState(ler)
  useEffect(() => {
    const mudar = () => setEstado(ler())
    window.addEventListener('hashchange', mudar)
    return () => window.removeEventListener('hashchange', mudar)
  }, [])
  return estado
}
