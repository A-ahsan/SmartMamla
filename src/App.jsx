import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Radar, ScanLine, FileText, UserRound, LayoutDashboard, Gavel, IdCard, ReceiptText } from 'lucide-react'
import { useApp } from './contexts/AppContext'
import ProtectedRoute from './components/ProtectedRoute'
import PortalShell from './components/PortalShell'
import { Spinner } from './components/ui'
import Landing from './pages/Landing'
import AuthPage from './pages/AuthPage'
import { CitizenDataProvider } from './pages/citizen/CitizenData'

// Portal pages are split into their own chunks so the landing page loads fast on mobile data.
const TrafficUpdates = lazy(() => import('./pages/police/TrafficUpdates'))
const Lookup = lazy(() => import('./pages/police/Lookup'))
const MyCases = lazy(() => import('./pages/police/MyCases'))
const PoliceProfile = lazy(() => import('./pages/police/Profile'))
const Overview = lazy(() => import('./pages/citizen/Overview'))
const CitizenCases = lazy(() => import('./pages/citizen/Cases'))
const Documents = lazy(() => import('./pages/citizen/Documents'))
const Payments = lazy(() => import('./pages/citizen/Payments'))
const PaymentResult = lazy(() => import('./pages/PaymentResult'))
const SandboxGateway = lazy(() => import('./pages/SandboxGateway'))
const NotFound = lazy(() => import('./pages/NotFound'))

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])
  return null
}

const Fallback = () => (
  <div className="flex min-h-[50dvh] items-center justify-center text-brand-700">
    <Spinner size={28} />
  </div>
)

export default function App() {
  const { t } = useApp()

  const policeNav = [
    { to: '/police', end: true, icon: Radar, label: t('p_traffic') },
    { to: '/police/lookup', icon: ScanLine, label: t('p_lookup'), short: t('tab_scan') },
    { to: '/police/cases', icon: FileText, label: t('p_cases') },
    { to: '/police/profile', icon: UserRound, label: t('p_profile') },
  ]
  const citizenNav = [
    { to: '/dashboard', end: true, icon: LayoutDashboard, label: t('c_overview') },
    { to: '/dashboard/cases', icon: Gavel, label: t('c_cases') },
    { to: '/dashboard/documents', icon: IdCard, label: t('c_documents') },
    { to: '/dashboard/payments', icon: ReceiptText, label: t('c_payments') },
  ]

  return (
    <>
      <ScrollTop />
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<AuthPage portal="citizen" />} />
          <Route path="/police/login" element={<AuthPage portal="police" />} />

          <Route
            path="/police"
            element={
              <ProtectedRoute role="police">
                <PortalShell items={policeNav} variant="police" />
              </ProtectedRoute>
            }
          >
            <Route index element={<TrafficUpdates />} />
            <Route path="lookup" element={<Lookup />} />
            <Route path="cases" element={<MyCases />} />
            <Route path="profile" element={<PoliceProfile />} />
          </Route>

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute role="citizen">
                <CitizenDataProvider>
                  <PortalShell items={citizenNav} variant="citizen" />
                </CitizenDataProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<Overview />} />
            <Route path="cases" element={<CitizenCases />} />
            <Route path="documents" element={<Documents />} />
            <Route path="payments" element={<Payments />} />
          </Route>

          <Route path="/payment/sandbox" element={<SandboxGateway />} />
          <Route path="/payment/success" element={<PaymentResult kind="success" />} />
          <Route path="/payment/fail" element={<PaymentResult kind="fail" />} />
          <Route path="/payment/cancel" element={<PaymentResult kind="cancel" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  )
}
