import { useState, useEffect, useMemo } from 'react'
import { appointmentService } from '../../../services/appointmentService'
import type { Appointment } from '../../../services/appointmentService'
import './AppointmentsManagement.css'

interface DoctorPatientCount {
  doctorId: string
  doctorName: string
  department: string
  patientCount: number
}

const AppointmentsManagement = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    loadAppointments()
  }, [filterStatus])

  const loadAppointments = async () => {
    try {
      setLoading(true)
      const response = await appointmentService.getAllAppointments({
        limit: '500',
        sortBy: 'appointmentDate',
        sortOrder: 'desc',
        ...(filterStatus !== 'all' ? { status: filterStatus } : {})
      })
      setAppointments(response.appointments || [])
    } catch (error) {
      console.error('Error loading appointments:', error)
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  const patientsPerDoctor = useMemo((): DoctorPatientCount[] => {
    const byDoctor = new Map<string, Set<string>>()
    for (const app of appointments) {
      const doctorId = app.doctor?.id
      const patientId = app.patient?.id
      if (!doctorId || !patientId) continue
      if (!byDoctor.has(doctorId)) {
        byDoctor.set(doctorId, new Set())
      }
      byDoctor.get(doctorId)!.add(patientId)
    }
    const list: DoctorPatientCount[] = []
    byDoctor.forEach((patientIds, doctorId) => {
      const app = appointments.find(a => a.doctor?.id === doctorId)
      list.push({
        doctorId,
        doctorName: app?.doctor?.name || 'Unknown',
        department: app?.doctor?.department || '—',
        patientCount: patientIds.size
      })
    })
    list.sort((a, b) => b.patientCount - a.patientCount)
    return list
  }, [appointments])

  if (loading) {
    return <div className="page-loading">Loading appointments...</div>
  }

  return (
    <div className="appointments-management">
      <div className="page-header">
        <div>
          <h2>Appointments Management</h2>
          <p>Manage all appointments in the system</p>
        </div>
        <button className="add-btn">
          + Create Appointment
        </button>
      </div>

      {/* Patients appointments per doctor */}
      {patientsPerDoctor.length > 0 && (
        <section className="appointments-patients-per-doctor">
          <h3 className="appointments-section-title">Patients per doctor</h3>
          <p className="appointments-section-desc">Number of unique patients each doctor has appointments with (from current list)</p>
          <div className="table-container">
            <table className="appointments-table doctor-patient-count-table">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Department</th>
                  <th>Patient count</th>
                </tr>
              </thead>
              <tbody>
                {patientsPerDoctor.map((row) => (
                  <tr key={row.doctorId}>
                    <td>{row.doctorName}</td>
                    <td>{row.department}</td>
                    <td><strong>{row.patientCount}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="filters-section">
        <select
          className="filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="table-container">
        <table className="appointments-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Department</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.length === 0 ? (
              <tr>
                <td colSpan={7} className="no-data">No appointments found</td>
              </tr>
            ) : (
              appointments.map((app) => (
                <tr key={app.id}>
                  <td>{app.patient?.name || app.patient?.username || 'N/A'}</td>
                  <td>{app.doctor?.name || app.doctor?.username || 'N/A'}</td>
                  <td>{app.doctor?.department || 'N/A'}</td>
                  <td>{new Date(app.appointmentDate).toLocaleDateString()}</td>
                  <td>{app.appointmentTime || 'N/A'}</td>
                  <td>
                    <span className={`status-badge status-${app.status?.toLowerCase() || 'pending'}`}>
                      {app.status || 'Pending'}
                    </span>
                  </td>
                  <td>
                    <button className="edit-btn">Edit</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AppointmentsManagement
