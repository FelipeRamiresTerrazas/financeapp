/** @type {import('tailwindcss').Config} */

// Cores semânticas: os valores vêm de CSS variables definidas pelo tema ativo (src/theme/themes.js)
const v = name => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: v('canvas'),
        surface: {
          DEFAULT: v('surface'),
          2: v('surface-2'),
          3: v('surface-3'),
        },
        line: v('line'),
        fg: {
          DEFAULT: v('fg'),
          2: v('fg-2'),
        },
        muted: v('muted'),
        subtle: v('subtle'),
        brand: {
          DEFAULT: v('brand'),
          strong: v('brand-strong'),
        },
        'on-brand': v('on-brand'),
      },
      borderColor: {
        DEFAULT: v('line'),
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
