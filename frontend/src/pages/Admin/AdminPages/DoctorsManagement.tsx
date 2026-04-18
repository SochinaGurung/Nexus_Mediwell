import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { doctorService } from '../../../services/doctorService'
import api from '../../../services/api'
//import './DoctorsManagement.css'

const DoctorsManagement = () => {
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    loadDoctors()
  }, [searchTerm, filterStatus])

  const applySearch = () => {
    setSearchTerm(searchInput.trim())
  }

  const loadDoctors = async () => {
    try {
      setLoading(true)
      const response = await doctorService.getAllDoctors({
        search: searchTerm || undefined
      })
      let filteredDoctors = response.doctors || []
      
      if (filterStatus !== 'all') {
        filteredDoctors = filteredDoctors.filter((doc: any) => 
          filterStatus === 'active' ? doc.isActive : !doc.isActive
        )
      }
      
      setDoctors(filteredDoctors)
    } catch (error) {
      console.error('Error loading doctors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (doctorId: string, doctorName: string) => {
    if (window.confirm(`Are you sure you want to delete doctor "${doctorName}"? This action cannot be undone.`)) {
      try {
        setLoading(true)
        await api.delete(`/auth/account/${doctorId}`)
        alert('Doctor deleted successfully!')
        await loadDoctors()
      } catch (error: any) {
        console.error('Error deleting doctor:', error)
        const errorMessage = error.response?.data?.message || 'Failed to delete doctor. Please try again.'
        alert(errorMessage)
      } finally {
        setLoading(false)
      }
    }
  }

  if (loading) {
    return <div className="page-loading">Loading doctors...</div>
  }

  return (
    <div className="doctors-management">
      <div className="page-header">
        <div>
          <h2>Doctors Management</h2>
          <p>Manage all doctors in the system</p>
        </div>
        <Link to="/admin/add-doctor" className="add-btn">
        + Add Doctor
        </Link>
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
        <select
          className="filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="table-container">
        <table className="doctors-table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Name</th>
              <th>Specialty</th>
              <th>Department</th>
              <th>Consultation Fee</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {doctors.length === 0 ? (
              <tr>
                <td colSpan={7} className="no-data">
                  No doctors found
                </td>
              </tr>
            ) : (
              doctors.map((doctor) => (
                <tr key={doctor.id}>
                  <td>
                    <div className="doctor-photo">
                      {doctor.profilePicture ? (
                        <img src={doctor.profilePicture} alt={doctor.firstName} />
                      ) : (
                        <div className="photo-placeholder">
                          {(doctor.firstName?.[0] || doctor.username[0]).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="doctor-name">
                      {doctor.firstName && doctor.lastName
                        ? `${doctor.firstName} ${doctor.lastName}`
                        : doctor.username}
                    </div>
                    <div className="doctor-email">{doctor.email}</div>
                  </td>
                  <td>{doctor.specialization || 'N/A'}</td>
                  <td>{doctor.department || 'N/A'}</td>
                  <td>Rs. {Number(doctor.consultationFee ?? 0).toLocaleString()}</td>
                  <td>
                    <span className={`status-badge status-${doctor.isActive ? 'active' : 'inactive'}`}>
                      {doctor.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(
                          doctor.id,
                          doctor.firstName && doctor.lastName
                            ? `${doctor.firstName} ${doctor.lastName}`
                            : doctor.username
                        )}
                        title="Delete Doctor"
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
    </div>
  )
}

export default DoctorsManagement
