import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ThemeProvider } from './theme/ThemeContext.jsx'
import { applyTheme, loadThemeId } from './theme/themes.js'
import './index.css'

// Aplica o tema antes do primeiro render para evitar "flash" de cores
applyTheme(loadThemeId())

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
