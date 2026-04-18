import { useState, useEffect, type ComponentType } from 'react'
import { useNavigate, useLocation, Routes, Route, Link, Navigate } from 'react-router-dom'
import { authService } from '../../services/authService'
import './AdminDashboard.css'

import DashboardOverview from './AdminPages/DashboardOverview'
import DoctorsManagement from './AdminPages/DoctorsManagement'
import PatientsManagement from './AdminPages/PatientsManagement'
import DepartmentsManagement from './AdminPages/DepartmentsManagement'
import AppointmentsManagement from './AdminPages/AppointmentsManagement'
import FeedbackManagement from './AdminPages/FeedbackManagement'
import MedicalRecordsManagement from './AdminPages/MedicalRecordsManagement'
import {
  NavIconAppointments,
  NavIconDashboard,
  NavIconDepartments,
  NavIconDoctors,
  NavIconFeedback,
  NavIconLogout,
  NavIconMedicalRecords,
  NavIconPatients,
  NavIconReports,
} from './AdminNavIcons'

type MenuItem = {
  path: string
  label: string
  Icon: ComponentType
}

const AdminDashboard = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [adminProfile, setAdminProfile] = useState<any>(null)

  useEffect(() => {
    // Checking authentication
    if (!authService.isAuthenticated()) {
      navigate('/login')
      return
    }

    const currentUser = authService.getCurrentUser()
    if (currentUser && currentUser.role !== 'admin') {
      navigate('/patient/dashboard')
      return
    }

    loadAdminProfile()
  }, [navigate])

  const loadAdminProfile = async () => {
    try {
      const response = await authService.getProfile()
      setAdminProfile(response.user)
    } catch (error) {
      console.error('Error loading admin profile:', error)
    }
  }

  const handleLogout = async () => {
    await authService.logout()
    navigate('/')
  }

  const menuItems: MenuItem[] = [
    { path: '/admin/dashboard', label: 'Dashboard', Icon: NavIconDashboard },
    { path: '/admin/doctors', label: 'Doctors', Icon: NavIconDoctors },
    { path: '/admin/patients', label: 'Patients', Icon: NavIconPatients },
    { path: '/admin/departments', label: 'Departments', Icon: NavIconDepartments },
    { path: '/admin/appointments', label: 'Appointments', Icon: NavIconAppointments },
    { path: '/admin/reports', label: 'Reports & Analytics', Icon: NavIconReports },
    { path: '/admin/medical-records', label: 'Medical Records Logs', Icon: NavIconMedicalRecords },
    { path: '/admin/feedback', label: 'Feedback', Icon: NavIconFeedback },
  ]

  const isActiveRoute = (path: string) => {
    if (path === '/admin/dashboard') {
      return location.pathname === '/admin/dashboard' || location.pathname === '/admin'
    }
    return location.pathname.startsWith(path)
  }


  const adminName = adminProfile?.firstName && adminProfile?.lastName
    ? `${adminProfile.firstName} ${adminProfile.lastName}`
    : adminProfile?.username || 'Admin'

  return (
    <div className="admin-dashboard">
      {/* For Sidebar */}
      <aside className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-section">
            <div className="logo-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#2C5F7C" />
                <path d="M2 17L12 22L22 17" stroke="#2C5F7C" strokeWidth="2" strokeLinecap="round" />
                <path d="M2 12L12 17L22 12" stroke="#2C5F7C" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            {!sidebarCollapsed && <span className="logo-text">Nexus Mediwell</span>}
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        {/* Admin Profile Section */}
        <div className="admin-profile-section">
          <div className="admin-avatar">
            {adminProfile?.profilePicture ? (
              <img src={adminProfile.profilePicture} alt={adminName} />
            ) : (
              <div className="avatar-placeholder">
                {adminName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="admin-info">
              <h3>{adminName}</h3>
              <p>Administrator</p>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.Icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActiveRoute(item.path) ? 'active' : ''}`}
                title={sidebarCollapsed ? item.label : ''}
              >
                <span className="nav-icon">
                  <Icon />
                </span>
                {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Logout Button */}
        <div className="sidebar-footer">
          <button type="button" className="logout-btn" onClick={handleLogout}>
            <span className="nav-icon">
              <NavIconLogout />
            </span>
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main">
        <header className="admin-header">
          <h1 className="page-title">
            {menuItems.find(item => isActiveRoute(item.path))?.label || 'Dashboard'}
          </h1>
          
          <div className="header-actions">
            {/* Admin Profile Dropdown */}
            <div className="admin-dropdown">
              <button className="admin-profile-btn">
                <div className="admin-avatar-small">
                  {adminProfile?.profilePicture ? (
                    <img src={adminProfile.profilePicture} alt={adminName} />
                  ) : (
                    <div className="avatar-placeholder-small">
                      {adminName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span>{adminName}</span>
                
              </button>
            </div>
          </div>
        </header>

        {/* Page Contents */}
        <main className="admin-content">
          <Routes>
            <Route path="" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardOverview />} />
            <Route path="doctors" element={<DoctorsManagement />} />
            <Route path="patients" element={<PatientsManagement />} />
            <Route path="departments" element={<DepartmentsManagement />} />
            <Route path="appointments" element={<AppointmentsManagement />} />
            <Route path="medical-records" element={<MedicalRecordsManagement />} />
            <Route path="feedback" element={<FeedbackManagement />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default AdminDashboard
