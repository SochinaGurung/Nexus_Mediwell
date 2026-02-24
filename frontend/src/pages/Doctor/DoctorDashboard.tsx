import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authService } from '../../services/authService'
import { appointmentService } from '../../services/appointmentService'
import type { Appointment } from '../../services/appointmentService'
import './DoctorDashboard.css'

export default function DoctorDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentUser = authService.getCurrentUser()
  const displayName = currentUser?.username || 'Doctor'
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loadingAppointments, setLoadingAppointments] = useState(true)
  const [appointmentsError, setAppointmentsError] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  useEffect(() => {
    if (!selectedAppointment) return
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedAppointment(null)
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [selectedAppointment])

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login')
      return
    }
    const user = authService.getCurrentUser()
    if (user && user.role !== 'doctor') {
      navigate('/patient/dashboard')
      return
    }
    loadAppointments()
  }, [navigate])

  useEffect(() => {
    if (location.hash !== '#appointments') return
    const el = document.getElementById('appointments')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash])

  async function loadAppointments() {
    try {
      setLoadingAppointments(true)
      setAppointmentsError('')
      const res = await appointmentService.getDoctorAppointments({
        limit: '50',
        sortBy: 'appointmentDate',
        sortOrder: 'asc'
      })
      setAppointments(res.appointments || [])
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to load appointments'
      setAppointmentsError(msg)
      setAppointments([])
    } finally {
      setLoadingAppointments(false)
    }
  }

  function formatShortDate(d: string | Date) {
    const date = typeof d === 'string' ? new Date(d) : d
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  function getStatusClass(status: string) {
    switch (status) {
      case 'confirmed': return 'status-confirmed'
      case 'completed': return 'status-completed'
      case 'cancelled': return 'status-cancelled'
      default: return 'status-pending'
    }
  }

  function getInitials(name: string) {
    return name
      .split(/\s+/)
      .map((s) => s[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleLogout = async () => {
    await authService.logout()
    navigate('/')
  }

  const pendingCount = appointments.filter((a) => a.status === 'pending').length

  return (
    <div className="doctor-dashboard doc-layout">
      {/* Left sidebar */}
      <aside className="doc-sidebar">
        <div className="doc-sidebar-logo">
          <div className="doc-sidebar-logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#2C5F7C" />
              <path d="M2 17L12 22L22 17" stroke="#2C5F7C" strokeWidth="2" strokeLinecap="round" />
              <path d="M2 12L12 17L22 12" stroke="#2C5F7C" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="doc-sidebar-logo-text">Nexus Mediwell</span>
        </div>
        <nav className="doc-sidebar-nav">
          <Link to="/doctor/dashboard" className="doc-nav-item active">
            <span className="doc-nav-accent" />
            <span className="doc-nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <span>Dashboard</span>
          </Link>
          <Link to="/doctors" className="doc-nav-item">
            <span className="doc-nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </span>
            <span>Top Doctors</span>
          </Link>
          <Link to="/doctor/dashboard#appointments" className="doc-nav-item doc-nav-item-badge">
            <span className="doc-nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <span>Appointment</span>
            {pendingCount > 0 && <span className="doc-badge">{pendingCount}</span>}
          </Link>
          <div className="doc-nav-item doc-nav-item-disabled">
            <span className="doc-nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            <span>Messages</span>
          </div>
          <Link to="/doctor/manage-records" className="doc-nav-item">
            <span className="doc-nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </span>
            <span>Health Records</span>
          </Link>
        </nav>
        <nav className="doc-sidebar-nav doc-sidebar-profile">
          <div className="doc-nav-heading">Profile</div>
          <Link to="/doctor/profile" className="doc-nav-item">
            <span className="doc-nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </span>
            <span>Profile Settings</span>
          </Link>
      
          <div className="doc-nav-item doc-nav-item-disabled">
            <span className="doc-nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <span>Help & Settings</span>
          </div>
          <div className="doc-nav-item doc-nav-item-disabled">
            <span className="doc-nav-icon doc-nav-icon-logo" />
            <span>About Nexus Mediwell</span>
          </div>
        </nav>
      </aside>

      {/* Main area */}
      <div className="doc-main">
        <header className="doc-topbar">
          <div className="doc-search-wrap">
            <svg className="doc-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="search" className="doc-search-input" placeholder="Search" aria-label="Search" />
          </div>
          <div className="doc-topbar-right">
            <div className="doc-user-wrap">
              <button
                type="button"
                className="doc-user-btn"
                onClick={() => setUserMenuOpen((o) => !o)}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <div className="doc-user-avatar">{getInitials(displayName)}</div>
                <span className="doc-user-name">{displayName}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {userMenuOpen && (
                <>
                  <div className="doc-user-backdrop" onClick={() => setUserMenuOpen(false)} aria-hidden="true" />
                  <div className="doc-user-menu">
                    <Link to="/doctor/profile" className="doc-user-menu-item" onClick={() => setUserMenuOpen(false)}>Profile</Link>
                    <button type="button" className="doc-user-menu-item doc-user-menu-logout" onClick={handleLogout}>Logout</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="doc-content">
          <div className="doc-content-main">
            
            <section className="doc-categories">
              <h3>Quick actions</h3>
              <div className="doc-category-cards">
                <Link to="/doctor/manage-records" className="doc-category-card doc-category-purple">
                  <span className="doc-category-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </span>
                  <p className="doc-category-label">Patient Records</p>
                  <span className="doc-category-desc">Manage medical records</span>
                </Link>
                <Link to="/doctor/profile" className="doc-category-card doc-category-red">
                  <span className="doc-category-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </span>
                  <span className="doc-category-label">Profile & Availability</span>
                  <span className="doc-category-desc">Edit your profile</span>
                </Link>
                <Link to="/doctors" className="doc-category-card doc-category-orange">
                  <span className="doc-category-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </span>
                  <span className="doc-category-label">Browse Doctors</span>
                  <span className="doc-category-desc">View colleagues</span>
                </Link>
              </div>
            </section>

            <section id="appointments" className="doc-appointments-section">
              <h3>My Appointment</h3>
              {loadingAppointments ? (
                <p className="doc-appointments-msg">Loading appointments...</p>
              ) : appointmentsError ? (
                <p className="doc-appointments-msg doc-appointments-error">{appointmentsError}</p>
              ) : appointments.length === 0 ? (
                <p className="doc-appointments-msg">There are no appointments yet.</p>
              ) : (
                <div className="doc-appointment-cards">
                  {appointments.map((apt, index) => (
                    <div
                      key={apt.id}
                      role="button"
                      tabIndex={0}
                      className={`doc-appointment-card doc-appointment-card-clickable ${index === 0 ? 'doc-appointment-card-highlight' : ''}`}
                      onClick={() => setSelectedAppointment(apt)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedAppointment(apt)
                        }
                      }}
                    >
                      <div className="doc-appointment-avatar">
                        {apt.patient?.name || apt.patient?.username
                          ? getInitials(apt.patient.name || apt.patient.username)
                          : '—'}
                      </div>
                      <div className="doc-appointment-info">
                        <div className="doc-appointment-name">
                          {apt.patient?.name || apt.patient?.username || 'Patient'}
                        </div>
                        <div className="doc-appointment-meta">
                          {apt.reason ? <span>{apt.reason}</span> : <span className="doc-appointment-location">Clinic visit</span>}
                        </div>
                        <div className="doc-appointment-datetime">
                          <span>{formatShortDate(apt.appointmentDate)}</span>
                          <span>{apt.appointmentTime}</span>
                          <span className="doc-appointment-duration">30 Min</span>
                        </div>
                        <span className={`doc-appointment-status ${getStatusClass(apt.status)}`}>{apt.status}</span>
                      </div>
                      <button
                        type="button"
                        className="doc-appointment-more"
                        aria-label="More options"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedAppointment(apt)
                        }}
                      >
                        ⋯
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {selectedAppointment && (
        <div className="doc-appointment-modal-backdrop" onClick={() => setSelectedAppointment(null)}>
          <div
            className="doc-appointment-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="doc-appointment-modal-title"
          >
            <div className="doc-appointment-modal-header">
              <h2 id="doc-appointment-modal-title">Appointment details</h2>
              <button type="button" className="doc-appointment-modal-close" onClick={() => setSelectedAppointment(null)} aria-label="Close">×</button>
            </div>
            <div className="doc-appointment-modal-body">
              <div className="doc-appointment-modal-row">
                <span className="doc-appointment-modal-label">Patient</span>
                <span>{selectedAppointment.patient?.name || selectedAppointment.patient?.username || '—'}</span>
              </div>
              {selectedAppointment.patient?.email && (
                <div className="doc-appointment-modal-row">
                  <span className="doc-appointment-modal-label">Email</span>
                  <span>{selectedAppointment.patient.email}</span>
                </div>
              )}
              <div className="doc-appointment-modal-row">
                <span className="doc-appointment-modal-label">Date</span>
                <span>{formatShortDate(selectedAppointment.appointmentDate)}</span>
              </div>
              <div className="doc-appointment-modal-row">
                <span className="doc-appointment-modal-label">Time</span>
                <span>{selectedAppointment.appointmentTime}</span>
              </div>
              <div className="doc-appointment-modal-row">
                <span className="doc-appointment-modal-label">Status</span>
                <span className={`doc-appointment-status ${getStatusClass(selectedAppointment.status)}`}>{selectedAppointment.status}</span>
              </div>
              {selectedAppointment.reason && (
                <div className="doc-appointment-modal-row">
                  <span className="doc-appointment-modal-label">Reason</span>
                  <span>{selectedAppointment.reason}</span>
                </div>
              )}
              {selectedAppointment.notes && (
                <div className="doc-appointment-modal-row">
                  <span className="doc-appointment-modal-label">Notes</span>
                  <span>{selectedAppointment.notes}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
