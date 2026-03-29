import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { registerSW } from 'virtual:pwa-register'

import { queryClient } from './config/queryClient'
import './index.css'
import App from './App.tsx'

// 1. DODAJEMO UVOZ TVOG AUTH PROVIDERA
import { AuthProvider } from './contexts/AuthContext'

// Register service worker for PWA
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
<StrictMode>
<QueryClientProvider client={queryClient}>
{/* 2. OMATAMO APP KAKO BI CIJELA APLIKACIJA IMALA PRISTUP LOGIN PODACIMA */}
<AuthProvider>
<App />
</AuthProvider>
</QueryClientProvider>
</StrictMode>,
)