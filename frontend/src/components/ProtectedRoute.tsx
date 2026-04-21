import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

type AppRole = 'patient' | 'doctor' | 'admin'

type Props = {
  children: ReactNode
  roles?: AppRole[]
}

export default function ProtectedRoute({ children, roles }: Props) {
  const location = useLocation()
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  const role = (localStorage.getItem('role') || sessionStorage.getItem('role')) as AppRole | null

  if (!token || !role) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles?.length && !roles.includes(role)) {
    if (role === 'admin') return <Navigate to="/admin/dashboard" replace />
    if (role === 'doctor') return <Navigate to="/doctor/dashboard" replace />
    return <Navigate to="/patient/dashboard" replace />
  }

  return <>{children}</>
}
