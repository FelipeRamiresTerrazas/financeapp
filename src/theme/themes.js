// Temas escuros: fundo quase preto levemente tingido + uma cor de destaque (brand).
// Cada tema vira CSS variables em <html> (ver applyTheme) consumidas pelo tailwind.config.js.

const base = {
  fg: '#f4f4f5',
  fg2: '#c7c7d1',
  muted: '#8e8e9a',
  subtle: '#5c5c66',
}

export const THEMES = {
  lima: {
    nome: 'Lima',
    ...base,
    canvas: '#0a0a0b',
    surface: '#141416',
    surface2: '#1c1c1f',
    surface3: '#26262a',
    line: '#2a2a2f',
    brand: '#c6f35e',
    brandStrong: '#b2e043',
    onBrand: '#0a0a0b',
  },
  violeta: {
    nome: 'Violeta',
    ...base,
    canvas: '#0b0a10',
    surface: '#15131d',
    surface2: '#1d1a28',
    surface3: '#272333',
    line: '#2d2939',
    brand: '#a78bfa',
    brandStrong: '#8b6cf6',
    onBrand: '#0b0a10',
  },
  oceano: {
    nome: 'Oceano',
    ...base,
    canvas: '#080c10',
    surface: '#10161d',
    surface2: '#162029',
    surface3: '#1f2a35',
    line: '#24303c',
    brand: '#5cc8ff',
    brandStrong: '#38b2f0',
    onBrand: '#061018',
  },
  esmeralda: {
    nome: 'Esmeralda',
    ...base,
    canvas: '#080d0b',
    surface: '#101814',
    surface2: '#16211c',
    surface3: '#1e2b25',
    line: '#24322b',
    brand: '#3ddc97',
    brandStrong: '#22c784',
    onBrand: '#06110c',
  },
  coral: {
    nome: 'Coral',
    ...base,
    canvas: '#0e0a0a',
    surface: '#1a1414',
    surface2: '#231b1b',
    surface3: '#2e2424',
    line: '#352a2a',
    brand: '#ff8a65',
    brandStrong: '#f9714a',
    onBrand: '#140806',
  },
}

export const DEFAULT_THEME = 'lima'
const THEME_STORAGE_KEY = 'financas_tema'

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

export function applyTheme(id) {
  const t = THEMES[id] || THEMES[DEFAULT_THEME]
  const vars = {
    canvas: t.canvas,
    surface: t.surface,
    'surface-2': t.surface2,
    'surface-3': t.surface3,
    line: t.line,
    fg: t.fg,
    'fg-2': t.fg2,
    muted: t.muted,
    subtle: t.subtle,
    brand: t.brand,
    'brand-strong': t.brandStrong,
    'on-brand': t.onBrand,
  }
  const root = document.documentElement
  Object.entries(vars).forEach(([k, hex]) => root.style.setProperty(`--${k}`, hexToRgb(hex)))
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.canvas)
}

export function loadThemeId() {
  try {
    const id = localStorage.getItem(THEME_STORAGE_KEY)
    if (id && THEMES[id]) return id
  } catch {}
  return DEFAULT_THEME
}

export function saveThemeId(id) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id)
  } catch {}
}
