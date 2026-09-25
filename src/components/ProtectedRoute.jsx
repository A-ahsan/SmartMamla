import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Spinner } from './ui'

export default function ProtectedRoute({ role, children }) {
  const { profile, ready } = useAuth()
  const loc = useLocation()
  if (!ready)
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-brand-700">
        <Spinner size={28} />
      </div>
    )
  const loginPath = role === 'police' ? '/police/login' : '/login'
  if (!profile) return <Navigate to={loginPath} replace state={{ from: loc.pathname }} />
  if (role && profile.role !== role) return <Navigate to={profile.role === 'police' ? '/police' : '/dashboard'} replace />
  return children
}
