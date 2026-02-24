import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { authService } from '../../services/authService'
//import './DoctorProfile.css'

interface DoctorProfile {
  id: string
  username: string
  email: string
  role: string
  firstName?: string
  lastName?: string
  phoneNumber?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  dateOfBirth?: string
  gender?: string
  profilePicture?: string
  specialization?: string
  department?: string
  licenseNumber?: string
  qualifications?: Array<{
    degree: string
    institution: string
    year: number
  }>
  yearsOfExperience?: number
  consultationFee?: number
  availability?: {
    [key: string]: {
      available: boolean
      startTime?: string
      endTime?: string
    }
  }
  bio?: string
  createdAt?: string
  updatedAt?: string
}

export default function DoctorProfile() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<DoctorProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
      navigate('/login')
      return
    }

    // Check if user is a doctor
    const currentUser = authService.getCurrentUser()
    if (currentUser && currentUser.role !== 'doctor') {
      navigate('/patient/dashboard')
      return
    }

    fetchProfile()
  }, [navigate])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await authService.getProfile()
      
      // Verify it's a doctor profile
      if (response.user.role !== 'doctor') {
        setError('Access denied. This page is for doctors only.')
        return
      }
      
      setProfile(response.user as DoctorProfile)
    } catch (err: unknown) {
      const errorMessage =
        (err as { message?: string })?.message ||
        'Failed to load profile. Please try again later.'
      setError(errorMessage)
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not provided'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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
        return {
          day: dayName,
          time: `${dayAvailability.startTime} - ${dayAvailability.endTime}`
        }
      }
      return {
        day: dayName,
        time: 'Available'
      }
    })
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="doctor-profile-page">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading profile...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (error || !profile) {
    return (
      <>
        <div className="doctor-profile-page">
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
            <p>{error || 'Profile not found'}</p>
            <button onClick={fetchProfile} className="retry-btn">
              Try Again
            </button>
          </div>
        </div>
      </>
    )
  }

  const fullName = profile.firstName || profile.lastName
    ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
    : profile.username

  const addressString = profile.address
    ? [
        profile.address.street,
        profile.address.city,
        profile.address.state,
        profile.address.zipCode,
        profile.address.country
      ]
        .filter(Boolean)
        .join(', ')
    : 'Not provided'

  const availability = formatAvailability(profile.availability)

  return (
    <>
      <div className="doctor-profile-page">
        <div className="doctor-profile-container">
          {/* Header Section */}
          <div className="profile-header-section">
            <div className="profile-header-content">
              <div className="profile-avatar-large">
                {profile.profilePicture ? (
                  <img src={profile.profilePicture} alt={fullName} />
                ) : (
                  <div className="avatar-placeholder-large">
                    {(profile.firstName?.[0] || profile.lastName?.[0] || profile.username[0]).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="profile-header-info">
                <h1>{fullName}</h1>
                {profile.specialization && (
                  <p className="profile-specialization">{profile.specialization}</p>
                )}
                <p className="profile-department">
                  {profile.department ? (
                    <span>Department: {profile.department}</span>
                  ) : (
                    <span className="not-assigned">Department: Not assigned</span>
                  )}
                </p>
                <p className="profile-username">@{profile.username}</p>
                <p className="profile-email">{profile.email}</p>
                <Link to="/doctor/profile/edit" className="edit-profile-btn">
                  Edit Profile
                </Link>
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="profile-section">
            <h2>Professional Information</h2>
            <div className="info-grid">
              {profile.specialization && (
                <div className="info-item">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10 2L12 8H8L10 2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10 18C13.3137 18 16 15.3137 16 12C16 8.68629 13.3137 6 10 6C6.68629 6 4 8.68629 4 12C4 15.3137 6.68629 18 10 18Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  <div>
                    <strong>Specialization</strong>
                    <p>{profile.specialization}</p>
                  </div>
                </div>
              )}

              <div className="info-item">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 4H17M3 8H17M3 12H17M3 16H17"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <div>
                  <strong>Department</strong>
                  <p>{profile.department || 'Not assigned'}</p>
                </div>
              </div>

              {profile.licenseNumber && (
                <div className="info-item">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4 4H16C17.1046 4 18 4.89543 18 6V16C18 17.1046 17.1046 18 16 18H4C2.89543 18 2 17.1046 2 16V6C2 4.89543 2.89543 4 4 4Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M6 8H14M6 12H10"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div>
                    <strong>License Number</strong>
                    <p>{profile.licenseNumber}</p>
                  </div>
                </div>
              )}

              {profile.yearsOfExperience !== undefined && (
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
                    <strong>Years of Experience</strong>
                    <p>{profile.yearsOfExperience} {profile.yearsOfExperience === 1 ? 'year' : 'years'}</p>
                  </div>
                </div>
              )}

              {profile.consultationFee !== undefined && (
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
                    <p>${profile.consultationFee}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Personal Information */}
          <div className="profile-section">
            <h2>Personal Information</h2>
            <div className="info-grid">
              {profile.phoneNumber && (
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
                    <strong>Phone Number</strong>
                    <p>{profile.phoneNumber}</p>
                  </div>
                </div>
              )}

              {profile.dateOfBirth && (
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
                    <strong>Date of Birth</strong>
                    <p>{formatDate(profile.dateOfBirth)}</p>
                  </div>
                </div>
              )}

              {profile.gender && (
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
                    <strong>Gender</strong>
                    <p>{profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}</p>
                  </div>
                </div>
              )}

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
                  <strong>Address</strong>
                  <p>{addressString}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="profile-section">
              <h2>About</h2>
              <p className="doctor-bio-full">{profile.bio}</p>
            </div>
          )}

          {/* Qualifications */}
          {profile.qualifications && profile.qualifications.length > 0 && (
            <div className="profile-section">
              <h2>Qualifications</h2>
              <div className="qualifications-list">
                {profile.qualifications.map((qual, idx) => (
                  <div key={idx} className="qualification-item">
                    <div className="qualification-header">
                      <strong>{qual.degree}</strong>
                      <span className="qual-year">{qual.year}</span>
                    </div>
                    <p className="qualification-institution">{qual.institution}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Availability */}
          {availability && availability.length > 0 && (
            <div className="profile-section">
              <h2>Availability</h2>
              <div className="availability-grid">
                {availability.map((item, idx) => (
                  <div key={idx} className="availability-item">
                    <strong>{item.day}</strong>
                    <p>{item.time}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Account Information */}
          <div className="profile-section">
            <h2>Account Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <strong>Username</strong>
                <p>{profile.username}</p>
              </div>
              <div className="info-item">
                <strong>Email</strong>
                <p>{profile.email}</p>
              </div>
              {profile.createdAt && (
                <div className="info-item">
                  <strong>Member Since</strong>
                  <p>{formatDate(profile.createdAt)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
