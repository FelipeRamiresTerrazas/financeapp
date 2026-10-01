import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, KeyRound, CheckCircle2, TriangleAlert, ExternalLink, EyeOff, Eye, Plus, Trash2, CreditCard, Landmark, LoaderCircle } from 'lucide-react'
import { Botao, Painel } from '../components/ui'
import { useDados } from '../lib/DadosContext'
import { brl, dataHora } from '../lib/formato'
import { supabase, type Conta, type Sincronizacao } from '../lib/supabase'

export default function Contas({ aviso }: { aviso: (m: string) => void }) {
  return (
    <div className="space-y-6">
      <h2 className="hidden text-xl font-bold text-fg md:block">Contas e conexões</h2>
      <ConexaoPluggy aviso={aviso} />
      <ContasECartoes aviso={aviso} />
      <Familia aviso={aviso} />
    </div>
  )
}

// ---------------------------------------------------------------------------

function ConexaoPluggy({ aviso }: { aviso: (m: string) => void }) {
  const { conexoes, recarregar } = useDados()
  const [configurado, setConfigurado] = useState<boolean | null>(null)
  const [editando, setEditando] = useState(false)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [sincronizando, setSincronizando] = useState(false)
  const [historico, setHistorico] = useState<Sincronizacao[]>([])

  const carregar = useCallback(async () => {
    const [{ data: ok }, { data: runs }] = await Promise.all([
      supabase.rpc('pluggy_credentials_configured'),
      supabase.from('sync_runs').select('*').order('id', { ascending: false }).limit(5),
    ])
    setConfigurado(!!ok)
    setHistorico(runs ?? [])
  }, [])
  useEffect(() => { carregar() }, [carregar])

  async function salvarCredenciais() {
    if (!clientId.trim() || !clientSecret.trim()) return aviso('Preencha o Client ID e o Client Secret')
    const { error } = await supabase.rpc('set_pluggy_credentials', { p_client_id: clientId.trim(), p_client_secret: clientSecret.trim() })
    if (error) return aviso(`Erro: ${error.message}`)
    setClientId('')
    setClientSecret('')
    setEditando(false)
    await carregar()
    aviso('Credenciais salvas no cofre do Supabase')
  }

  async function sincronizar() {
    setSincronizando(true)
    const { data, error } = await supabase.functions.invoke('pluggy-sync')
    setSincronizando(false)
    await Promise.all([carregar(), recarregar()])
    if (error) {
      let msg = error.message
      try { msg = (await (error as { context?: Response }).context?.json())?.erro ?? msg } catch { /* resposta sem JSON */ }
      return aviso(`Erro na sincronização: ${msg}`)
    }
    aviso(`Sincronizado: ${data.stats.novas} transações novas`)
  }

  const ultima = historico[0]

  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-fg">Open Finance (Pluggy)</h3>
      <Painel className="space-y-4 p-4">
        {configurado === false || editando ? (
          <div className="space-y-3">
            <Passos />
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="rotulo" htmlFor="cid">Client ID</label>
                <input id="cid" className="campo font-mono text-xs" value={clientId} onChange={e => setClientId(e.target.value)} autoComplete="off" />
              </div>
              <div>
                <label className="rotulo" htmlFor="csec">Client Secret</label>
                <input id="csec" type="password" className="campo font-mono text-xs" value={clientSecret} onChange={e => setClientSecret(e.target.value)} autoComplete="off" />
              </div>
            </div>
            <p className="text-xs text-muted">As credenciais ficam criptografadas no cofre (Vault) do seu Supabase e nunca voltam para o navegador.</p>
            <div className="flex gap-2">
              {editando && <Botao variante="secundario" onClick={() => setEditando(false)}>Cancelar</Botao>}
              <Botao onClick={salvarCredenciais}><KeyRound size={16} /> Salvar credenciais</Botao>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-medium text-fg">
                {ultima?.status === 'erro'
                  ? <><TriangleAlert size={16} className="text-negativo" /> Última sincronização falhou</>
                  : <><CheckCircle2 size={16} className="text-positivo" /> Conectado à Pluggy</>}
              </p>
              <p className="text-xs text-muted">
                {ultima ? `Última sincronização: ${dataHora(ultima.started_at)} (${ultima.trigger})` : 'Ainda não sincronizado'} · automática às 7h e 19h
              </p>
              {ultima?.status === 'erro' && <p className="mt-1 text-xs text-negativo">{ultima.message}</p>}
            </div>
            <Botao variante="fantasma" onClick={() => setEditando(true)}><KeyRound size={15} /> Trocar credenciais</Botao>
            <Botao onClick={sincronizar} disabled={sincronizando}>
              {sincronizando ? <LoaderCircle size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {sincronizando ? 'Sincronizando...' : 'Sincronizar agora'}
            </Botao>
          </div>
        )}
      </Painel>

      {conexoes.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {conexoes.map(c => {
            const ok = c.status === 'UPDATED'
            const consentimentoAcaba = c.consent_expires_at && new Date(c.consent_expires_at).getTime() - Date.now() < 30 * 86_400_000
            return (
              <Painel key={c.id} className="flex items-center gap-3 p-3">
                {c.connector_image_url
                  ? <img src={c.connector_image_url} alt="" className="h-9 w-9 rounded-xl bg-white object-contain p-1" />
                  : <div className="rounded-xl bg-surface-2 p-2 text-fg-2"><Landmark size={20} /></div>}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">{c.connector_name}</p>
                  <p className={`text-xs ${ok ? 'text-muted' : 'text-negativo'}`}>
                    {ok ? `Dados do banco de ${dataHora(c.last_updated_at)}` : `Status: ${c.status} ${c.execution_status ?? ''}`}
                  </p>
                  {consentimentoAcaba && <p className="text-xs text-negativo">Consentimento vence em {dataHora(c.consent_expires_at)} — renove no Meu Pluggy</p>}
                </div>
              </Painel>
            )
          })}
        </div>
      )}
    </section>
  )
}

