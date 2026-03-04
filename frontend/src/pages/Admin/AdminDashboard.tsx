import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Routes, Route, Link, Navigate } from 'react-router-dom'
import { authService } from '../../services/authService'
import './AdminDashboard.css'

// Importing all the page components
//import DashboardOverview from './pages/DashboardOverview'
import DoctorsManagement from './AdminPages/DoctorsManagement'
import PatientsManagement from './AdminPages/PatientsManagement'
import DepartmentsManagement from './AdminPages/DepartmentsManagement'
import AppointmentsManagement from './AdminPages/AppointmentsManagement'

import ActivityLogs from './AdminPages/ActivityLogs'

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

  const menuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/admin/doctors', label: 'Doctors', icon: '👨‍⚕️' },
    { path: '/admin/patients', label: 'Patients', icon: '👥' },
    { path: '/admin/departments', label: 'Departments', icon: '🏥' },
    { path: '/admin/appointments', label: 'Appointments', icon: '📅' },
    { path: '/admin/reports', label: 'Reports & Analytics', icon: '📈' },
    { path: '/admin/medical-records', label: 'Medical Records Logs', icon: '📋' },
    { path: '/admin/settings', label: 'System Settings', icon: '⚙️' },
    { path: '/admin/activity-logs', label: 'Activity Logs', icon: '📝' },
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
      {/* Sidebar */}
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
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActiveRoute(item.path) ? 'active' : ''}`}
              title={sidebarCollapsed ? item.label : ''}
            >
              <span className="nav-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
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
            <div className="global-search">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19 19L14.65 14.65"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <input type="text" placeholder="Search..." />
            </div>

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
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Page Contents */}
        <main className="admin-content">
          <Routes>
            <Route path="doctors" element={<DoctorsManagement />} />
            <Route path="patients" element={<PatientsManagement />} />
            <Route path="departments" element={<DepartmentsManagement />} />
            <Route path="appointments" element={<AppointmentsManagement />} />
            <Route path="activity-logs" element={<ActivityLogs />} />
            <Route path="" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default AdminDashboard
