// Cliente mínimo da API da Pluggy (https://api.pluggy.ai, spec em /oas3.json).
// Só leitura: itens (conexões), contas e transações.

const BASE = 'https://api.pluggy.ai'

export interface PluggyItem {
  id: string
  status: string
  executionStatus: string
  lastUpdatedAt: string | null
  consentExpiresAt?: string | null
  connector: { name: string; imageUrl?: string; primaryColor?: string }
}

export interface PluggyAccount {
  id: string
  itemId: string
  type: 'BANK' | 'CREDIT'
  subtype: string
  name: string
  marketingName?: string | null
  number: string
  owner?: string | null
  taxNumber?: string | null
  balance: number
  currencyCode: string
  creditData?: {
    creditLimit?: number | null
    availableCreditLimit?: number | null
    balanceDueDate?: string | null
    balanceCloseDate?: string | null
  } | null
}

interface Participante {
  name?: string
  documentNumber?: { value?: string; type?: 'CPF' | 'CNPJ' }
}

export interface PluggyTransaction {
  id: string
  accountId: string
  date: string
  description: string
  descriptionRaw?: string | null
  amount: number
  amountInAccountCurrency?: number | null
  type: 'DEBIT' | 'CREDIT'
  status?: 'POSTED' | 'PENDING'
  category?: string | null
  operationType?: string | null
  merchant?: { name?: string; businessName?: string; cnpj?: string } | null
  paymentData?: { payer?: Participante; receiver?: Participante; paymentMethod?: string } | null
  creditCardMetadata?: {
    installmentNumber?: number
    totalInstallments?: number
    cardNumber?: string
    billId?: string
  } | null
}

export class ErroPluggy extends Error {
  constructor(public status: number, public codigo: string | null, mensagem: string) {
    super(mensagem)
  }
}

export class Pluggy {
  private constructor(private apiKey: string) {}

  static async conectar(clientId: string, clientSecret: string): Promise<Pluggy> {
    const res = await fetch(`${BASE}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret }),
    })
    if (!res.ok) throw new Error(`Pluggy recusou as credenciais (${res.status}). Confira o Client ID e o Client Secret.`)
    const { apiKey } = await res.json()
    return new Pluggy(apiKey)
  }

  private async get<T>(caminho: string): Promise<T> {
    const res = await fetch(`${BASE}${caminho}`, { headers: { 'X-API-KEY': this.apiKey } })
    if (!res.ok) {
      const corpo = await res.text()
      let codigo: string | null = null
      try { codigo = JSON.parse(corpo).codeDescription ?? null } catch { /* corpo sem JSON */ }
      throw new ErroPluggy(res.status, codigo, `Pluggy ${caminho.split('?')[0]}: ${res.status} ${corpo}`)
    }
    return res.json()
  }

  // listas com cursor: `next` é a query string pronta da próxima página
  private async todasAsPaginas<T>(caminho: string, query: string): Promise<T[]> {
    const resultados: T[] = []
    let proxima: string | null = query
    while (proxima != null) {
      const pagina: { results: T[]; next: string | null } = await this.get(`${caminho}${proxima}`)
      resultados.push(...pagina.results)
      proxima = pagina.next
    }
    return resultados
  }

  // Listar conexões é opt-in na Pluggy (desligado por padrão): devolve null se não estiver liberado
  async itens(): Promise<PluggyItem[] | null> {
    try {
      return await this.todasAsPaginas<PluggyItem>('/v2/items', '')
    } catch (e) {
      if (e instanceof ErroPluggy && e.codigo === 'LIST_ITEMS_FEATURE_NOT_ENABLED') return null
      throw e
    }
  }

  item(id: string) {
    return this.get<PluggyItem>(`/items/${encodeURIComponent(id)}`)
  }

  async contas(itemId: string) {
    const { results } = await this.get<{ results: PluggyAccount[] }>(`/accounts?itemId=${itemId}`)
    return results
  }

  transacoes(accountId: string, desde: string) {
    return this.todasAsPaginas<PluggyTransaction>('/v2/transactions', `?accountId=${accountId}&dateFrom=${desde}`)
  }
}
