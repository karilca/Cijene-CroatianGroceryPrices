import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { registerSW } from 'virtual:pwa-register'

import { queryClient } from './config/queryClient'
import './index.css'
import App from './App.tsx'

// Register service worker for PWA
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />

    </QueryClientProvider>
  </StrictMode>,
)