function Passos() {
  const link = 'inline-flex items-center gap-0.5 font-medium text-brand hover:underline'
  return (
    <ol className="list-decimal space-y-1.5 pl-5 text-sm text-fg-2">
      <li>
        Crie sua conta grátis no <a className={link} href="https://meu.pluggy.ai" target="_blank" rel="noreferrer">Meu Pluggy <ExternalLink size={12} /></a> e conecte seus bancos pelo Open Finance (até 5, do mesmo titular).
      </li>
      <li>
        No <a className={link} href="https://dashboard.pluggy.ai" target="_blank" rel="noreferrer">Dashboard da Pluggy <ExternalLink size={12} /></a>, crie uma aplicação e copie o <strong>Client ID</strong> e o <strong>Client Secret</strong>.
      </li>
      <li>
        Ainda no Dashboard, clique em <strong>"Ir para Demo"</strong>, escolha o conector <strong>MeuPluggy</strong>, entre com a conta do passo 1 e autorize.
        <span className="block text-xs text-muted">Faça isso nos 15 dias de teste do Dashboard: depois, o que já foi conectado continua funcionando de graça, mas não dá para adicionar.</span>
      </li>
      <li>Cole as credenciais abaixo e clique em Sincronizar.</li>
    </ol>
  )
}

// ---------------------------------------------------------------------------

