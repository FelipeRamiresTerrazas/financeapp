// Dados "de cadastro" usados em todas as telas (categorias, pessoas, contas, cartões, conexões).
// São poucos registros: carrega tudo uma vez e recarrega quando algo muda.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase, type Cartao, type Categoria, type Conexao, type Conta, type Pessoa } from './supabase'

interface Dados {
  carregando: boolean
  categorias: Categoria[]
  categoriaPorId: Map<string, Categoria>
  // categorias-mãe com as subcategorias, na ordem de exibição
  arvore: { mae: Categoria; filhas: Categoria[] }[]
  pessoas: Pessoa[]
  contas: Conta[]
  cartoes: Cartao[]
  conexoes: Conexao[]
  recarregar: () => Promise<void>
}

const DadosContext = createContext<Dados | null>(null)

export function DadosProvider({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [conexoes, setConexoes] = useState<Conexao[]>([])

  const recarregar = useCallback(async () => {
    const [cat, pes, con, car, cnx] = await Promise.all([
      supabase.from('categories').select('*').order('position'),
      supabase.from('people').select('id, name').order('name'),
      supabase.from('accounts').select('*').order('type').order('name'),
      supabase.from('cards').select('*'),
      supabase.from('pluggy_items').select('*').order('connector_name'),
    ])
    setCategorias(cat.data ?? [])
    setPessoas(pes.data ?? [])
    setContas(con.data ?? [])
    setCartoes(car.data ?? [])
    setConexoes(cnx.data ?? [])
    setCarregando(false)
  }, [])

  useEffect(() => { recarregar() }, [recarregar])

  const valor = useMemo<Dados>(() => {
    const categoriaPorId = new Map(categorias.map(c => [c.id, c]))
    const arvore = categorias
      .filter(c => !c.parent_id)
      .map(mae => ({ mae, filhas: categorias.filter(c => c.parent_id === mae.id) }))
    return { carregando, categorias, categoriaPorId, arvore, pessoas, contas, cartoes, conexoes, recarregar }
  }, [carregando, categorias, pessoas, contas, cartoes, conexoes, recarregar])

  return <DadosContext.Provider value={valor}>{children}</DadosContext.Provider>
}

export function useDados() {
  const v = useContext(DadosContext)
  if (!v) throw new Error('useDados fora do DadosProvider')
  return v
}
