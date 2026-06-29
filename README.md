# 💰 Finanças Família

App para controle financeiro familiar — funciona no desktop e no celular.

## Como rodar

```bash
npm install
npm run dev
```

Acesse http://localhost:5173

## Como publicar (Vercel ou GitHub Pages)

```bash
npm run build
```

A pasta `dist/` gerada pode ser publicada em qualquer serviço estático (Vercel, Netlify, GitHub Pages).

## Funcionalidades

- **Dashboard** — resumo geral com gráfico de gastos no cartão
- **Planejamento Mensal** — gastos fixos, marcar como pago, separados por saldo vs crédito
- **Empréstimos** — parcelas de entrada casa, Creditas, Bradesco agrupadas por mês
- **Cartão Felipe** — faturas por conta e mês
- **Cartão Day** — faturas separadas com campo de observação
- **Saldo Reserva** — evolução mensal com gráfico de linha

Todos os dados ficam salvos no navegador (localStorage).
