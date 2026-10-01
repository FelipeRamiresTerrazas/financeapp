// Sincroniza contas e transações da Pluggy (Meu Pluggy / Open Finance) com o banco do app.
// Chamada pelo app ("Sincronizar agora", com o login do usuário) ou pelo agendamento diário
// (pg_cron, com o header x-cron-secret guardado no Vault).

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { Pluggy, type PluggyAccount } from './pluggy.ts'
import { contaParaLinha, transacaoParaLinha, type LinhaTransacao } from './transformar.ts'
import { criarCategorizador, normalizar, type Categoria } from './categorizacao.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

// Open Finance devolve até 12 meses; nas sincronizações seguintes, relê uma janela para trás
// para pegar compras pendentes que mudaram e lançamentos que chegaram atrasados.
const HISTORICO_INICIAL_DIAS = 365
const JANELA_RELEITURA_DIAS = 40

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const diasAtras = (base: Date, dias: number) => new Date(base.getTime() - dias * 86_400_000).toISOString().slice(0, 10)

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // --- quem está chamando ---
  let gatilho: 'manual' | 'agendado'
  const segredoCron = req.headers.get('x-cron-secret')
  if (segredoCron) {
    const { data: ok } = await admin.rpc('check_cron_secret', { p_secret: segredoCron })
    if (!ok) return json({ erro: 'não autorizado' }, 401)
    gatilho = 'agendado'
  } else {
    const usuario = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: membro } = await usuario.rpc('is_member')
    if (!membro) return json({ erro: 'não autorizado' }, 401)
    gatilho = 'manual'
  }

  // evita duas sincronizações ao mesmo tempo
  const { data: emAndamento } = await admin
    .from('sync_runs').select('id')
    .eq('status', 'rodando').gt('started_at', new Date(Date.now() - 10 * 60_000).toISOString())
    .limit(1)
  if (emAndamento?.length) return json({ erro: 'Já existe uma sincronização em andamento.' }, 409)

  const { data: run } = await admin.from('sync_runs').insert({ trigger: gatilho }).select('id').single()

  try {
    const stats = await sincronizar(admin)
    await admin.from('sync_runs')
      .update({ status: 'ok', finished_at: new Date().toISOString(), stats })
      .eq('id', run!.id)
    return json({ ok: true, stats })
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : String(e)
    console.error(e)
    await admin.from('sync_runs')
      .update({ status: 'erro', finished_at: new Date().toISOString(), message: mensagem })
      .eq('id', run!.id)
    return json({ erro: mensagem }, 500)
  }
})

