import { useState, useEffect } from 'react'
import api from '../../../services/api'
import './PatientsManagement.css'

const PatientsManagement = () => {
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    loadPatients()
  }, [searchTerm])

  const applySearch = () => {
    setSearchTerm(searchInput.trim())
  }

  const loadPatients = async () => {
    try {
      setLoading(true)
      const response = await api.get('/auth/users', {
        params: {
          role: 'patient',
          search: searchTerm || undefined,
          limit: 100
        }
      })
      setPatients(response.data.users || [])
    } catch (error) {
      console.error('Error loading patients:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = (patient: any) => {
    setSelectedPatient(patient)
    setShowModal(true)
  }

  const handleDelete = async (patientId: string, patientName: string) => {
    if (window.confirm(`Are you sure you want to delete patient "${patientName}"? This action cannot be undone.`)) {
      try {
        setLoading(true)
        await api.delete(`/auth/account/${patientId}`)
        alert('Patient deleted successfully!')
        await loadPatients()
      } catch (error: any) {
        console.error('Error deleting patient:', error)
        const errorMessage = error.response?.data?.message || 'Failed to delete patient. Please try again.'
        alert(errorMessage)
      } finally {
        setLoading(false)
      }
    }
  }

  if (loading) {
    return <div className="page-loading">Loading patients...</div>
  }

  return (
    <div className="patients-management">
      <div className="page-header">
        <div>
          <h2>Patients Management</h2>
          <p>Manage all patients in the system</p>
        </div>
      </div>

      <div className="filters-section">
        <div className="search-bar">
          <input
            type="search"
            placeholder="Search by name, username, or email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                applySearch()
              }
            }}
            autoComplete="off"
            enterKeyHint="search"
          />
        </div>
      </div>

      <div className="table-container">
        <table className="patients-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Blood Group</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {patients.length === 0 ? (
              <tr>
                <td colSpan={6} className="no-data">
                  No patients found
                </td>
              </tr>
            ) : (
              patients.map((patient) => (
                <tr key={patient.id}>
                  <td>
                    {patient.firstName && patient.lastName
                      ? `${patient.firstName} ${patient.lastName}`
                      : patient.username}
                  </td>
                  <td>{patient.email}</td>
                  <td>{patient.phoneNumber || 'N/A'}</td>
                  <td>{patient.bloodGroup || 'N/A'}</td>
                  <td>
                    <span className={`status-badge status-${patient.isActive ? 'active' : 'inactive'}`}>
                      {patient.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="view-btn"
                        onClick={() => handleViewDetails(patient)}
                        title="View Details"
                      >
                        View
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(
                          patient.id,
                          patient.firstName && patient.lastName
                            ? `${patient.firstName} ${patient.lastName}`
                            : patient.username
                        )}
                        title="Delete Patient"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Patient Details</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <strong>Name:</strong>
                <span>
                  {selectedPatient.firstName && selectedPatient.lastName
                    ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
                    : selectedPatient.username}
                </span>
              </div>
              <div className="detail-row">
                <strong>Email:</strong>
                <span>{selectedPatient.email}</span>
              </div>
              <div className="detail-row">
                <strong>Phone:</strong>
                <span>{selectedPatient.phoneNumber || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <strong>Blood Group:</strong>
                <span>{selectedPatient.bloodGroup || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <strong>Status:</strong>
                <span className={`status-badge status-${selectedPatient.isActive ? 'active' : 'inactive'}`}>
                  {selectedPatient.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PatientsManagement
