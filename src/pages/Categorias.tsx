import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Sparkles, Lock } from 'lucide-react'
import { Botao, Chips, Icone, ICONES, Modal, Painel, SeletorCategoria, Carregando, Vazio } from '../components/ui'
import { useDados } from '../lib/DadosContext'
import { supabase, type Categoria, type Regra, type Tipo } from '../lib/supabase'

const TIPOS: { id: Tipo; nome: string }[] = [
  { id: 'despesa', nome: 'Gasto' },
  { id: 'receita', nome: 'Receita' },
  { id: 'transferencia', nome: 'Transferência' },
]

const ROTULO_TIPO: Record<Tipo, string> = { despesa: 'Gasto', receita: 'Receita', transferencia: 'Transferência (fora dos totais)' }

type Edicao = { categoria: Partial<Categoria> & { parent_id: string | null } }

export default function Categorias({ aviso }: { aviso: (m: string) => void }) {
  const [aba, setAba] = useState<'categorias' | 'regras'>('categorias')
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="hidden text-xl font-bold text-fg md:block">Categorias</h2>
        <Chips opcoes={[{ id: 'categorias', nome: 'Categorias' }, { id: 'regras', nome: 'O que o app aprendeu' }]} valor={aba} aoMudar={setAba} />
      </div>
      {aba === 'categorias' ? <ArvoreCategorias aviso={aviso} /> : <Regras aviso={aviso} />}
    </div>
  )
}

