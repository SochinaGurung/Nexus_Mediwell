import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../services/authService'
import { appointmentService } from '../../services/appointmentService'
import type { Appointment } from '../../services/appointmentService'
import './PatientHome.css'

const Home = () => {
  const currentUser = authService.getCurrentUser()
  const displayName = currentUser?.username || localStorage.getItem('username') || 'Patient'
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loadingAppointments, setLoadingAppointments] = useState(true)
  const [appointmentsError, setAppointmentsError] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [rescheduleApt, setRescheduleApt] = useState<Appointment | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false)
  const [rescheduleError, setRescheduleError] = useState('')

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login')
      return
    }
    const user = authService.getCurrentUser()
    if (user && user.role !== 'patient') {
      navigate('/doctor/dashboard')
      return
    }
    loadAppointments()
  }, [navigate])

  async function loadAppointments() {
    try {
      setLoadingAppointments(true)
      setAppointmentsError('')
      const res = await appointmentService.getMyAppointments()
      setAppointments(res.appointments || [])
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to load appointments'
      setAppointmentsError(msg)
      setAppointments([])
    } finally {
      setLoadingAppointments(false)
    }
  }

  function formatDate(d: string | Date) {
    const date = typeof d === 'string' ? new Date(d) : d
    return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
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

  const canModify = (apt: Appointment) =>
    apt.status === 'pending' || apt.status === 'confirmed'

  async function handleCancel(apt: Appointment) {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return
    try {
      setAppointmentsError('')
      await appointmentService.cancelAppointment(apt.id)
      await loadAppointments()
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to cancel'
      setAppointmentsError(msg)
    }
  }

  function openReschedule(apt: Appointment) {
    const d = typeof apt.appointmentDate === 'string' ? new Date(apt.appointmentDate) : apt.appointmentDate
    setRescheduleApt(apt)
    setRescheduleDate(d.toISOString().slice(0, 10))
    setRescheduleTime(apt.appointmentTime || '')
    setRescheduleReason(apt.reason || '')
    setRescheduleError('')
  }

  function closeReschedule() {
    setRescheduleApt(null)
    setRescheduleDate('')
    setRescheduleTime('')
    setRescheduleReason('')
    setRescheduleError('')
  }

  async function handleRescheduleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rescheduleApt) return
    if (!rescheduleDate || !rescheduleTime) {
      setRescheduleError('Date and time are required.')
      return
    }
    setRescheduleError('')
    setRescheduleSubmitting(true)
    try {
      await appointmentService.rescheduleAppointment(rescheduleApt.id, {
        appointmentDate: rescheduleDate,
        appointmentTime: rescheduleTime,
        reason: rescheduleReason || undefined
      })
      await loadAppointments()
      closeReschedule()
    } catch (err: unknown) {
      setRescheduleError((err as { message?: string })?.message || 'Failed to reschedule')
    } finally {
      setRescheduleSubmitting(false)
    }
  }

  const handleLogout = async () => {
    await authService.logout()
    navigate('/')
  }

  return (
    <div className="patient-dashboard patient-layout">
      {/* Left sidebar - same structure as doctor dashboard */}
      <aside className="patient-sidebar">
        <div className="patient-sidebar-logo">
          <div className="patient-sidebar-logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#2C5F7C" />
              <path d="M2 17L12 22L22 17" stroke="#2C5F7C" strokeWidth="2" strokeLinecap="round" />
              <path d="M2 12L12 17L22 12" stroke="#2C5F7C" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="patient-sidebar-logo-text">Nexus Mediwell</span>
        </div>
        <nav className="patient-sidebar-nav">
          <Link to="/patient/dashboard" className="patient-nav-item active">
            <span className="patient-nav-accent" />
            <span className="patient-nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <span>Dashboard</span>
          </Link>
          <Link to="/appointments/book" className="patient-nav-item">
            <span className="patient-nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" strokeLinecap="round" />
              </svg>
            </span>
            <span>Book Appointment</span>
          </Link>
          <Link to="/doctors" className="patient-nav-item">
            <span className="patient-nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>Browse Doctors</span>
          </Link>
        </nav>
        <nav className="patient-sidebar-nav patient-sidebar-profile">
          <div className="patient-nav-heading">Profile</div>
          <Link to="/patient/profile" className="patient-nav-item">
            <span className="patient-nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" />
                <path d="M12 14C7.58172 14 4 16.6863 4 20V22H20V20C20 16.6863 16.4183 14 12 14Z" />
              </svg>
            </span>
            <span>View Profile</span>
          </Link>
          <Link to="/patient/medical-history" className="patient-nav-item">
            <span className="patient-nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </span>
            <span>Medical History</span>
          </Link>
        </nav>
      </aside>

      {/* Main area */}
      <div className="patient-main">
        <header className="patient-topbar">
          <div className="patient-search-wrap">
            <svg className="patient-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="search" className="patient-search-input" placeholder="Search" aria-label="Search" />
          </div>
          <div className="patient-topbar-right">
            <div className="patient-user-wrap">
              <button
                type="button"
                className="patient-user-btn"
                onClick={() => setUserMenuOpen((o) => !o)}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <div className="patient-user-avatar">{getInitials(String(displayName))}</div>
                <span className="patient-user-name">{displayName}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {userMenuOpen && (
                <>
                  <div className="patient-user-backdrop" onClick={() => setUserMenuOpen(false)} aria-hidden="true" />
                  <div className="patient-user-menu">
                    <Link to="/patient/profile" className="patient-user-menu-item" onClick={() => setUserMenuOpen(false)}>Profile</Link>
                    <button type="button" className="patient-user-menu-item patient-user-menu-logout" onClick={handleLogout}>Logout</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="patient-content">
          <div className="patient-content-main">
            <section className="patient-categories">
              <h3>Quick actions</h3>
              <div className="patient-category-cards">
                <Link to="/patient/profile" className="patient-category-card patient-category-teal">
                  <span className="patient-category-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" />
                      <path d="M12 14C7.58172 14 4 16.6863 4 20V22H20V20C20 16.6863 16.4183 14 12 14Z" />
                    </svg>
                  </span>
                  <p className="patient-category-label">View Profile</p>
                  <span className="patient-category-desc">Manage your information</span>
                </Link>
                <Link to="/appointments/book" className="patient-category-card patient-category-blue">
                  <span className="patient-category-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" strokeLinecap="round" />
                    </svg>
                  </span>
                  <p className="patient-category-label">Book Appointment</p>
                  <span className="patient-category-desc">Schedule with a doctor</span>
                </Link>
                <Link to="/doctors" className="patient-category-card patient-category-orange">
                  <span className="patient-category-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <p className="patient-category-label">Browse Doctors</p>
                  <span className="patient-category-desc">Find a doctor</span>
                </Link>
                <Link to="/patient/medical-history" className="patient-category-card patient-category-purple">
                  <span className="patient-category-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </span>
                  <p className="patient-category-label">Medical History</p>
                  <span className="patient-category-desc">View your records</span>
                </Link>
              </div>
            </section>

            <section className="patient-appointments-section">
              <h3>My Appointments</h3>
              {loadingAppointments ? (
                <p className="patient-appointments-msg">Loading appointments...</p>
              ) : appointmentsError ? (
                <p className="patient-appointments-msg patient-appointments-error">{appointmentsError}</p>
              ) : appointments.length === 0 ? (
                <p className="patient-appointments-msg">You haven&apos;t booked any appointments yet.</p>
              ) : (
                <div className="patient-appointments-table-wrap">
                  <table className="patient-appointments-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Doctor</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((apt) => (
                        <tr key={apt.id}>
                          <td>{formatDate(apt.appointmentDate)}</td>
                          <td>{apt.appointmentTime}</td>
                          <td>{apt.doctor?.name || apt.doctor?.username || '—'}</td>
                          <td>{apt.reason || '—'}</td>
                          <td>
                            <span className={`patient-appointment-status ${getStatusClass(apt.status)}`}>
                              {apt.status}
                            </span>
                          </td>
                          <td>
                            {canModify(apt) ? (
                              <div className="patient-appointment-actions">
                                <button
                                  type="button"
                                  className="patient-apt-btn patient-apt-btn-reschedule"
                                  onClick={() => openReschedule(apt)}
                                >
                                  Reschedule
                                </button>
                                <button
                                  type="button"
                                  className="patient-apt-btn patient-apt-btn-cancel"
                                  onClick={() => handleCancel(apt)}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {rescheduleApt && (
        <div className="patient-reschedule-backdrop" onClick={closeReschedule}>
          <div className="patient-reschedule-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Reschedule appointment</h3>
            <p className="patient-reschedule-doc">
              with {rescheduleApt.doctor?.name || rescheduleApt.doctor?.username || 'Doctor'}
            </p>
            <form onSubmit={handleRescheduleSubmit}>
              {rescheduleError && <p className="patient-reschedule-error">{rescheduleError}</p>}
              <div className="patient-reschedule-row">
                <label>
                  <span>Date</span>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>Time</span>
                  <input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    required
                  />
                </label>
              </div>
              <label className="patient-reschedule-reason">
                <span>Reason (optional)</span>
                <textarea
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  rows={2}
                  placeholder="Reason for visit"
                />
              </label>
              <div className="patient-reschedule-btns">
                <button type="submit" disabled={rescheduleSubmitting} className="patient-apt-btn patient-apt-btn-reschedule">
                  {rescheduleSubmitting ? 'Saving...' : 'Save'}
                </button>
                <button type="button" onClick={closeReschedule} className="patient-apt-btn patient-apt-btn-cancel">
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home