async function sincronizar(db: SupabaseClient) {
  const { data: cred } = await db.rpc('get_pluggy_credentials').single<{ client_id: string; client_secret: string }>()
  if (!cred?.client_id || !cred?.client_secret) {
    throw new Error('Credenciais da Pluggy não configuradas. Cadastre o Client ID e o Client Secret em Contas.')
  }
  const pluggy = await Pluggy.conectar(cred.client_id, cred.client_secret)
  const agora = new Date()
  const stats = { conexoes: 0, contas: 0, novas: 0, atualizadas: 0, removidasPendentes: 0 }

  // --- conexões e contas ---
  const itens = await pluggy.itens()
  stats.conexoes = itens.length
  if (itens.length) {
    await upsert(db, 'pluggy_items', itens.map(i => ({
      id: i.id,
      connector_name: i.connector?.name ?? null,
      connector_image_url: i.connector?.imageUrl ?? null,
      connector_color: i.connector?.primaryColor ?? null,
      status: i.status,
      execution_status: i.executionStatus,
      last_updated_at: i.lastUpdatedAt,
      consent_expires_at: i.consentExpiresAt ?? null,
      synced_at: agora.toISOString(),
      updated_at: agora.toISOString(),
    })))
  }

  const contas: PluggyAccount[] = []
  for (const item of itens) contas.push(...await pluggy.contas(item.id))
  stats.contas = contas.length
  if (contas.length) await upsert(db, 'accounts', contas.map(contaParaLinha))
  await atribuirPessoas(db)

  // --- contexto da categorização ---
  const [{ data: categorias }, { data: regras }, { data: docs }] = await Promise.all([
    db.from('categories').select('id, name, parent_id, system_key'),
    db.from('category_rules').select('key, category_id'),
    db.from('accounts').select('tax_number').not('tax_number', 'is', null),
  ])
  const categorizar = criarCategorizador({
    categorias: (categorias ?? []) as Categoria[],
    regras: new Map((regras ?? []).map(r => [r.key, r.category_id])),
    documentosProprios: new Set((docs ?? []).map(d => d.tax_number)),
  })
  const usoDeRegras = new Map<string, number>()

  // --- transações, conta a conta ---
  for (const conta of contas) {
    const { data: ultima } = await db.from('transactions')
      .select('date').eq('account_id', conta.id).order('date', { ascending: false }).limit(1)
    const desde = ultima?.length
      ? diasAtras(new Date(ultima[0].date), JANELA_RELEITURA_DIAS)
      : diasAtras(agora, HISTORICO_INICIAL_DIAS)

    const linhas = (await pluggy.transacoes(conta.id, desde)).map(t => transacaoParaLinha(t, conta))
    const existentes = await categoriasExistentes(db, linhas.map(l => l.id))

    // Mantém a categoria já definida; só (re)categoriza o que é novo ou ficou no padrão.
    // Os dois grupos vão em upserts separados: num lote misto o Supabase usa a união das
    // colunas e apagaria a categoria das linhas que não a enviaram.
    const manter = (l: LinhaTransacao) => {
      const atual = existentes.get(l.id)
      return !!atual?.category_source && atual.category_source !== 'padrao'
    }
    const semMudarCategoria = linhas.filter(manter)
    const categorizadas = linhas.filter(l => !manter(l)).map(l => {
      const r = categorizar({
        description: l.description,
        type: l.type as 'DEBIT' | 'CREDIT',
        accountType: conta.type,
        operationType: l.operation_type,
        pluggyCategory: l.pluggy_category,
        merchantCnpj: l.merchant_cnpj,
        counterpartDocument: l.counterpart_document,
      })
      if (r.origem === 'regra' && l.rule_key) usoDeRegras.set(l.rule_key, (usoDeRegras.get(l.rule_key) ?? 0) + 1)
      return { ...l, category_id: r.categoryId, category_source: r.origem }
    })

    stats.novas += linhas.filter(l => !existentes.has(l.id)).length
    stats.atualizadas += linhas.filter(l => existentes.has(l.id)).length
    await upsert(db, 'transactions', semMudarCategoria)
    await upsert(db, 'transactions', categorizadas)
    await registrarCartoes(db, conta.id, linhas)

    // compras pendentes que sumiram (canceladas ou que viraram outro lançamento ao fechar a fatura)
    const ids = new Set(linhas.map(l => l.id))
    const { data: pendentes } = await db.from('transactions')
      .select('id').eq('account_id', conta.id).eq('status', 'PENDING').gte('date', desde)
    const sumiram = (pendentes ?? []).filter(p => !ids.has(p.id)).map(p => p.id)
    if (sumiram.length) {
      await db.from('transactions').delete().in('id', sumiram)
      stats.removidasPendentes += sumiram.length
    }
  }

  for (const [key, n] of usoDeRegras) {
    const { data } = await db.from('category_rules').select('hits').eq('key', key).single()
    if (data) await db.from('category_rules').update({ hits: data.hits + n }).eq('key', key)
  }

  return stats
}

async function upsert(db: SupabaseClient, tabela: string, linhas: Record<string, unknown>[]) {
  for (let i = 0; i < linhas.length; i += 500) {
    const { error } = await db.from(tabela).upsert(linhas.slice(i, i + 500))
    if (error) throw new Error(`Erro gravando ${tabela}: ${error.message}`)
  }
}

async function categoriasExistentes(db: SupabaseClient, ids: string[]) {
  const mapa = new Map<string, { category_source: string | null }>()
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db.from('transactions').select('id, category_source').in('id', ids.slice(i, i + 200))
    for (const t of data ?? []) mapa.set(t.id, t)
  }
  return mapa
}

async function registrarCartoes(db: SupabaseClient, accountId: string, linhas: LinhaTransacao[]) {
  const finais = [...new Set(linhas.map(l => l.card_last4).filter(Boolean))] as string[]
  if (!finais.length) return
  await db.from('cards').upsert(finais.map(last4 => ({ account_id: accountId, last4 })), { ignoreDuplicates: true })
}

// Conta nova sem pessoa: tenta pelo nome do titular ("FELIPE RAMIRES..." -> Felipe)
async function atribuirPessoas(db: SupabaseClient) {
  const [{ data: pessoas }, { data: semPessoa }] = await Promise.all([
    db.from('people').select('id, name'),
    db.from('accounts').select('id, owner').is('person_id', null),
  ])
  for (const conta of semPessoa ?? []) {
    const dono = normalizar(conta.owner)
    const pessoa = (pessoas ?? []).find(p => dono && dono.startsWith(normalizar(p.name)))
    if (pessoa) await db.from('accounts').update({ person_id: pessoa.id }).eq('id', conta.id)
  }
}
