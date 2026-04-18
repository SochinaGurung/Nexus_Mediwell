import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { doctorService, type Doctor } from '../../services/doctorService'
import './Doctors.css'

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>('')

  useEffect(() => {
    fetchDoctors()
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchDoctors()
    }, 500) 

    return () => clearTimeout(timeoutId)
  }, [searchTerm, selectedDepartment, selectedSpecialization])

  const fetchDoctors = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await doctorService.getAllDoctors({
        department: selectedDepartment || undefined,
        specialization: selectedSpecialization || undefined,
        search: searchTerm || undefined
      })
      setDoctors(response.doctors)
    } catch (err: unknown) {
      const errorMessage =
        (err as { message?: string })?.message ||
        'Failed to load doctors. Please try again later.'
      setError(errorMessage)
      console.error('Error fetching doctors:', err)
    } finally {
      setLoading(false)
    }
  }

  const departments = Array.from(new Set(doctors.map(d => d.department).filter(Boolean)))
  const specializations = Array.from(new Set(doctors.map(d => d.specialization).filter(Boolean)))

  return (
    <>
      <Header />
      <div className="doctors-page">
        <div className="doctors-container">
          {/* Header Section */}
          <div className="doctors-header">
            <h1>Our Doctors</h1>
            <p>Meet our experienced and dedicated medical professionals</p>
            
            {/* Search and Filters */}
            <div className="filters-section">
              <div className="search-bar">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
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
                <input
                  type="text"
                  placeholder="Search doctors by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="filter-selects">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedSpecialization}
                  onChange={(e) => setSelectedSpecialization(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Specializations</option>
                  {specializations.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading doctors...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="error-container">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M12 8V12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M12 16H12.01"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <p>{error}</p>
              <button onClick={fetchDoctors} className="retry-btn">
                Try Again
              </button>
            </div>
          )}

          {/* Doctors Grid */}
          {!loading && !error && (
            <>
              {doctors.length === 0 ? (
                <div className="no-doctors">
                  <p>No doctors found.</p>
                  {(searchTerm || selectedDepartment || selectedSpecialization) && (
                    <button
                      onClick={() => {
                        setSearchTerm('')
                        setSelectedDepartment('')
                        setSelectedSpecialization('')
                      }}
                      className="clear-filters-btn"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="doctors-count">
                    <p>
                      Showing <strong>{doctors.length}</strong> doctor
                      {doctors.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="doctors-grid">
                    {doctors.map((doctor) => (
                      <div key={doctor.id} className="doctor-card">
                        <div className="doctor-avatar">
                          {doctor.profilePicture ? (
                            <img src={doctor.profilePicture} alt={doctor.username} />
                          ) : (
                            <div className="avatar-placeholder">
                              {(doctor.firstName?.[0] || doctor.lastName?.[0] || doctor.username[0]).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="doctor-info">
                          <h3>
                            {doctor.firstName || doctor.lastName
                              ? `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim()
                              : doctor.username}
                          </h3>
                          {doctor.specialization && (
                            <p className="doctor-specialization">{doctor.specialization}</p>
                          )}
                          {doctor.department && (
                            <p className="doctor-department">{doctor.department}</p>
                          )}
                          {doctor.yearsOfExperience !== undefined && (
                            <p className="doctor-experience">
                              {doctor.yearsOfExperience} {doctor.yearsOfExperience === 1 ? 'year' : 'years'} of experience
                            </p>
                          )}
                          {doctor.consultationFee !== undefined && (
                            <p className="doctor-fee">Consultation: ${doctor.consultationFee}</p>
                          )}
                          {doctor.bio && (
                            <p className="doctor-bio">{doctor.bio}</p>
                          )}
                        </div>
                        <div className="doctor-card-footer">
                          <Link to={`/doctors/${doctor.id}`} className="view-profile-btn">
                            View Profile
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}
