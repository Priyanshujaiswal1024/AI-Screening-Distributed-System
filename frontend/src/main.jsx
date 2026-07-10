import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'
import { useThemeStore } from './shared/store/themeStore'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
})

// Hydrate Theme before render
const theme = useThemeStore.getState()
if (theme.isDark) document.documentElement.classList.add('dark')

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <App />
            <Toaster
                position="top-right"
                toastOptions={{
                    className: 'dark:bg-zinc-900 dark:text-white dark:border-zinc-800',
                    duration: 3000,
                }}
            />
        </QueryClientProvider>
    </React.StrictMode>
)