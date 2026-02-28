import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster
      position="bottom-right"
      richColors
      theme="dark"
      toastOptions={{
        style: {
          background: 'hsl(222 25% 14%)',
          border: '1px solid hsl(222 18% 20%)',
          color: 'hsl(210 20% 95%)',
        },
      }}
    />
  </StrictMode>,
)
