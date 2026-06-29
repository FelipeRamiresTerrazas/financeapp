// Dados iniciais extraídos do arquivo FINANCAS.xlsx

export const initialPlanejamento = [
  { id: 1, descricao: 'Escola CLQ', valor: 4600, tipoPagamento: 'saldo', incluirConta: true, pago: true },
  { id: 2, descricao: 'Financiamento Authoria', valor: 7600, tipoPagamento: 'saldo', incluirConta: true, pago: true },
  { id: 3, descricao: 'Condomínio', valor: 800, tipoPagamento: 'saldo', incluirConta: true, pago: false },
  { id: 4, descricao: 'IPTU / Água / Luz / Gás', valor: 300, tipoPagamento: 'credito', incluirConta: true, pago: false },
  { id: 5, descricao: 'Contabilidade', valor: 400, tipoPagamento: 'credito', incluirConta: true, pago: false },
  { id: 6, descricao: 'Seguro / IPVA / Licenciamento', valor: 550, tipoPagamento: 'credito', incluirConta: true, pago: true },
  { id: 7, descricao: 'Plano SulAmérica', valor: 1300, tipoPagamento: 'saldo', incluirConta: true, pago: true },
  { id: 8, descricao: 'Internet / Assinaturas', valor: 1180, tipoPagamento: 'credito', incluirConta: true, pago: false },
  { id: 9, descricao: 'Clube', valor: 1000, tipoPagamento: 'saldo', incluirConta: true, pago: false },
  { id: 10, descricao: 'Cultura Inglesa', valor: 700, tipoPagamento: 'saldo', incluirConta: true, pago: false },
  { id: 11, descricao: 'Imposto Felipe', valor: 1600, tipoPagamento: 'saldo', incluirConta: true, pago: false },
  { id: 12, descricao: 'Academia', valor: 130, tipoPagamento: 'credito', incluirConta: true, pago: true },
]

export const initialEmprestimos = [
  { id: 1, desc: 'Entrada Casa', valor: 5902, mes: 5, ano: 2026, pago: true },
  { id: 2, desc: 'Entrada Casa', valor: 5902, mes: 6, ano: 2026, pago: false },
  { id: 3, desc: 'Entrada Casa', valor: 5902, mes: 7, ano: 2026, pago: false },
  { id: 4, desc: 'Entrada Casa', valor: 5902, mes: 8, ano: 2026, pago: false },
  { id: 5, desc: 'Entrada Casa', valor: 5902, mes: 9, ano: 2026, pago: false },
  { id: 6, desc: 'Entrada Casa', valor: 5902, mes: 10, ano: 2026, pago: false },
  { id: 7, desc: 'Entrada Casa', valor: 5902, mes: 11, ano: 2026, pago: false },
  { id: 8, desc: 'Entrada Casa', valor: 5902, mes: 12, ano: 2026, pago: false },
  { id: 9, desc: 'Entrada Casa', valor: 5902, mes: 1, ano: 2027, pago: false },
  { id: 10, desc: 'Entrada Casa', valor: 5902, mes: 2, ano: 2027, pago: false },
  { id: 11, desc: 'Creditas', valor: 3320.37, mes: 5, ano: 2026, pago: true },
  { id: 12, desc: 'Creditas', valor: 3167.55, mes: 6, ano: 2026, pago: false },
  { id: 13, desc: 'Creditas', valor: 3167.55, mes: 7, ano: 2026, pago: false },
  { id: 14, desc: 'Creditas', valor: 3167.55, mes: 8, ano: 2026, pago: false },
  { id: 15, desc: 'Creditas', valor: 3167.55, mes: 9, ano: 2026, pago: false },
  { id: 16, desc: 'Creditas', valor: 3167.55, mes: 10, ano: 2026, pago: false },
  { id: 17, desc: 'Creditas', valor: 3167.55, mes: 11, ano: 2026, pago: false },
  { id: 18, desc: 'Creditas', valor: 3167.55, mes: 12, ano: 2026, pago: false },
  { id: 19, desc: 'Creditas', valor: 3167.55, mes: 1, ano: 2027, pago: false },
  { id: 20, desc: 'Creditas', valor: 3167.55, mes: 2, ano: 2027, pago: false },
  { id: 21, desc: 'Creditas', valor: 3167.55, mes: 3, ano: 2027, pago: false },
  { id: 22, desc: 'Bradesco', valor: 4047.89, mes: 4, ano: 2026, pago: true },
  { id: 23, desc: 'Bradesco', valor: 4047.89, mes: 5, ano: 2026, pago: true },
  { id: 24, desc: 'Bradesco', valor: 2884.64, mes: 6, ano: 2026, pago: true },
  { id: 25, desc: 'Bradesco', valor: 2884.64, mes: 7, ano: 2026, pago: false },
  { id: 26, desc: 'Bradesco', valor: 2884.64, mes: 8, ano: 2026, pago: false },
  { id: 27, desc: 'Bradesco', valor: 2884.64, mes: 9, ano: 2026, pago: false },
  { id: 28, desc: 'Bradesco', valor: 2884.64, mes: 10, ano: 2026, pago: false },
  { id: 29, desc: 'Bradesco', valor: 2884.64, mes: 11, ano: 2026, pago: false },
]

