import { HashRouter, Route, Routes } from 'react-router-dom'
import { SettingsProvider } from './app/SettingsContext'
import { ToastProvider } from './app/ToastContext'
import { AuthProvider, useAuth } from './app/AuthContext'
import { AppShell } from './components/AppShell'
import { BrandMark } from './components/BrandMark'
import { UpdateBanner } from './components/UpdateBanner'
import { AdvancesPage } from './pages/AdvancesPage'
import { BackupPage } from './pages/BackupPage'
import { DashboardPage } from './pages/DashboardPage'
import { DataHubPage } from './pages/DataHubPage'
import { DebtsPage } from './pages/DebtsPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { InstallmentsPage } from './pages/InstallmentsPage'
import { InventoryPage } from './pages/InventoryPage'
import { InvoiceFormPage } from './pages/InvoiceFormPage'
import { InvoiceViewPage } from './pages/InvoiceViewPage'
import { InvoicesPage } from './pages/InvoicesPage'
import { ItemsPage } from './pages/ItemsPage'
import { ListsPage } from './pages/ListsPage'
import { LockPage } from './pages/LockPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PartiesPage } from './pages/PartiesPage'
import { PaymentsPage } from './pages/PaymentsPage'
import { PayrollPage } from './pages/PayrollPage'
import { PaySlipPage } from './pages/PaySlipPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'
import { SetupPage } from './pages/SetupPage'
import { StatementPage } from './pages/StatementPage'
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

                  <Route path="sales" element={<InvoicesPage kind="sale" />} />
                  <Route path="sales/new" element={<InvoiceFormPage kind="sale" />} />
                  <Route path="sales/:id" element={<InvoiceViewPage kind="sale" />} />
                  <Route path="sales/:id/edit" element={<InvoiceFormPage kind="sale" />} />

                  <Route path="purchases" element={<InvoicesPage kind="purchase" />} />
                  <Route path="purchases/new" element={<InvoiceFormPage kind="purchase" />} />
                  <Route path="purchases/:id" element={<InvoiceViewPage kind="purchase" />} />
                  <Route path="purchases/:id/edit" element={<InvoiceFormPage kind="purchase" />} />

                  <Route path="inventory" element={<InventoryPage />} />
                  <Route path="installments" element={<InstallmentsPage />} />
                  <Route path="payments" element={<PaymentsPage />} />
                  <Route path="debts" element={<DebtsPage />} />

                  <Route path="expenses" element={<ExpensesPage />} />
                  <Route path="payroll" element={<PayrollPage />} />
                  <Route path="payroll/:id" element={<PaySlipPage />} />
                  <Route path="advances" element={<AdvancesPage />} />
                  <Route path="statements" element={<StatementPage />} />
                  <Route path="reports" element={<ReportsPage />} />

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