function ContasECartoes({ aviso }: { aviso: (m: string) => void }) {
  const { contas, cartoes, pessoas, conexoes, recarregar } = useDados()
  if (!contas.length) return null
  const banco = (c: Conta) => conexoes.find(x => x.id === c.item_id)?.connector_name

  async function atualizarConta(id: string, dados: Partial<Conta>) {
    const { error } = await supabase.from('accounts').update(dados).eq('id', id)
    if (error) return aviso(`Erro: ${error.message}`)
    await recarregar()
  }

  async function atualizarCartao(accountId: string, last4: string, dados: { person_id?: string | null; nickname?: string | null }) {
    const { error } = await supabase.from('cards').update(dados).eq('account_id', accountId).eq('last4', last4)
    if (error) return aviso(`Erro: ${error.message}`)
    await recarregar()
  }

  const seletorPessoa = (valor: string | null, aoMudar: (v: string | null) => void) => (
    <select className="campo w-auto py-1.5 text-xs" value={valor ?? ''} onChange={e => aoMudar(e.target.value || null)}>
      <option value="">De quem?</option>
      {pessoas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  )

  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-semibold text-fg">Contas e cartões</h3>
        <p className="text-sm text-muted">Diga de quem é cada conta e cartão (inclusive adicionais) para separar os gastos por pessoa.</p>
      </div>
      <Painel className="divide-y divide-line overflow-hidden">
        {contas.map(c => {
          const doCartao = cartoes.filter(k => k.account_id === c.id)
          return (
            <div key={c.id} className={`space-y-2 px-4 py-3 ${c.hidden ? 'opacity-50' : ''}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="rounded-xl bg-surface-2 p-2 text-fg-2">{c.type === 'CREDIT' ? <CreditCard size={18} /> : <Landmark size={18} />}</div>
                <div className="min-w-0 flex-1">
                  <input
                    className="w-full truncate bg-transparent text-sm font-medium text-fg focus:outline-none"
                    defaultValue={c.nickname || c.name}
                    onBlur={e => e.target.value !== (c.nickname || c.name) && atualizarConta(c.id, { nickname: e.target.value || null })}
                    aria-label="Nome da conta"
                  />
                  <p className="text-xs text-muted">
                    {banco(c)} · {c.type === 'CREDIT' ? 'Cartão de crédito' : 'Conta'}{c.owner ? ` · ${c.owner}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-fg">{brl(c.balance)}</p>
                  <p className="text-xs text-muted">
                    {c.type === 'CREDIT'
                      ? c.balance_due_date ? `fatura vence ${c.balance_due_date.split('-').reverse().slice(0, 2).join('/')}` : 'fatura atual'
                      : 'saldo'}
                  </p>
                </div>
                {seletorPessoa(c.person_id, v => atualizarConta(c.id, { person_id: v }))}
                <button onClick={() => atualizarConta(c.id, { hidden: !c.hidden })} className="rounded-lg p-2 text-muted hover:text-fg" title={c.hidden ? 'Mostrar' : 'Esconder do app'}>
                  {c.hidden ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
              </div>
              {doCartao.length > 0 && (
                <div className="ml-11 space-y-1.5">
                  {doCartao.map(k => (
                    <div key={k.last4} className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="w-24 text-muted">Cartão ·{k.last4}</span>
                      {seletorPessoa(k.person_id, v => atualizarCartao(c.id, k.last4, { person_id: v }))}
                      {!k.person_id && <span className="text-subtle">sem definição, usa o titular da conta</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </Painel>
    </section>
  )
}

// ---------------------------------------------------------------------------

function Familia({ aviso }: { aviso: (m: string) => void }) {
  const { pessoas, recarregar } = useDados()
  const [emails, setEmails] = useState<{ email: string; person_id: string | null }[]>([])
  const [novaPessoa, setNovaPessoa] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [pessoaEmail, setPessoaEmail] = useState('')

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('allowed_emails').select('email, person_id').order('email')
    setEmails(data ?? [])
  }, [])
  useEffect(() => { carregar() }, [carregar])

  async function adicionarPessoa() {
    if (!novaPessoa.trim()) return
    const { error } = await supabase.from('people').insert({ name: novaPessoa.trim() })
    if (error) return aviso(`Erro: ${error.message}`)
    setNovaPessoa('')
    await recarregar()
  }

  async function autorizar() {
    const email = novoEmail.trim().toLowerCase()
    if (!email.includes('@')) return aviso('Digite um e-mail válido')
    const { error } = await supabase.from('allowed_emails').upsert({ email, person_id: pessoaEmail || null })
    if (error) return aviso(`Erro: ${error.message}`)
    setNovoEmail('')
    await carregar()
    aviso(`${email} pode criar o acesso na tela de login`)
  }

  async function remover(email: string) {
    if (!confirm(`Remover a autorização de ${email}? A pessoa continua com acesso até você removê-la também do Supabase (Authentication).`)) return
    await supabase.from('allowed_emails').delete().eq('email', email)
    await carregar()
  }

  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-semibold text-fg">Família</h3>
        <p className="text-sm text-muted">Pessoas para separar os gastos e e-mails autorizados a entrar no app.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Painel className="space-y-3 p-4">
          <p className="text-sm font-medium text-fg">Pessoas</p>
          <div className="flex flex-wrap gap-1.5">
            {pessoas.map(p => <span key={p.id} className="rounded-full border border-line bg-surface-2 px-3 py-1 text-xs text-fg-2">{p.name}</span>)}
          </div>
          <div className="flex gap-2">
            <input className="campo py-1.5" placeholder="Nome" value={novaPessoa} onChange={e => setNovaPessoa(e.target.value)} />
            <Botao variante="secundario" onClick={adicionarPessoa}><Plus size={15} /></Botao>
          </div>
        </Painel>
        <Painel className="space-y-3 p-4">
          <p className="text-sm font-medium text-fg">Quem pode entrar</p>
          <div className="space-y-1.5">
            {emails.map(e => (
              <div key={e.email} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-fg-2">{e.email}</span>
                <span className="text-xs text-muted">{pessoas.find(p => p.id === e.person_id)?.name}</span>
                <button onClick={() => remover(e.email)} className="p-1 text-subtle hover:text-negativo" aria-label={`Remover ${e.email}`}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <input className="campo min-w-0 flex-1 py-1.5" type="email" placeholder="email@exemplo.com" value={novoEmail} onChange={e => setNovoEmail(e.target.value)} />
            <select className="campo w-auto py-1.5" value={pessoaEmail} onChange={e => setPessoaEmail(e.target.value)}>
              <option value="">Pessoa</option>
              {pessoas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <Botao variante="secundario" onClick={autorizar}><Plus size={15} /></Botao>
          </div>
        </Painel>
      </div>
    </section>
  )
}
