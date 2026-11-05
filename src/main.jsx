import { createRoot } from 'react-dom/client'
import App from './App'
import { initTheme } from './hooks/useTheme'
import { registerServiceWorker } from './pwa/serviceWorker'
import './index.css'

initTheme()
registerServiceWorker()

createRoot(document.getElementById('root')).render(<App />)
