// Categorização automática de transações. Lógica pura (sem I/O), usada pela Edge Function
// pluggy-sync e pelos testes. A ordem de decisão é:
//   1. regra aprendida (o usuário já categorizou esse estabelecimento/destinatário antes)
//   2. sistema: pagamento de fatura e transferência entre contas da família (não são gasto)
//   3. categoria específica da Pluggy (derivada do CNPJ/CNAE do estabelecimento)
//   4. palavras-chave de estabelecimentos brasileiros
//   5. categoria genérica da Pluggy ("Housing", "Services") ou tipo de operação do banco
//   6. padrão: "Pix e transferências", "Pix recebido", "Diversos" ou "Outras receitas"

export type Origem = 'regra' | 'sistema' | 'pluggy' | 'palavra' | 'padrao'

export interface TransacaoParaCategorizar {
  description: string
  type: 'DEBIT' | 'CREDIT'
  accountType: 'BANK' | 'CREDIT'
  operationType?: string | null
  pluggyCategory?: string | null
  merchantCnpj?: string | null
  counterpartDocument?: string | null
}

export interface Categoria {
  id: string
  name: string
  parent_id: string | null
  system_key: string | null
}

export interface Contexto {
  // chave (cnpj:/doc:/desc:) -> category_id
  regras: Map<string, string>
  // CPFs/CNPJs dos titulares das contas conectadas (transferência entre eles não é gasto)
  documentosProprios: Set<string>
  categorias: Categoria[]
}

export interface Resultado {
  categoryId: string | null
  origem: Origem
}

