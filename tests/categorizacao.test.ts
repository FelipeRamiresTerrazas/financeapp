import { describe, expect, it } from 'vitest'
import { chaves, criarCategorizador, type Categoria, type TransacaoParaCategorizar } from '../supabase/functions/pluggy-sync/categorizacao.ts'
import { transacaoParaLinha } from '../supabase/functions/pluggy-sync/transformar.ts'

// Mesma árvore da migration de categorias padrão; o id é o próprio caminho, para ler os testes
const ARVORE: Record<string, string[]> = {
  Moradia: ['Aluguel e financiamento', 'Condomínio', 'Energia', 'Água', 'Gás', 'Internet, TV e telefone', 'Manutenção e reforma', 'Casa e decoração'],
  Alimentação: ['Mercado', 'Restaurantes', 'Delivery', 'Padaria e café', 'Bares'],
  Transporte: ['Combustível', 'App de transporte', 'Estacionamento e pedágio', 'Transporte público', 'Manutenção do carro', 'IPVA, seguro e licenciamento'],
  Saúde: ['Farmácia', 'Plano de saúde', 'Médicos e exames', 'Dentista', 'Academia e esportes'],
  Educação: ['Escola', 'Cursos e idiomas', 'Material escolar', 'Livros'],
  Compras: ['Roupas e calçados', 'Eletrônicos', 'Compras online', 'Presentes', 'Utilidades'],
  'Lazer e viagens': ['Viagens e hospedagem', 'Passagens', 'Cinema e eventos', 'Jogos', 'Hobbies'],
  'Assinaturas e serviços': ['Streaming', 'Apps e software', 'Serviços profissionais', 'Beleza e cuidados'],
  Pets: ['Pet shop', 'Veterinário'],
  'Impostos e taxas': ['Tarifas bancárias', 'Juros e IOF', 'Anuidade', 'Impostos'],
  'Empréstimos e financiamentos': ['Pix no crédito', 'Empréstimos', 'Financiamento imobiliário', 'Parcelamento de fatura'],
  Outros: ['Pix e transferências', 'Saques', 'Doações', 'Diversos'],
  Receitas: ['Salário', 'Pró-labore e empresa', 'Rendimentos', 'Reembolsos e estornos', 'Pix recebido', 'Outras receitas'],
  Transferências: ['Pagamento de fatura', 'Entre contas próprias', 'Aplicações e resgates'],
}
const SISTEMA: Record<string, string> = {
  'Transferências/Pagamento de fatura': 'pagamento_fatura',
  'Transferências/Entre contas próprias': 'transferencia_propria',
  'Transferências/Aplicações e resgates': 'investimentos',
  'Outros/Diversos': 'outros',
  'Outros/Pix e transferências': 'pix_enviado',
  'Receitas/Outras receitas': 'outras_receitas',
  'Receitas/Pix recebido': 'pix_recebido',
  'Receitas/Reembolsos e estornos': 'estornos',
}
const CATEGORIAS: Categoria[] = Object.entries(ARVORE).flatMap(([mae, subs]) => [
  { id: mae, name: mae, parent_id: null, system_key: null },
  ...subs.map(s => ({ id: `${mae}/${s}`, name: s, parent_id: mae, system_key: SISTEMA[`${mae}/${s}`] ?? null })),
])

const CPF_FELIPE = '12345678900'
const CPF_DAY = '98765432100'

function categorizador(regras: Record<string, string> = {}) {
  return criarCategorizador({
    categorias: CATEGORIAS,
    regras: new Map(Object.entries(regras)),
    documentosProprios: new Set([CPF_FELIPE, CPF_DAY]),
  })
}

const compraCartao = (description: string, extra: Partial<TransacaoParaCategorizar> = {}): TransacaoParaCategorizar =>
  ({ description, type: 'DEBIT', accountType: 'CREDIT', ...extra })

