import { HashRouter, Route, Routes } from 'react-router-dom'
import { SettingsProvider } from './app/SettingsContext'
import { ToastProvider } from './app/ToastContext'
import { AuthProvider, useAuth } from './app/AuthContext'
import { AppShell } from './components/AppShell'
import { BrandMark } from './components/BrandMark'
import { UpdateBanner } from './components/UpdateBanner'
import { BackupPage } from './pages/BackupPage'
import { DashboardPage } from './pages/DashboardPage'
import { DataHubPage } from './pages/DataHubPage'
import { ItemsPage } from './pages/ItemsPage'
import { ListsPage } from './pages/ListsPage'
import { LockPage } from './pages/LockPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PartiesPage } from './pages/PartiesPage'
import { SettingsPage } from './pages/SettingsPage'
import { SetupPage } from './pages/SetupPage'
import { WorkersPage } from './pages/WorkersPage'

function SplashScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas">
      <BrandMark size={56} className="animate-pulse" />
      <p className="text-[13px] text-muted">جارٍ تحميل البيانات…</p>
    </div>
  )
}

/** Holds the app behind the PIN: setup first, then unlock, then the shell. */
function AppGate({ children }) {
  const { status } = useAuth()
  if (status === 'loading') return <SplashScreen />
  if (status === 'setup') return <SetupPage />
  if (status === 'locked') return <LockPage />
  return children
}

export default function App() {
  return (
    <SettingsProvider>
      <ToastProvider>
        <AuthProvider>
          <HashRouter>
            <AppGate>
              <Routes>
                <Route element={<AppShell />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="data" element={<DataHubPage />} />
                  <Route path="customers" element={<PartiesPage kind="customers" />} />
                  <Route path="suppliers" element={<PartiesPage kind="suppliers" />} />
                  <Route path="items" element={<ItemsPage />} />
                  <Route path="workers" element={<WorkersPage />} />
                  <Route path="lists" element={<ListsPage />} />
                  <Route path="backup" element={<BackupPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </AppGate>
            {import.meta.env.PROD && <UpdateBanner />}
          </HashRouter>
        </AuthProvider>
      </ToastProvider>
    </SettingsProvider>
  )
}
