import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { DataProvider, PanelProvider } from './lib/store'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <DataProvider>
        <PanelProvider>
          <App />
        </PanelProvider>
      </DataProvider>
    </BrowserRouter>
  </StrictMode>,
)
