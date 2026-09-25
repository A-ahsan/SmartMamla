import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { AppProvider } from './contexts/AppContext'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <AuthProvider>
          <App />
          <Toaster
            position="top-center"
            toastOptions={{
              className: '!rounded-2xl !shadow-lift !text-sm !font-medium dark:!bg-ink-800 dark:!text-ink-50',
              success: { iconTheme: { primary: '#028C68', secondary: '#fff' } },
              error: { iconTheme: { primary: '#F42A41', secondary: '#fff' } },
            }}
          />
        </AuthProvider>
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
)
