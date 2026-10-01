import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { TemaProvider } from './theme/TemaContext'
import { aplicarTema, temaSalvo } from './theme/temas'
import './index.css'

// aplica o tema antes do primeiro render para não piscar
aplicarTema(temaSalvo())

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TemaProvider>
      <App />
    </TemaProvider>
  </React.StrictMode>,
)
