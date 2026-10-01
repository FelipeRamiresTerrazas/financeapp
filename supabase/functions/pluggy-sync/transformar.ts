// Converte os objetos da Pluggy nas linhas das tabelas do app. Lógica pura, testável.

import type { PluggyAccount, PluggyTransaction } from './pluggy.ts'
import { chaves } from './categorizacao.ts'

const dataISO = (d: string | null | undefined) => (d ? d.slice(0, 10) : null)
const soDigitos = (s: string | null | undefined) => (s || '').replace(/\D/g, '')

export function contaParaLinha(c: PluggyAccount) {
  return {
    id: c.id,
    item_id: c.itemId,
    type: c.type,
    subtype: c.subtype,
    name: c.marketingName || c.name,
    number: c.number,
    owner: c.owner ?? null,
    tax_number: soDigitos(c.taxNumber) || null,
    balance: c.balance,
    currency_code: c.currencyCode,
    credit_limit: c.creditData?.creditLimit ?? null,
    available_credit_limit: c.creditData?.availableCreditLimit ?? null,
    balance_due_date: dataISO(c.creditData?.balanceDueDate),
    balance_close_date: dataISO(c.creditData?.balanceCloseDate),
    updated_at: new Date().toISOString(),
  }
}

export function transacaoParaLinha(t: PluggyTransaction, conta: Pick<PluggyAccount, 'type'>) {
  // a Pluggy já normaliza: compra/saída é DEBIT, entrada/estorno/pagamento de fatura é CREDIT.
  // Em compras no exterior, amountInAccountCurrency traz o valor em reais.
  const valor = Math.abs(t.amountInAccountCurrency ?? t.amount)
  // a contraparte é quem recebeu (saída) ou quem pagou (entrada)
  const contraparte = t.type === 'DEBIT' ? t.paymentData?.receiver : t.paymentData?.payer
  const cartao = soDigitos(t.creditCardMetadata?.cardNumber)
  const merchantCnpj = soDigitos(t.merchant?.cnpj) || null
  const counterpartDocument = soDigitos(contraparte?.documentNumber?.value) || null
  const { ruleKey, descKey } = chaves({ description: t.description, merchantCnpj, counterpartDocument })

  return {
    id: t.id,
    account_id: t.accountId,
    date: dataISO(t.date)!,
    description: t.description,
    description_raw: t.descriptionRaw ?? null,
    amount: t.type === 'DEBIT' ? -valor : valor,
    type: t.type,
    status: t.status ?? 'POSTED',
    operation_type: t.operationType ?? null,
    pluggy_category: t.category ?? null,
    merchant_name: t.merchant?.name || t.merchant?.businessName || null,
    merchant_cnpj: merchantCnpj,
    counterpart_name: contraparte?.name ?? null,
    counterpart_document: counterpartDocument,
    payment_method: t.paymentData?.paymentMethod ?? null,
    card_last4: conta.type === 'CREDIT' && cartao.length >= 4 ? cartao.slice(-4) : null,
    installment_number: t.creditCardMetadata?.installmentNumber ?? null,
    total_installments: t.creditCardMetadata?.totalInstallments ?? null,
    bill_id: t.creditCardMetadata?.billId ?? null,
    rule_key: ruleKey,
    desc_key: descKey,
    updated_at: new Date().toISOString(),
  }
}

export type LinhaTransacao = ReturnType<typeof transacaoParaLinha>
