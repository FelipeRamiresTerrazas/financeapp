import { createContext, useContext, useEffect, useState } from 'react'
import { THEMES, applyTheme, loadThemeId, saveThemeId } from './themes.js'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(loadThemeId)

  useEffect(() => {
    applyTheme(themeId)
    saveThemeId(themeId)
  }, [themeId])

  return (
    <ThemeContext.Provider value={{ themeId, theme: THEMES[themeId], setThemeId }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

// Estilos comuns para gráficos Recharts (que não leem classes Tailwind)
export function useChartStyle() {
  const { theme } = useTheme()
  return {
    theme,
    tick: { fontSize: 11, fill: theme.muted },
    axisLine: { stroke: theme.line },
    grid: theme.line,
    tooltip: {
      contentStyle: {
        background: theme.surface2,
        border: `1px solid ${theme.line}`,
        borderRadius: 12,
        color: theme.fg,
        fontSize: 12,
      },
      labelStyle: { color: theme.muted, fontWeight: 600 },
      itemStyle: { color: theme.fg },
      cursor: { fill: theme.surface3, opacity: 0.5 },
    },
  }
}
