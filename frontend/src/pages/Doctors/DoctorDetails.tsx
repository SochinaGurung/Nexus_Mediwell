import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { doctorService, type Doctor } from '../../services/doctorService'
import { authService } from '../../services/authService'
import './DoctorDetails.css'

export default function DoctorDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (id) {
      fetchDoctorDetails()
    }
  }, [id])

  const fetchDoctorDetails = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await doctorService.getDoctorById(id!)
      setDoctor(response.doctor)
    } catch (err: unknown) {
      const errorMessage =
        (err as { message?: string })?.message ||
        'Failed to load doctor details. Please try again later.'
      setError(errorMessage)
      console.error('Error fetching doctor:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatAvailability = (availability?: {
    [key: string]: {
      available: boolean
      startTime?: string
      endTime?: string
    }
  }) => {
    if (!availability) return null

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    const availableDays = days.filter(day => availability[day]?.available)

    if (availableDays.length === 0) return null

    return availableDays.map(day => {
      const dayAvailability = availability[day]
      const dayName = day.charAt(0).toUpperCase() + day.slice(1)
      if (dayAvailability.startTime && dayAvailability.endTime) {
        return `${dayName}: ${dayAvailability.startTime} - ${dayAvailability.endTime}`
      }
      return dayName
    })
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="doctor-details-page">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading doctor details...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (error || !doctor) {
    return (
      <>
        <Header />
        <div className="doctor-details-page">
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
            <p>{error || 'Doctor not found'}</p>
            <button onClick={() => navigate('/doctors')} className="back-btn">
              Back to Doctors
            </button>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  const availability = formatAvailability(doctor.availability)
  const fullName = doctor.firstName || doctor.lastName
    ? `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim()
    : doctor.username

  const handleBookAppointment = () => {
    // Check if user is authenticated
    if (authService.isAuthenticated()) {
      // If logged in, navigate to appointment booking page
      localStorage.setItem('selectedDoctorId', doctor.id)
      navigate('/appointments/book')
    } else {
      // If not logged in, navigate to login with doctor ID stored
      localStorage.setItem('selectedDoctorId', doctor.id)
      navigate('/login', { state: { from: 'book-appointment', doctorId: doctor.id } })
    }
  }

  return (
    <>
      <Header />
      <div className="doctor-details-page">
        <div className="doctor-details-container">
          {/* Back Button */}
          <Link to="/doctors" className="back-link">
            ← Back to Doctors
          </Link>

          {/* Doctor Header */}
          <div className="doctor-header-section">
            <div className="doctor-header-content">
              <div className="doctor-avatar-large">
                {doctor.profilePicture ? (
                  <img src={doctor.profilePicture} alt={fullName} />
                ) : (
                  <div className="avatar-placeholder-large">
                    {(doctor.firstName?.[0] || doctor.lastName?.[0] || doctor.username[0]).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="doctor-header-info">
                <h1>{fullName}</h1>
                {doctor.specialization && (
                  <p className="doctor-specialization-header">{doctor.specialization}</p>
                )}
                {doctor.department && (
                  <p className="doctor-department-header">{doctor.department}</p>
                )}
                {doctor.yearsOfExperience !== undefined && (
                  <p className="doctor-experience-header">
                    {doctor.yearsOfExperience} {doctor.yearsOfExperience === 1 ? 'year' : 'years'} of experience
                  </p>
                )}
                <button onClick={handleBookAppointment} className="book-appointment-btn">
                  Book Appointment
                </button>
              </div>
            </div>
          </div>

          {/* Doctor Information */}
          <div className="doctor-info-section">
            <h2>Doctor Information</h2>
            <div className="info-grid">
              {doctor.email && (
                <div className="info-item">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2 5L10 10L18 5M2 5L2 15L18 15L18 5M2 5L10 10L18 5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div>
                    <strong>Email</strong>
                    <p>{doctor.email}</p>
                  </div>
                </div>
              )}

              {doctor.phoneNumber && (
                <div className="info-item">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2 3C2 2.44772 2.44772 2 3 2H5.15287C5.64171 2 6.0589 2.35341 6.13927 2.8356L6.87858 7.27147C6.95075 7.70451 6.73206 8.13397 6.33939 8.3083L4.79126 9.10412C5.90715 11.8783 8.12167 14.0928 10.8959 15.2087L11.6917 13.6606C11.866 13.2679 12.2955 13.0492 12.7285 13.1214L17.1644 13.8607C17.6466 13.9411 18 14.3583 18 14.8471V17C18 17.5523 17.5523 18 17 18H15C7.8203 18 2 12.1797 2 5V3Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  <div>
                    <strong>Phone</strong>
                    <p>{doctor.phoneNumber}</p>
                  </div>
                </div>
              )}

              {doctor.consultationFee !== undefined && (
                <div className="info-item">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10 2V18M2 10H18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <div>
                    <strong>Consultation Fee</strong>
                    <p>${doctor.consultationFee}</p>
                  </div>
                </div>
              )}

              {availability && availability.length > 0 && (
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
                    <strong>Availability</strong>
                    <p>{availability.join(', ')}</p>
                  </div>
                </div>
              )}
            </div>

            {doctor.bio && (
              <div className="bio-section">
                <h3>About</h3>
                <p className="doctor-bio-full">{doctor.bio}</p>
              </div>
            )}

            {doctor.qualifications && doctor.qualifications.length > 0 && (
              <div className="qualifications-section">
                <h3>Qualifications</h3>
                <ul className="qualifications-list">
                  {doctor.qualifications.map((qual, idx) => (
                    <li key={idx}>
                      <strong>{qual.degree}</strong>
                      <span>{qual.institution}</span>
                      <span className="qual-year">{qual.year}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