export const initialSaldoReserva = [
  { id: 1, desc: 'Creditas', valor: 54000, mes: 5, ano: 2026 },
  { id: 2, desc: 'Creditas', valor: 50400, mes: 6, ano: 2026 },
  { id: 3, desc: 'Creditas', valor: null, mes: 7, ano: 2026 },
  { id: 4, desc: 'Creditas', valor: null, mes: 8, ano: 2026 },
  { id: 5, desc: 'Creditas', valor: null, mes: 9, ano: 2026 },
  { id: 6, desc: 'Creditas', valor: null, mes: 10, ano: 2026 },
]

export const initialCartaoCredito = [
  { id: 1, conta: 'Itaú', valor: 17552, mes: 1, ano: 2026, pago: true },
  { id: 2, conta: 'Caixa', valor: 157, mes: 1, ano: 2026, pago: true },
  { id: 3, conta: 'Porto', valor: 0, mes: 1, ano: 2026, pago: true },
  { id: 4, conta: 'Porto', valor: 3200, mes: 2, ano: 2026, pago: true },
  { id: 5, conta: 'Caixa', valor: 157, mes: 2, ano: 2026, pago: true },
  { id: 6, conta: 'Itaú', valor: 11184, mes: 2, ano: 2026, pago: true },
  { id: 7, conta: 'Porto', valor: 1200, mes: 3, ano: 2026, pago: true },
  { id: 8, conta: 'Itaú', valor: 6251.54, mes: 3, ano: 2026, pago: true },
  { id: 9, conta: 'Porto', valor: 1059, mes: 4, ano: 2026, pago: true },
  { id: 10, conta: 'Itaú', valor: 948.9, mes: 4, ano: 2026, pago: true },
  { id: 11, conta: 'Itaú', valor: 948.9, mes: 5, ano: 2026, pago: true },
  { id: 12, conta: 'Itaú', valor: 373.25, mes: 6, ano: 2026, pago: true },
  { id: 13, conta: 'Itaú', valor: 373.25, mes: 7, ano: 2026, pago: false },
  { id: 14, conta: 'Itaú', valor: 7327.83, mes: 9, ano: 2025, pago: true },
  { id: 15, conta: 'Santander', valor: 7219.73, mes: 9, ano: 2025, pago: true },
  { id: 16, conta: 'Caixa', valor: 176.71, mes: 9, ano: 2025, pago: true },
  { id: 17, conta: 'Bradesco', valor: 106.38, mes: 9, ano: 2025, pago: true },
  { id: 18, conta: 'Porto', valor: 1170.03, mes: 9, ano: 2025, pago: true },
  { id: 19, conta: 'Itaú', valor: 5163.95, mes: 10, ano: 2025, pago: true },
  { id: 20, conta: 'Santander', valor: 7190.4, mes: 10, ano: 2025, pago: true },
  { id: 21, conta: 'Porto', valor: 1204.93, mes: 10, ano: 2025, pago: true },
  { id: 22, conta: 'Caixa', valor: 157, mes: 10, ano: 2025, pago: true },
  { id: 23, conta: 'Itaú', valor: 4858.25, mes: 11, ano: 2025, pago: true },
  { id: 24, conta: 'Porto', valor: 2200, mes: 11, ano: 2025, pago: true },
  { id: 25, conta: 'Caixa', valor: 157, mes: 11, ano: 2025, pago: true },
  { id: 26, conta: 'Itaú', valor: 4801.75, mes: 12, ano: 2025, pago: true },
  { id: 27, conta: 'Porto', valor: 2000, mes: 12, ano: 2025, pago: true },
  { id: 28, conta: 'Caixa', valor: 157, mes: 12, ano: 2025, pago: true },
]

export const initialCartaoCreditoDay = [
  { id: 1, conta: 'Inter', valor: 378.95, mes: 9, ano: 2025, pago: true, observacao: '' },
  { id: 2, conta: 'Itaú', valor: 657.34, mes: 9, ano: 2025, pago: true, observacao: '' },
  { id: 3, conta: 'Nubank', valor: 580.27, mes: 9, ano: 2025, pago: true, observacao: 'poupança Day' },
  { id: 4, conta: 'Inter PJ', valor: 1423.19, mes: 9, ano: 2025, pago: true, observacao: 'poupança Day' },
  { id: 5, conta: 'Inter', valor: 308.07, mes: 10, ano: 2025, pago: true, observacao: 'poupança Day' },
  { id: 6, conta: 'Itaú', valor: 592.56, mes: 10, ano: 2025, pago: true, observacao: 'poupança Day' },
  { id: 7, conta: 'Nubank', valor: 681.93, mes: 10, ano: 2025, pago: true, observacao: 'poupança Day' },
  { id: 8, conta: 'Inter PJ', valor: 1062.13, mes: 10, ano: 2025, pago: true, observacao: 'poupança Day' },
  { id: 9, conta: 'Santander', valor: 360, mes: 10, ano: 2025, pago: true, observacao: 'poupança Day' },
  { id: 10, conta: 'Inter', valor: 370, mes: 11, ano: 2025, pago: false, observacao: '' },
  { id: 11, conta: 'Itaú', valor: 0, mes: 11, ano: 2025, pago: false, observacao: '' },
  { id: 12, conta: 'Nubank', valor: 616, mes: 11, ano: 2025, pago: false, observacao: '' },
  { id: 13, conta: 'Inter PJ', valor: 441, mes: 11, ano: 2025, pago: false, observacao: '' },
  { id: 14, conta: 'Santander', valor: 0, mes: 11, ano: 2025, pago: false, observacao: '' },
]

export const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export const MESES_COMPLETOS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]