describe('palavras-chave (descrições reais das faturas Santander e Itaú)', () => {
  const cat = categorizador()
  it.each([
    ['SANTA ROSA PADARIA E C', 'Alimentação/Padaria e café'],
    ['PLANOBBEBIDAS', 'Alimentação/Bares'],
    ['ATACADAO 819 AS', 'Alimentação/Mercado'],
    ['ASSAI ATACADISTA LJ167', 'Alimentação/Mercado'],
    ['EL BIGODON HAMBURGUERI', 'Alimentação/Restaurantes'],
    ['DL*UBERRIDES', 'Transporte/App de transporte'],
    ['TIGERAUTO POSTO LTDA', 'Transporte/Combustível'],
    ['RAIA353', 'Saúde/Farmácia'],
    ['FILIAL279DROGAL', 'Saúde/Farmácia'],
    ['X GYM AGUIAR E GRANADO', 'Saúde/Academia e esportes'],
    ['WELLHUB BR', 'Saúde/Academia e esportes'],
    ['MP *PARAMOUNTPLUS', 'Assinaturas e serviços/Streaming'],
    ['ANTHROPIC* CLAUDE SUB', 'Assinaturas e serviços/Apps e software'],
    ['CONTABILIZEI TECNOLOGI', 'Assinaturas e serviços/Serviços profissionais'],
    ['COMGAS', 'Moradia/Gás'],
    ['CONTA VIVO', 'Moradia/Internet, TV e telefone'],
    ['OBRAMAX', 'Moradia/Manutenção e reforma'],
    ['MERCADOLIVRE*MERCADOL', 'Compras/Compras online'],
    ['GNT*TEMU', 'Compras/Compras online'],
    ['AIRBNB * HMK4T3J432', 'Lazer e viagens/Viagens e hospedagem'],
    ['ANUIDADE DIFERENCIADA', 'Impostos e taxas/Anuidade'],
    ['IOF DESPESA NO EXTERIOR', 'Impostos e taxas/Juros e IOF'],
  ])('%s -> %s', (desc, esperado) => {
    expect(cat(compraCartao(desc))).toEqual({ categoryId: esperado, origem: 'palavra' })
  })

  it('o que não reconhece vai para Outros/Diversos', () => {
    expect(cat(compraCartao('FERNANDODASILVA'))).toEqual({ categoryId: 'Outros/Diversos', origem: 'padrao' })
  })
})

describe('categoria da Pluggy', () => {
  const cat = categorizador()
  it('usa a categoria da Pluggy antes das palavras-chave', () => {
    expect(cat(compraCartao('NOVA *NOVASAO PA', { pluggyCategory: 'Groceries' }))).toEqual({ categoryId: 'Alimentação/Mercado', origem: 'pluggy' })
  })
  it('categoria genérica da Pluggy ("Shopping") não atrapalha quem tem mapeamento', () => {
    expect(cat(compraCartao('PETZ', { pluggyCategory: 'Pet supplies and vet' })).categoryId).toBe('Pets/Pet shop')
  })
  it('categoria desconhecida cai nas palavras-chave', () => {
    expect(cat(compraCartao('IFD*IFOOD', { pluggyCategory: 'Something new' }))).toEqual({ categoryId: 'Alimentação/Delivery', origem: 'palavra' })
  })
})

describe('regras aprendidas', () => {
  it('regra pelo CNPJ vence tudo, mesmo com descrição diferente', () => {
    const cat = categorizador({ 'cnpj:11222333000144': 'Lazer e viagens/Hobbies' })
    expect(cat(compraCartao('LOJA QUALQUER 123', { merchantCnpj: '11.222.333/0001-44', pluggyCategory: 'Groceries' })))
      .toEqual({ categoryId: 'Lazer e viagens/Hobbies', origem: 'regra' })
  })
  it('regra pela descrição pega a mesma loja com código diferente (RAIA353 x RAIA2331)', () => {
    const cat = categorizador({ 'desc:raia': 'Saúde/Médicos e exames' })
    expect(cat(compraCartao('RAIA2331')).categoryId).toBe('Saúde/Médicos e exames')
  })
  it('Pix recorrente para a mesma pessoa (ex.: diarista) segue a regra pelo documento', () => {
    const cat = categorizador({ 'doc:11122233344': 'Moradia/Casa e decoração' })
    const pix = { description: 'PIX ENVIADO MARIA S', type: 'DEBIT' as const, accountType: 'BANK' as const, operationType: 'PIX', counterpartDocument: '111.222.333-44' }
    expect(cat(pix)).toEqual({ categoryId: 'Moradia/Casa e decoração', origem: 'regra' })
  })
})

