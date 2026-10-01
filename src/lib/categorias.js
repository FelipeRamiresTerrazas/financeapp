import {
  UtensilsCrossed, ShoppingCart, Car, Fuel, HeartPulse, Tv, ShoppingBag,
  Home, GraduationCap, Plane, PawPrint, Scissors, Receipt, CircleDashed,
} from 'lucide-react'

// Palavras-chave já normalizadas (minúsculas, sem acento). As curtas (< 6 letras) casam com o
// início de uma palavra ("uber" pega "DL*UBERRIDES"); as longas casam em qualquer ponto, porque
// muitas faturas grudam e cortam os nomes ("PLANOBBEBIDAS", "FILIAL279DROGAL", "HAMBURGUERI").
// Em caso de várias, vence a palavra-chave mais longa (mais específica).
export const CATEGORIAS = [
  {
    id: 'alimentacao', nome: 'Restaurantes & Delivery', icon: UtensilsCrossed,
    palavras: ['ifood', 'ifd', 'rappi', 'restaura', 'rest ', 'lanchon', 'lanches', 'burger', 'hamburgue', 'mcdonalds', 'mc donalds', 'outback', 'starbucks', 'cafe', 'cafeteria', 'padaria', 'panificadora', 'pizza', 'sushi', 'habibs', 'spoleto', 'giraffas', 'churrascaria', 'bobs', 'subway', 'coco bambu', 'madero', 'sorveteria', 'doceria', 'confeitaria', 'baguet', 'bar e', 'boteco', 'bebidas', 'ze delivery'],
  },
  {
    id: 'mercado', nome: 'Mercado', icon: ShoppingCart,
    palavras: ['supermerc', 'mercado ', 'mercadinho', 'mercearia', 'carrefour', 'pao de acucar', 'assai', 'atacad', 'sams club', 'hortifruti', 'varejao', 'st marche', 'oba hortifruti', 'swift', 'zona sul', 'sonda', 'emporio', 'extra hiper', 'hirota', 'mambo', 'quitanda', 'acougue', 'natural da terra', 'conveniencia', 'jau serve'],
  },
  {
    id: 'transporte', nome: 'Transporte', icon: Car,
    palavras: ['uber', '99app', '99 pop', '99pop', '99 tecnologia', 'cabify', 'metro', 'cptm', 'sptrans', 'bilhete unico', 'estacionamento', 'estapar', 'zona azul', 'sem parar', 'semparar', 'conectcar', 'veloe', 'pedagio', 'taxi', 'localiza', 'movida', 'unidas', 'viacao'],
  },
  {
    id: 'combustivel', nome: 'Combustível', icon: Fuel,
    palavras: ['posto', 'auto posto', 'shell', 'ipiranga', 'petrobras', 'br mania', 'combustive', 'raizen'],
  },
  {
    id: 'saude', nome: 'Saúde & Academia', icon: HeartPulse,
    palavras: ['drogasil', 'droga raia', 'raia', 'drogaria', 'drogal', 'farmacia', 'pague menos', 'panvel', 'drogao', 'hospital', 'laboratorio', 'clinica', 'fleury', 'dasa', 'odonto', 'unimed', 'medico', 'consultorio', 'academia', 'gym', 'musclefit', 'smart fit', 'smartfit', 'bluefit', 'gympass', 'wellhub', 'totalpass'],
  },
  {
    id: 'assinaturas', nome: 'Assinaturas & Streaming', icon: Tv,
    palavras: ['netflix', 'spotify', 'amazon prime', 'prime video', 'amazonprime', 'disney', 'hbo', 'globoplay', 'youtube', 'apple com', 'apple.com', 'icloud', 'google one', 'google storage', 'deezer', 'paramount', 'chatgpt', 'openai', 'claude ai', 'anthropic', 'microsoft', 'adobe', 'canva', 'dropbox', 'crunchyroll', 'audible', 'kindle unltd', 'mubi', 'tidal', 'patreon', 'linkedin', 'melimais'],
  },
  {
    id: 'compras', nome: 'Compras', icon: ShoppingBag,
    palavras: ['amazon', 'amzn', 'mercadolivre', 'mercado livre', 'mercadolibre', 'shopee', 'temu', 'magalu', 'magazine luiza', 'americanas', 'aliexpress', 'shein', 'renner', 'riachuelo', 'cea ', 'zara', 'centauro', 'netshoes', 'decathlon', 'esportes', 'kabum', 'tok stok', 'tokstok', 'casas bahia', 'ponto frio', 'fast shop', 'nike', 'adidas', 'havaianas', 'hering', 'lupo', 'daiso', 'precolandia', 'lojao', 'moda', 'fashion', 'livraria', 'saraiva'],
  },
  {
    id: 'casa', nome: 'Casa & Contas', icon: Home,
    palavras: ['enel', 'light s', 'sabesp', 'comgas', 'cemig', 'copel', 'cpfl', 'vivo', 'claro', 'tim celular', 'telefonica', 'desktop', 'condominio', 'naturgy', 'sky ', 'ultragaz', 'liquigas', 'leroy', 'telhanorte', 'obramax', 'gmad', 'marmores', 'madeireira', 'construcao'],
  },
  {
    id: 'educacao', nome: 'Educação', icon: GraduationCap,
    palavras: ['escola', 'colegio', 'curso', 'udemy', 'alura', 'faculdade', 'universidade', 'cultura inglesa', 'wizard', 'fisk', 'duolingo', 'coursera', 'papelaria', 'kalunga'],
  },
  {
    id: 'lazer', nome: 'Lazer & Viagem', icon: Plane,
    palavras: ['cinema', 'cinemark', 'kinoplex', 'ingresso', 'sympla', 'eventim', 'eventos', 'ticket', 'airbnb', 'booking', 'hotel', 'pousada', 'latam', 'gol linhas', 'azul linhas', 'azul viagens', 'decolar', '123milhas', 'clube', 'parque', 'teatro', 'steam', 'playstation', 'xbox', 'nintendo'],
  },
  {
    id: 'pets', nome: 'Pets', icon: PawPrint,
    palavras: ['petz', 'cobasi', 'petshop', 'pet shop', 'petlove', 'veterinari'],
  },
  {
    id: 'servicos', nome: 'Serviços', icon: Scissors,
    palavras: ['contabil', 'salao', 'beleza', 'barbearia', 'cabeleirei', 'lavanderia', 'manicure', 'estetica'],
  },
  {
    id: 'taxas', nome: 'Taxas & Encargos', icon: Receipt,
    palavras: ['anuidade', 'iof', 'juros', 'tarifa', 'encargos', 'multa', 'seguro'],
  },
  {
    id: 'outros', nome: 'Outros', icon: CircleDashed,
    palavras: [],
  },
]

export const CATEGORIA_POR_ID = Object.fromEntries(CATEGORIAS.map(c => [c.id, c]))

export function normalizar(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Chave usada para lembrar a categoria escolhida pelo usuário para um estabelecimento:
// descrição sem números (parcelas, códigos de loja, datas).
export function chaveEstabelecimento(descricao) {
  return normalizar(descricao).replace(/[0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function categorizar(descricao, regrasUsuario = {}) {
  const chave = chaveEstabelecimento(descricao)
  if (regrasUsuario[chave]) return regrasUsuario[chave]

  // com e sem números, para "RAIA353" e "99app" casarem
  const texto = ` ${normalizar(descricao)} ${chave} `
  let melhor = null
  for (const cat of CATEGORIAS) {
    for (const p of cat.palavras) {
      const casou = p.length >= 6 ? texto.includes(p) : texto.includes(' ' + p)
      if (casou && (!melhor || p.length > melhor.tamanho)) {
        melhor = { id: cat.id, tamanho: p.length }
      }
    }
  }
  return melhor ? melhor.id : 'outros'
}
