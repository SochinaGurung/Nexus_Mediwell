import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { departmentService, type Department } from '../../services/departmentService'
import './DepartmentDetails.css'

interface Doctor {
  id: string
  username: string
  email: string
  firstName?: string
  lastName?: string
  phoneNumber?: string
  specialization?: string
  department?: string
  yearsOfExperience?: number
  consultationFee?: number
  bio?: string
  profilePicture?: string
  qualifications?: Array<{
    degree: string
    institution: string
    year: number
  }>
}

export default function DepartmentDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [department, setDepartment] = useState<Department | null>(null)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (id) {
      fetchDepartmentDetails()
      fetchDoctors()
    }
  }, [id])

  const fetchDepartmentDetails = async () => {
    try {
      setLoading(true)
      setError('')
      const departmentData = await departmentService.getDepartmentById(id!)
      setDepartment(departmentData)
    } catch (err: unknown) {
      const errorMessage =
        (err as { message?: string })?.message ||
        'Failed to load department details. Please try again later.'
      setError(errorMessage)
      console.error('Error fetching department:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchDoctors = async () => {
    try {
      const response = await departmentService.getDoctorsByDepartment(id!)
      setDoctors(response.doctors)
    } catch (err: unknown) {
      console.error('Error fetching doctors:', err)
      // Don't set error state here, just log it
    }
  }

  const formatOperatingHours = (hours?: {
    [key: string]: { open: boolean; startTime?: string; endTime?: string }
  }) => {
    if (!hours) return null

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    const openDays = days.filter(day => hours[day]?.open)

    if (openDays.length === 0) return null

    return openDays.map(day => {
      const dayHours = hours[day]
      const dayName = day.charAt(0).toUpperCase() + day.slice(1)
      if (dayHours.startTime && dayHours.endTime) {
        return `${dayName}: ${dayHours.startTime} - ${dayHours.endTime}`
      }
      return dayName
    })
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="department-details-page">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading department details...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (error || !department) {
    return (
      <>
        <Header />
        <div className="department-details-page">
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
            <p>{error || 'Department not found'}</p>
            <button onClick={() => navigate('/departments')} className="back-btn">
              Back to Departments
            </button>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  const operatingHours = formatOperatingHours(department.operatingHours)

  return (
    <>
      <Header />
      <div className="department-details-page">
        <div className="department-details-container">
          {/* Back Button */}
          <Link to="/departments" className="back-link">
            ← Back to Departments
          </Link>

          {/* Department Header */}
          <div className="department-header-section">
            <div className="department-header-content">
              {department.departmentCode && (
                <span className="department-code-badge">{department.departmentCode}</span>
              )}
              <h1>{department.departmentName}</h1>
              <p className="department-description-full">{department.description}</p>
            </div>
          </div>

          {/* Department Information */}
          <div className="department-info-section">
            <h2>Department Information</h2>
            <div className="info-grid">
              {department.location && (
                <div className="info-item">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10 10C11.3807 10 12.5 8.88071 12.5 7.5C12.5 6.11929 11.3807 5 10 5C8.61929 5 7.5 6.11929 7.5 7.5C7.5 8.88071 8.61929 10 10 10Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M10 18.3333C13.3333 15.8333 16.6667 12.6667 16.6667 9.16667C16.6667 5.66667 13.3333 2.5 10 2.5C6.66667 2.5 3.33333 5.66667 3.33333 9.16667C3.33333 12.6667 6.66667 15.8333 10 18.3333Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  <div>
                    <strong>Location</strong>
                    <p>
                      {[
                        department.location.floor,
                        department.location.building,
                        department.location.roomNumber
                      ]
                        .filter(Boolean)
                        .join(', ') || 'Not specified'}
                    </p>
                  </div>
                </div>
              )}

              
              {department.headOfDepartment && (
                <div className="info-item">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M10 12C5.58172 12 2 14.6863 2 18V20H18V18C18 14.6863 14.4183 12 10 12Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  <div>
                    <strong>Head of Department</strong>
                    <p>
                      {department.headOfDepartment.firstName || department.headOfDepartment.lastName
                        ? `${department.headOfDepartment.firstName || ''} ${department.headOfDepartment.lastName || ''}`.trim()
                        : department.headOfDepartment.username}
                      {department.headOfDepartment.specialization && ` - ${department.headOfDepartment.specialization}`}
                    </p>
                  </div>
                </div>
              )}

              {operatingHours && operatingHours.length > 0 && (
                <div className="info-item">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M10 6V10L12 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div>
                    <strong>Operating Hours</strong>
                    <p>{operatingHours.join(', ')}</p>
                  </div>
                </div>
              )}
            </div>

            {department.specialties && department.specialties.length > 0 && (
              <div className="specialties-section">
                <h3>Specialties</h3>
                <div className="specialty-tags">
                  {department.specialties.map((specialty, idx) => (
                    <span key={idx} className="specialty-tag">
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {department.services && department.services.length > 0 && (
              <div className="services-section">
                <h3>Services Offered</h3>
                <ul className="services-list">
                  {department.services.map((service, idx) => (
                    <li key={idx}>{service}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Doctors Section */}
          <div className="doctors-section">
            <h2>Our Doctors ({doctors.length})</h2>
            {doctors.length === 0 ? (
              <div className="no-doctors">
                <p>No doctors currently assigned to this department.</p>
              </div>
            ) : (
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
                      {doctor.yearsOfExperience && (
                        <p className="doctor-experience">
                          {doctor.yearsOfExperience} {doctor.yearsOfExperience === 1 ? 'year' : 'years'} of experience
                        </p>
                      )}
                      {doctor.consultationFee && (
                        <p className="doctor-fee">Consultation Fee: ${doctor.consultationFee}</p>
                      )}
                      {doctor.bio && (
                        <p className="doctor-bio">{doctor.bio}</p>
                      )}
                      {doctor.qualifications && doctor.qualifications.length > 0 && (
                        <div className="doctor-qualifications">
                          <strong>Qualifications:</strong>
                          <ul>
                            {doctor.qualifications.map((qual, idx) => (
                              <li key={idx}>
                                {qual.degree} - {qual.institution} ({qual.year})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