describe('transferências que não são gasto', () => {
  const cat = categorizador()
  it('pagamento da fatura no cartão', () => {
    expect(cat({ description: 'Pagamento recebido', type: 'CREDIT', accountType: 'CREDIT', operationType: 'PAGAMENTO_FATURA' }).categoryId)
      .toBe('Transferências/Pagamento de fatura')
  })
  it('débito na conta corrente que paga a fatura', () => {
    expect(cat({ description: 'PAGTO FATURA CARTAO ITAU', type: 'DEBIT', accountType: 'BANK' }).categoryId)
      .toBe('Transferências/Pagamento de fatura')
  })
  it('Pix entre Felipe e Day é transferência entre contas da família', () => {
    expect(cat({ description: 'PIX ENVIADO DAYSI', type: 'DEBIT', accountType: 'BANK', operationType: 'PIX', counterpartDocument: CPF_DAY }))
      .toEqual({ categoryId: 'Transferências/Entre contas próprias', origem: 'sistema' })
  })
  it('Pix para terceiro sem categoria vai para "Pix e transferências"; recebido vai para "Pix recebido"', () => {
    expect(cat({ description: 'PIX ENVIADO JOAO', type: 'DEBIT', accountType: 'BANK', operationType: 'PIX' }).categoryId).toBe('Outros/Pix e transferências')
    expect(cat({ description: 'PIX RECEBIDO JOAO', type: 'CREDIT', accountType: 'BANK', operationType: 'PIX' }).categoryId).toBe('Receitas/Pix recebido')
  })
  it('estorno no cartão vai para "Reembolsos e estornos"', () => {
    expect(cat({ description: 'ESTORNO LOJA X', type: 'CREDIT', accountType: 'CREDIT', operationType: 'ESTORNO' }).categoryId).toBe('Receitas/Reembolsos e estornos')
  })
})

describe('chaves', () => {
  it('prioriza CNPJ, depois documento do Pix, depois descrição sem números', () => {
    expect(chaves({ description: 'RAIA353', merchantCnpj: '61.585.865/0001-51' }).ruleKey).toBe('cnpj:61585865000151')
    expect(chaves({ description: 'PIX MARIA', counterpartDocument: '111.222.333-44' }).ruleKey).toBe('doc:11122233344')
    expect(chaves({ description: 'RAIA353' })).toEqual({ ruleKey: 'desc:raia', descKey: 'desc:raia' })
  })
})

describe('transformar transação da Pluggy', () => {
  it('compra no cartão adicional: sinal, cartão, parcela e valor em reais', () => {
    const linha = transacaoParaLinha({
      id: 't1', accountId: 'a1', date: '2026-09-17T03:00:00.000Z', description: 'AIRBNB * HMK4T3J432',
      amount: 69.8, amountInAccountCurrency: 378.72, type: 'DEBIT', status: 'POSTED',
      creditCardMetadata: { installmentNumber: 1, totalInstallments: 6, cardNumber: '5228XXXXXXXX5270' },
    }, { type: 'CREDIT' })
    expect(linha).toMatchObject({ date: '2026-09-17', amount: -378.72, card_last4: '5270', installment_number: 1, total_installments: 6, desc_key: 'desc:airbnb hmk t j' })
  })
  it('Pix recebido: contraparte é quem pagou', () => {
    const linha = transacaoParaLinha({
      id: 't2', accountId: 'a2', date: '2026-09-20T00:00:00.000Z', description: 'PIX RECEBIDO', amount: 150, type: 'CREDIT',
      paymentData: { payer: { name: 'JOAO', documentNumber: { value: '111.222.333-44', type: 'CPF' } }, receiver: { name: 'FELIPE' }, paymentMethod: 'PIX' },
    }, { type: 'BANK' })
    expect(linha).toMatchObject({ amount: 150, counterpart_name: 'JOAO', counterpart_document: '11122233344', rule_key: 'doc:11122233344', card_last4: null })
  })
})