export function normalizar(texto: string | null | undefined): string {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const soDigitos = (s: string | null | undefined) => (s || '').replace(/\D/g, '')

// Descrição sem números (parcelas, códigos de loja, datas): "RAIA353" e "RAIA2331" -> "raia"
export function chaveDescricao(descricao: string): string | null {
  const chave = normalizar(descricao).replace(/[0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
  return chave ? `desc:${chave}` : null
}

// Chave que identifica "a mesma compra": o CNPJ do estabelecimento é o mais confiável;
// em Pix/TED, o documento de quem recebe (ex.: a diarista); senão, a descrição limpa.
export function chaves(tx: Pick<TransacaoParaCategorizar, 'description' | 'merchantCnpj' | 'counterpartDocument'>) {
  const cnpj = soDigitos(tx.merchantCnpj)
  const doc = soDigitos(tx.counterpartDocument)
  const descKey = chaveDescricao(tx.description)
  const ruleKey = cnpj.length >= 11 ? `cnpj:${cnpj}` : doc.length >= 11 ? `doc:${doc}` : descKey
  return { ruleKey, descKey }
}

// ---------------------------------------------------------------------------

function indexar(categorias: Categoria[]) {
  const porId = new Map(categorias.map(c => [c.id, c]))
  const porCaminho = new Map<string, string>()
  const porSistema = new Map<string, string>()
  for (const c of categorias) {
    const mae = c.parent_id ? porId.get(c.parent_id) : null
    const caminho = mae ? `${mae.name}/${c.name}` : c.name
    porCaminho.set(normalizar(caminho), c.id)
    if (c.system_key) porSistema.set(c.system_key, c.id)
  }
  return {
    caminho: (p: string) => porCaminho.get(normalizar(p)) ?? null,
    sistema: (k: string) => porSistema.get(k) ?? null,
  }
}

// Categorias da Pluggy (descrição em inglês) -> caminho nas nossas categorias
const PLUGGY_PARA_CAMINHO: [RegExp, string][] = [
  [/^groceries/, 'Alimentação/Mercado'],
  [/^eating out/, 'Alimentação/Restaurantes'],
  [/^food delivery/, 'Alimentação/Delivery'],
  [/^food and drinks/, 'Alimentação/Restaurantes'],
  [/^gas stations/, 'Transporte/Combustível'],
  [/^taxi and ride/, 'Transporte/App de transporte'],
  [/^(parking|tolls)/, 'Transporte/Estacionamento e pedágio'],
  [/^public transportation/, 'Transporte/Transporte público'],
  [/^vehicle maintenance/, 'Transporte/Manutenção do carro'],
  [/^(vehicle ownership|vehicle insurance|traffic tickets)/, 'Transporte/IPVA, seguro e licenciamento'],
  [/^car rental/, 'Lazer e viagens/Viagens e hospedagem'],
  [/^pharmacy/, 'Saúde/Farmácia'],
  [/^health insurance/, 'Saúde/Plano de saúde'],
  [/^(hospital|optometry|healthcare)/, 'Saúde/Médicos e exames'],
  [/^dentist/, 'Saúde/Dentista'],
  [/^(gyms|sports practice|wellness)/, 'Saúde/Academia e esportes'],
  [/^(school|kindergarten)/, 'Educação/Escola'],
  [/^(university|online courses|education)/, 'Educação/Cursos e idiomas'],
  [/^bookstore/, 'Educação/Livros'],
  [/^office supplies/, 'Educação/Material escolar'],
  [/^clothing/, 'Compras/Roupas e calçados'],
  [/^electronics/, 'Compras/Eletrônicos'],
  [/^online shopping/, 'Compras/Compras online'],
  [/^(kids and toys|sports goods)/, 'Compras/Utilidades'],
  [/^pet supplies/, 'Pets/Pet shop'],
  [/^(video streaming|music streaming)/, 'Assinaturas e serviços/Streaming'],
  [/^digital services/, 'Assinaturas e serviços/Apps e software'],
  [/^gaming/, 'Lazer e viagens/Jogos'],
  [/^(telecommunications|internet|mobile|tv)$/, 'Moradia/Internet, TV e telefone'],
  [/^rent/, 'Moradia/Aluguel e financiamento'],
  [/^electricity/, 'Moradia/Energia'],
  [/^water/, 'Moradia/Água'],
  [/^gas$/, 'Moradia/Gás'],
  [/^houseware/, 'Moradia/Casa e decoração'],
  [/^(travel|accomodation|accommodation|mileage)/, 'Lazer e viagens/Viagens e hospedagem'],
  [/^(airport|bus tickets)/, 'Lazer e viagens/Passagens'],
  [/^(tickets|cinema|stadiums|landmarks|leisure)/, 'Lazer e viagens/Cinema e eventos'],
  [/^(bank fees|account fees|wire transfer fees|credit card fees)/, 'Impostos e taxas/Tarifas bancárias'],
  [/^(interests charged|late payment|tax on financial operations)/, 'Impostos e taxas/Juros e IOF'],
  [/^(taxes|income taxes|urban land)/, 'Impostos e taxas/Impostos'],
  [/^real estate financing/, 'Empréstimos e financiamentos/Financiamento imobiliário'],
  [/^(loans|financing|vehicle financing|student loan)/, 'Empréstimos e financiamentos/Empréstimos'],
  [/^donations/, 'Outros/Doações'],
  [/^(salary|retirement)/, 'Receitas/Salário'],
  [/^entrepreneurial/, 'Receitas/Pró-labore e empresa'],
  [/^proceeds interests/, 'Receitas/Rendimentos'],
  [/^cashback/, 'Receitas/Reembolsos e estornos'],
  [/^(investments|automatic investment|fixed income|mutual funds|variable income|pension|margin)/, 'Transferências/Aplicações e resgates'],
]

// Categorias genéricas da Pluggy: só valem se as palavras-chave não acharem nada mais específico
// (ex.: "Services" cobre de DAS-Simples Nacional a conveniência)
const PLUGGY_GENERICA: [RegExp, string][] = [
  [/^housing/, 'Moradia'],
  [/^services/, 'Assinaturas e serviços'],
  [/^shopping/, 'Compras/Utilidades'],
]

// Palavras-chave já normalizadas. As curtas (< 6 letras) casam com o início de uma palavra
// ("uber" pega "DL*UBERRIDES"); as longas casam em qualquer ponto, porque as faturas grudam e
// cortam os nomes ("PLANOBBEBIDAS", "FILIAL279DROGAL"). Vence a palavra-chave mais longa.
const PALAVRAS: [string, string[]][] = [
  ['Alimentação/Delivery', ['ifood', 'ifd', 'rappi', 'ze delivery', 'aiqfome']],
  ['Alimentação/Restaurantes', ['restaura', 'rest ', 'lanchon', 'lanches', 'burger', 'hamburgue', 'mcdonalds', 'mc donalds', 'outback', 'pizza', 'sushi', 'habibs', 'spoleto', 'giraffas', 'churrascaria', 'bobs', 'subway', 'coco bambu', 'madero', 'sorveteria', 'baguet']],
  ['Alimentação/Padaria e café', ['padaria', 'panificadora', 'cafe', 'cafeteria', 'starbucks', 'doceria', 'confeitaria']],
  ['Alimentação/Bares', ['bar e', 'boteco', 'bebidas', 'cervejaria', 'adega']],
  ['Alimentação/Mercado', ['supermerc', 'mercado ', 'mercadinho', 'mercearia', 'carrefour', 'pao de acucar', 'assai', 'atacad', 'sams club', 'hortifruti', 'varejao', 'st marche', 'oba hortifruti', 'swift', 'sonda', 'emporio', 'hirota', 'quitanda', 'acougue', 'convenien', 'jau serve']],
  ['Transporte/App de transporte', ['uber', '99app', '99 pop', '99pop', '99 tecnologia', 'cabify', 'taxi']],
  ['Transporte/Transporte público', ['metro', 'cptm', 'sptrans', 'bilhete unico', 'viacao']],
  ['Transporte/Estacionamento e pedágio', ['estacionamento', 'estapar', 'zona azul', 'sem parar', 'semparar', 'conectcar', 'veloe', 'pedagio']],
  ['Transporte/Combustível', ['posto', 'auto posto', 'shell', 'ipiranga', 'petrobras', 'br mania', 'combustive', 'raizen']],
  ['Saúde/Farmácia', ['drogasil', 'droga raia', 'raia', 'drogaria', 'drogal', 'farmacia', 'pague menos', 'panvel', 'drogao']],
  ['Saúde/Médicos e exames', ['hospital', 'laboratorio', 'clinica', 'fleury', 'dasa', 'medico', 'consultorio']],
  ['Saúde/Dentista', ['odonto']],
  ['Saúde/Plano de saúde', ['unimed', 'sulamerica', 'sul america', 'bradesco saude', 'amil', 'hapvida']],
  ['Saúde/Academia e esportes', ['academia', 'gym', 'musclefit', 'smart fit', 'smartfit', 'bluefit', 'gympass', 'wellhub', 'totalpass']],
  ['Assinaturas e serviços/Streaming', ['netflix', 'spotify', 'amazon prime', 'prime video', 'amazonprime', 'disney', 'hbo', 'globoplay', 'youtube', 'deezer', 'paramount', 'crunchyroll', 'mubi', 'tidal']],
  ['Assinaturas e serviços/Apps e software', ['apple com', 'icloud', 'google one', 'google storage', 'chatgpt', 'openai', 'anthropic', 'claude ai', 'microsoft', 'adobe', 'canva', 'dropbox', 'patreon', 'linkedin', 'melimais']],
  ['Assinaturas e serviços/Serviços profissionais', ['contabil', 'advocacia', 'lavanderia']],
  ['Assinaturas e serviços/Beleza e cuidados', ['salao', 'beleza', 'barbearia', 'cabeleirei', 'manicure', 'estetica']],
  ['Compras/Compras online', ['amazon', 'amzn', 'mercadolivre', 'mercado livre', 'mercadolibre', 'shopee', 'temu', 'aliexpress', 'shein', 'magalu', 'magazine luiza', 'americanas']],
  ['Compras/Roupas e calçados', ['renner', 'riachuelo', 'cea ', 'zara', 'centauro', 'netshoes', 'nike', 'adidas', 'havaianas', 'hering', 'lupo', 'moda', 'fashion']],
  ['Compras/Eletrônicos', ['kabum', 'fast shop', 'casas bahia', 'ponto frio']],
  ['Compras/Utilidades', ['decathlon', 'esportes', 'daiso', 'precolandia', 'lojao', 'tok stok', 'tokstok']],
  ['Moradia/Energia', ['enel', 'light s', 'cemig', 'copel', 'cpfl', 'energisa']],
  ['Moradia/Água', ['sabesp', 'sanepar', 'semae', 'saae']],
  ['Moradia/Gás', ['comgas', 'naturgy', 'ultragaz', 'liquigas']],
  ['Moradia/Internet, TV e telefone', ['vivo', 'claro', 'tim celular', 'telefonica', 'desktop', 'sky ', 'oi fibra']],
  ['Moradia/Manutenção e reforma', ['leroy', 'telhanorte', 'obramax', 'gmad', 'marmores', 'madeireira', 'madeiras', 'ferragens', 'construcao', 'material de constr']],
  ['Moradia/Aluguel e financiamento', ['habitacao', 'aluguel', 'imobiliaria']],
  ['Moradia/Condomínio', ['condominio']],
  ['Educação/Escola', ['escola', 'colegio']],
  ['Educação/Cursos e idiomas', ['curso', 'udemy', 'alura', 'faculdade', 'universidade', 'cultura inglesa', 'wizard', 'fisk', 'duolingo', 'coursera']],
  ['Educação/Material escolar', ['papelaria', 'kalunga']],
  ['Educação/Livros', ['livraria', 'saraiva']],
  ['Lazer e viagens/Viagens e hospedagem', ['airbnb', 'booking', 'hotel', 'pousada', 'decolar', '123milhas']],
  ['Lazer e viagens/Passagens', ['latam', 'gol linhas', 'azul linhas', 'azul viagens']],
  ['Lazer e viagens/Cinema e eventos', ['cinema', 'cinemark', 'kinoplex', 'ingresso', 'sympla', 'eventim', 'eventos', 'teatro', 'clube']],
  ['Lazer e viagens/Jogos', ['steam', 'playstation', 'xbox', 'nintendo']],
  ['Pets/Pet shop', ['petz', 'cobasi', 'petshop', 'pet shop', 'petlove']],
  ['Pets/Veterinário', ['veterinari']],
  ['Impostos e taxas/Anuidade', ['anuidade']],
  ['Impostos e taxas/Juros e IOF', ['iof', 'juros', 'encargos', 'multa']],
  ['Impostos e taxas/Tarifas bancárias', ['tarifa', 'cesta de servicos', 'pacote de servicos']],
  ['Impostos e taxas/Impostos', ['das simples', 'simples nacional', 'darf', 'receita fed', 'pref mun', 'prefeitura', 'municipio de', 'dgfin', 'iptu']],
]

function porPalavraChave(tx: TransacaoParaCategorizar): string | null {
  // no cartão, "PIX <nome> 04/10" é parcela de Pix no crédito
  if (tx.accountType === 'CREDIT' && tx.type === 'DEBIT' && /^pix\b/.test(normalizar(tx.description))) {
    return 'Empréstimos e financiamentos/Pix no crédito'
  }
  const n = normalizar(tx.description)
  const texto = ` ${n} ${n.replace(/[0-9]+/g, ' ').replace(/\s+/g, ' ')} `
  let melhor: { caminho: string; tamanho: number } | null = null
  for (const [caminho, palavras] of PALAVRAS) {
    for (const p of palavras) {
      const casou = p.length >= 6 ? texto.includes(p) : texto.includes(' ' + p)
      if (casou && (!melhor || p.length > melhor.tamanho)) melhor = { caminho, tamanho: p.length }
    }
  }
  return melhor?.caminho ?? null
}

const RE_PAGAMENTO_FATURA = /\b(pagamento|pagto|pgto|pag) (de |da )?fatura\b|\bfatura (do )?cartao\b|\bpagamento (de |do )?cartao\b|\bpagamento recebido\b/
// "Débito automático Fatura Itau Person Vs Infin": fatura + nome de banco/bandeira (e não "fatura Claro")
const RE_FATURA_DE_CARTAO = /\bfatura\b.*\b(cartao|itau|person|personnalite|visa|master|mastercard|elo|nubank|santander|bradesco|inter|c6|porto)\b/

function sistema(tx: TransacaoParaCategorizar, ctx: Contexto): string | null {
  const desc = normalizar(tx.description)
  const pluggy = normalizar(tx.pluggyCategory)
  // no cartão: o crédito que quita a fatura ("PAGAMENTO COM SALDO", "PAGAMENTO DEBITO AUTOMATICO")
  if (tx.accountType === 'CREDIT' && tx.type === 'CREDIT' && (
    tx.operationType === 'PAGAMENTO_FATURA' || RE_PAGAMENTO_FATURA.test(desc) ||
    /^(pagamento|pagto|pgto)\b/.test(desc) || /^transfer internal/.test(pluggy)
  )) {
    return 'pagamento_fatura'
  }
  // na conta: o débito que paga a fatura
  if (tx.accountType === 'BANK' && tx.type === 'DEBIT' && (RE_PAGAMENTO_FATURA.test(desc) || RE_FATURA_DE_CARTAO.test(desc))) {
    return 'pagamento_fatura'
  }
  // Pix no crédito: o gasto são as parcelas no cartão. Na conta, o "Crédito liberado para Pix" e o
  // "Pix enviado com cartão" do mesmo dia só passam o dinheiro adiante — contá-los dobraria o gasto
  if (tx.accountType === 'BANK' && tx.type === 'CREDIT' && /\bcredito liberado\b/.test(desc)) return 'pix_credito'
  if (tx.accountType === 'BANK' && tx.type === 'DEBIT' && /^pix enviado com cartao\b/.test(desc)) return 'pix_credito'
  const doc = soDigitos(tx.counterpartDocument)
  if (doc && ctx.documentosProprios.has(doc)) return 'transferencia_propria'
  if (/^same person transfer/.test(normalizar(tx.pluggyCategory))) return 'transferencia_propria'
  if (/^credit card payment/.test(normalizar(tx.pluggyCategory))) return 'pagamento_fatura'
  return null
}

function porPluggy(tx: TransacaoParaCategorizar, tabela: [RegExp, string][]): string | null {
  const cat = normalizar(tx.pluggyCategory)
  if (!cat) return null
  return tabela.find(([re]) => re.test(cat))?.[1] ?? null
}

// Última tentativa antes do padrão: categoria genérica da Pluggy ou o tipo de operação do banco
function porGenerico(tx: TransacaoParaCategorizar): string | null {
  if (tx.type === 'DEBIT' && tx.operationType === 'OPERACAO_CREDITO') return 'Empréstimos e financiamentos/Empréstimos'
  return porPluggy(tx, PLUGGY_GENERICA)
}

// Pix/TED só faz sentido na conta; no cartão a Pluggy às vezes chama compras parceladas de "Transfers"
const ehTransferencia = (tx: TransacaoParaCategorizar) =>
  tx.accountType === 'BANK' && (
    /^(transfer|third party|same person)/.test(normalizar(tx.pluggyCategory)) ||
    /^(PIX|TED|DOC|TRANSFERENCIA)/i.test(tx.operationType || '')
  )

// Indexa as categorias uma vez e devolve a função que categoriza cada transação
export function criarCategorizador(ctx: Contexto) {
  const idx = indexar(ctx.categorias)
  return (tx: TransacaoParaCategorizar) => categorizarComIndice(tx, ctx, idx)
}

function categorizarComIndice(tx: TransacaoParaCategorizar, ctx: Contexto, idx: ReturnType<typeof indexar>): Resultado {
  const { ruleKey, descKey } = chaves(tx)
  const regra = (ruleKey && ctx.regras.get(ruleKey)) || (descKey && ctx.regras.get(descKey))
  if (regra) return { categoryId: regra, origem: 'regra' }

  const chaveSistema = sistema(tx, ctx)
  const idSistema = chaveSistema && idx.sistema(chaveSistema)
  if (idSistema) return { categoryId: idSistema, origem: 'sistema' }

  const caminhoPluggy = porPluggy(tx, PLUGGY_PARA_CAMINHO)
  const idPluggy = caminhoPluggy && idx.caminho(caminhoPluggy)
  if (idPluggy) return { categoryId: idPluggy, origem: 'pluggy' }

  const caminhoPalavra = porPalavraChave(tx)
  const idPalavra = caminhoPalavra && idx.caminho(caminhoPalavra)
  if (idPalavra) return { categoryId: idPalavra, origem: 'palavra' }

  const caminhoGenerico = porGenerico(tx)
  const idGenerico = caminhoGenerico && idx.caminho(caminhoGenerico)
  if (idGenerico) return { categoryId: idGenerico, origem: 'pluggy' }

  const entrada = tx.type === 'CREDIT'
  const padrao = ehTransferencia(tx)
    ? (entrada ? 'pix_recebido' : 'pix_enviado')
    : entrada
      ? (tx.accountType === 'CREDIT' ? 'estornos' : 'outras_receitas')
      : 'outros'
  return { categoryId: idx.sistema(padrao), origem: 'padrao' }
}