function ArvoreCategorias({ aviso }: { aviso: (m: string) => void }) {
  const { arvore, recarregar } = useDados()
  const [edicao, setEdicao] = useState<Edicao | null>(null)

  async function excluir(c: Categoria, temFilhas: boolean) {
    const msg = temFilhas
      ? `Excluir "${c.name}" e todas as subcategorias? As transações delas ficarão "a revisar".`
      : `Excluir "${c.name}"? As transações dela ficarão "a revisar".`
    if (!confirm(msg)) return
    const { error } = await supabase.from('categories').delete().eq('id', c.id)
    if (error) return aviso(`Erro: ${error.message}`)
    await recarregar()
    aviso('Categoria excluída')
  }

  return (
    <>
      <div className="flex justify-end">
        <Botao onClick={() => setEdicao({ categoria: { parent_id: null, kind: 'despesa', icon: 'tag' } })}><Plus size={16} /> Nova categoria</Botao>
      </div>
      <div className="space-y-3">
        {arvore.map(({ mae, filhas }) => {
          const protegida = !!mae.system_key || filhas.some(f => f.system_key)
          return (
            <Painel key={mae.id} className="overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="rounded-xl bg-surface-2 p-2 text-fg-2"><Icone nome={mae.icon} /></div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-fg">{mae.name}</p>
                  <p className="text-xs text-muted">{ROTULO_TIPO[mae.kind]} · {filhas.length} subcategorias</p>
                </div>
                <button onClick={() => setEdicao({ categoria: { parent_id: mae.id, icon: mae.icon } })} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-fg" title="Nova subcategoria"><Plus size={16} /></button>
                <button onClick={() => setEdicao({ categoria: mae })} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-fg" title="Editar"><Pencil size={15} /></button>
                {protegida
                  ? <span className="p-2 text-subtle" title="Usada pelo app para reconhecer transferências; não pode ser excluída"><Lock size={15} /></span>
                  : <button onClick={() => excluir(mae, filhas.length > 0)} className="rounded-lg p-2 text-muted hover:bg-negativo/10 hover:text-negativo" title="Excluir"><Trash2 size={15} /></button>}
              </div>
              {filhas.length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-t border-line px-4 py-3">
                  {filhas.map(f => (
                    <span key={f.id} className="group inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 py-1 pl-3 pr-1 text-xs text-fg-2">
                      {f.name}
                      <button onClick={() => setEdicao({ categoria: f })} className="rounded-full p-1 text-subtle hover:text-fg" title="Editar"><Pencil size={11} /></button>
                      {!f.system_key && (
                        <button onClick={() => excluir(f, false)} className="rounded-full p-1 text-subtle hover:text-negativo" title="Excluir"><Trash2 size={11} /></button>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </Painel>
          )
        })}
      </div>
      {edicao && <EditarCategoria inicial={edicao.categoria} aoFechar={() => setEdicao(null)} aoSalvar={async m => { setEdicao(null); await recarregar(); aviso(m) }} />}
    </>
  )
}

function EditarCategoria({ inicial, aoFechar, aoSalvar }: {
  inicial: Partial<Categoria> & { parent_id: string | null }
  aoFechar: () => void
  aoSalvar: (mensagem: string) => void
}) {
  const { arvore, categoriaPorId } = useDados()
  const [nome, setNome] = useState(inicial.name ?? '')
  const [icone, setIcone] = useState(inicial.icon ?? 'tag')
  const [tipo, setTipo] = useState<Tipo>(inicial.kind ?? 'despesa')
  const [mae, setMae] = useState(inicial.parent_id)
  const [erro, setErro] = useState('')
  const editando = !!inicial.id
  const ehSub = !!mae
  const temFilhas = editando && arvore.some(a => a.mae.id === inicial.id && a.filhas.length > 0)

  async function salvar() {
    if (!nome.trim()) return setErro('Dê um nome para a categoria.')
    const dados = { name: nome.trim(), icon: icone, parent_id: mae, ...(ehSub ? {} : { kind: tipo }) }
    const { error } = editando
      ? await supabase.from('categories').update(dados).eq('id', inicial.id!)
      : await supabase.from('categories').insert({ ...dados, position: 999 })
    if (error) return setErro(error.code === '23505' ? 'Já existe uma categoria com esse nome aqui.' : error.message)
    aoSalvar(editando ? 'Categoria atualizada' : 'Categoria criada')
  }

  const titulo = editando ? 'Editar categoria' : ehSub ? `Nova subcategoria em ${categoriaPorId.get(mae!)?.name}` : 'Nova categoria'

  return (
    <Modal titulo={titulo} aoFechar={aoFechar}>
      <div className="space-y-4">
        <div>
          <label className="rotulo" htmlFor="nome-cat">Nome</label>
          <input id="nome-cat" autoFocus className="campo" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Escola das crianças" />
        </div>
        {!temFilhas && (
          <div>
            <label className="rotulo" htmlFor="mae-cat">Dentro de</label>
            <select id="mae-cat" className="campo" value={mae ?? ''} onChange={e => setMae(e.target.value || null)}>
              <option value="">— nenhuma (é uma categoria principal) —</option>
              {arvore.filter(a => a.mae.id !== inicial.id).map(a => <option key={a.mae.id} value={a.mae.id}>{a.mae.name}</option>)}
            </select>
          </div>
        )}
        {!ehSub && (
          <div>
            <label className="rotulo">Tipo</label>
            <Chips opcoes={TIPOS} valor={tipo} aoMudar={setTipo} />
            {tipo === 'transferencia' && <p className="mt-1 text-xs text-muted">Transferências não entram nos totais de gastos e receitas.</p>}
          </div>
        )}
        <div>
          <label className="rotulo">Ícone</label>
          <div className="grid grid-cols-8 gap-1.5">
            {Object.keys(ICONES).map(n => (
              <button
                key={n}
                onClick={() => setIcone(n)}
                className={`flex aspect-square items-center justify-center rounded-xl border ${icone === n ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted hover:text-fg'}`}
                aria-label={n}
              >
                <Icone nome={n} size={16} />
              </button>
            ))}
          </div>
        </div>
        {erro && <p className="text-xs text-negativo">{erro}</p>}
        <div className="flex gap-2">
          <Botao variante="secundario" className="flex-1" onClick={aoFechar}>Cancelar</Botao>
          <Botao className="flex-1" onClick={salvar}>Salvar</Botao>
        </div>
      </div>
    </Modal>
  )
}

const TIPO_CHAVE: Record<string, string> = { cnpj: 'Loja (CNPJ)', doc: 'Pessoa/empresa (Pix)', desc: 'Descrição' }

function Regras({ aviso }: { aviso: (m: string) => void }) {
  const { categoriaPorId } = useDados()
  const [regras, setRegras] = useState<Regra[] | null>(null)

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('category_rules').select('*').order('updated_at', { ascending: false })
    setRegras(data ?? [])
  }, [])
  useEffect(() => { carregar() }, [carregar])

  async function mudar(r: Regra, categoria: string | null) {
    if (!categoria) return
    await supabase.from('category_rules').update({ category_id: categoria, updated_at: new Date().toISOString() }).eq('key', r.key)
    // as transações que vieram desta regra acompanham a mudança
    await supabase.from('transactions').update({ category_id: categoria }).eq('rule_key', r.key).eq('category_source', 'regra')
    await carregar()
    aviso('Regra atualizada')
  }

  async function excluir(r: Regra) {
    if (!confirm(`Esquecer a regra de "${r.label}"? As transações já categorizadas continuam como estão.`)) return
    await supabase.from('category_rules').delete().eq('key', r.key)
    await carregar()
    aviso('Regra removida')
  }

  if (!regras) return <Carregando />
  if (!regras.length) {
    return (
      <Painel>
        <Vazio icone={<Sparkles size={28} />} titulo="O app ainda não aprendeu nada">
          Quando você muda a categoria de uma transação com "Lembrar desta escolha", ela aparece aqui — e as próximas compras iguais já chegam categorizadas.
        </Vazio>
      </Painel>
    )
  }

  return (
    <Painel className="divide-y divide-line overflow-hidden">
      {regras.map(r => {
        const cat = categoriaPorId.get(r.category_id)
        return (
          <div key={r.key} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">{r.label}</p>
              <p className="text-xs text-muted">{TIPO_CHAVE[r.key.split(':')[0]] ?? 'Regra'} · usada {r.hits} {r.hits === 1 ? 'vez' : 'vezes'} em sincronizações</p>
            </div>
            <SeletorCategoria valor={cat?.id ?? null} aoMudar={id => mudar(r, id)} className="campo w-auto max-w-[14rem] py-1.5 text-xs" />
            <button onClick={() => excluir(r)} className="rounded-lg p-2 text-muted hover:bg-negativo/10 hover:text-negativo" title="Esquecer regra"><Trash2 size={15} /></button>
          </div>
        )
      })}
    </Painel>
  )
}
