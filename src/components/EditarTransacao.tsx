import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Botao, Modal, SeletorCategoria } from './ui'
import { brl, diaPorExtenso } from '../lib/formato'
import { supabase, type Transacao } from '../lib/supabase'
import { definirCategoria } from '../lib/transacoes'

const ORIGEM: Record<string, string> = {
  manual: 'definida por você',
  regra: 'aprendida com suas escolhas anteriores',
  sistema: 'reconhecida como transferência/pagamento de fatura',
  pluggy: 'sugerida pelo Open Finance (CNPJ da loja)',
  palavra: 'reconhecida pelo nome da loja',
  padrao: 'não reconhecida — revise',
}

export default function EditarTransacao({ transacao, aoFechar, aoSalvar }: {
  transacao: Transacao
  aoFechar: () => void
  aoSalvar: (mensagem: string) => void
}) {
  const [categoria, setCategoria] = useState(transacao.category_id)
  const [aprender, setAprender] = useState(true)
  const [notas, setNotas] = useState(transacao.notes ?? '')
  const [ignorar, setIgnorar] = useState(transacao.ignored)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const quem = transacao.merchant_name || transacao.counterpart_name

  async function salvar() {
    setSalvando(true)
    setErro('')
    try {
      let mensagem = 'Transação atualizada'
      if (categoria !== transacao.category_id) {
        const afetadas = await definirCategoria(transacao.id, categoria, aprender)
        mensagem = aprender && afetadas > 1
          ? `Categoria aplicada a ${afetadas} transações — as próximas já virão assim`
          : aprender ? 'Categoria salva — as próximas iguais já virão assim' : 'Categoria salva'
      }
      if (notas !== (transacao.notes ?? '') || ignorar !== transacao.ignored) {
        const { error } = await supabase.from('transactions').update({ notes: notas || null, ignored: ignorar }).eq('id', transacao.id)
        if (error) throw error
      }
      aoSalvar(mensagem)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar')
      setSalvando(false)
    }
  }

  return (
    <Modal titulo="Transação" aoFechar={aoFechar}>
      <div className="space-y-4">
        <div className="rounded-2xl bg-surface-2 p-4">
          <p className={`text-2xl font-bold ${transacao.amount > 0 ? 'text-positivo' : 'text-fg'}`}>{brl(transacao.amount)}</p>
          <p className="mt-1 text-sm font-medium text-fg">{transacao.description}</p>
          {quem && quem !== transacao.description && <p className="text-xs text-muted">{quem}</p>}
          <p className="mt-2 text-xs capitalize text-muted">
            {diaPorExtenso(transacao.date)} · {transacao.account_name}
            {transacao.card_last4 && ` · cartão final ${transacao.card_last4}`}
            {transacao.total_installments && transacao.total_installments > 1 && ` · parcela ${transacao.installment_number}/${transacao.total_installments}`}
            {transacao.status === 'PENDING' && ' · pendente'}
          </p>
        </div>

        <div>
          <label className="rotulo">Categoria</label>
          <SeletorCategoria valor={categoria} aoMudar={setCategoria} />
          {transacao.category_source && categoria === transacao.category_id && (
            <p className="mt-1 text-xs text-subtle">Categoria {ORIGEM[transacao.category_source]}</p>
          )}
        </div>

        {categoria !== transacao.category_id && (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl border border-brand/30 bg-brand/5 p-3">
            <input type="checkbox" checked={aprender} onChange={e => setAprender(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[rgb(var(--brand))]" />
            <span className="text-sm text-fg-2">
              <span className="flex items-center gap-1 font-medium text-fg"><Sparkles size={14} className="text-brand" /> Lembrar desta escolha</span>
              Aplica a mesma categoria às transações parecidas{quem ? ` de ${quem}` : ''} e às próximas que chegarem.
            </span>
          </label>
        )}

        <div>
          <label className="rotulo" htmlFor="notas">Anotação</label>
          <input id="notas" className="campo" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Opcional" />
        </div>

        <label className="flex cursor-pointer items-center gap-2.5">
          <input type="checkbox" checked={ignorar} onChange={e => setIgnorar(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--brand))]" />
          <span className="text-sm text-fg-2">Ignorar nos totais e gráficos</span>
        </label>

        {erro && <p className="text-xs text-negativo">{erro}</p>}
        <div className="flex gap-2 pt-1">
          <Botao variante="secundario" className="flex-1" onClick={aoFechar}>Cancelar</Botao>
          <Botao className="flex-1" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Botao>
        </div>
      </div>
    </Modal>
  )
}
