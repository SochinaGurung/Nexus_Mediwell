import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { authService } from '../../services/authService'
import './PatientProfile.css'

interface PatientProfile {
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
  bloodGroup?: string
  emergencyContact?: {
    name?: string
    relationship?: string
    phoneNumber?: string
    email?: string
  }
  allergies?: string[]
  insuranceInfo?: {
    provider?: string
    policyNumber?: string
    groupNumber?: string
    expiryDate?: string
  }
  medicalHistory?: Array<{
    condition: string
    diagnosisDate?: string
    notes?: string
  }>
  createdAt?: string
  updatedAt?: string
}

export default function PatientProfile() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
      navigate('/login')
      return
    }

    fetchProfile()
  }, [navigate])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await authService.getProfile()
      setProfile(response.user)
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

  const calculateAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return null
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="patient-profile-page">
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
        <Header />
        <div className="patient-profile-page">
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
        <Footer />
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

  const age = calculateAge(profile.dateOfBirth)

  return (
    <>
      <Header />
      <div className="patient-profile-page">
        <div className="patient-profile-container">
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
                <p className="profile-username">@{profile.username}</p>
                <p className="profile-email">{profile.email}</p>
                <Link to="/patient/profile/edit" className="edit-profile-btn">
                  Edit Profile
                </Link>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="profile-section">
            <h2>Personal Information</h2>
            <div className="info-grid">
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
                  <strong>Full Name</strong>
                  <p>{fullName}</p>
                </div>
              </div>

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
                    <p>
                      {formatDate(profile.dateOfBirth)}
                      {age && ` (${age} years old)`}
                    </p>
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

              {profile.bloodGroup && (
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
                    <strong>Blood Group</strong>
                    <p>{profile.bloodGroup}</p>
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

          {/* Emergency Contact */}
          {profile.emergencyContact && (
            <div className="profile-section">
              <h2>Emergency Contact</h2>
              <div className="info-grid">
                {profile.emergencyContact.name && (
                  <div className="info-item">
                    <strong>Name</strong>
                    <p>{profile.emergencyContact.name}</p>
                  </div>
                )}
                {profile.emergencyContact.relationship && (
                  <div className="info-item">
                    <strong>Relationship</strong>
                    <p>{profile.emergencyContact.relationship}</p>
                  </div>
                )}
                {profile.emergencyContact.phoneNumber && (
                  <div className="info-item">
                    <strong>Phone Number</strong>
                    <p>{profile.emergencyContact.phoneNumber}</p>
                  </div>
                )}
                {profile.emergencyContact.email && (
                  <div className="info-item">
                    <strong>Email</strong>
                    <p>{profile.emergencyContact.email}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Medical Information */}
          <div className="profile-section">
            <h2>Medical Information</h2>
            
            {profile.allergies && profile.allergies.length > 0 && (
              <div className="medical-info-item">
                <h3>Allergies</h3>
                <div className="allergies-list">
                  {profile.allergies.map((allergy, idx) => (
                    <span key={idx} className="allergy-tag">
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.medicalHistory && profile.medicalHistory.length > 0 && (
              <div className="medical-info-item">
                <h3>Medical History</h3>
                <div className="medical-history-list">
                  {profile.medicalHistory.map((history, idx) => (
                    <div key={idx} className="history-item">
                      <div className="history-header">
                        <strong>{history.condition}</strong>
                        {history.diagnosisDate && (
                          <span className="history-date">
                            {formatDate(history.diagnosisDate)}
                          </span>
                        )}
                      </div>
                      {history.notes && (
                        <p className="history-notes">{history.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!profile.allergies || profile.allergies.length === 0) &&
              (!profile.medicalHistory || profile.medicalHistory.length === 0) && (
                <p className="no-medical-info">No medical information available.</p>
              )}
          </div>

          {/* Insurance Information */}
          {profile.insuranceInfo && (
            <div className="profile-section">
              <h2>Insurance Information</h2>
              <div className="info-grid">
                {profile.insuranceInfo.provider && (
                  <div className="info-item">
                    <strong>Provider</strong>
                    <p>{profile.insuranceInfo.provider}</p>
                  </div>
                )}
                {profile.insuranceInfo.policyNumber && (
                  <div className="info-item">
                    <strong>Policy Number</strong>
                    <p>{profile.insuranceInfo.policyNumber}</p>
                  </div>
                )}
                {profile.insuranceInfo.groupNumber && (
                  <div className="info-item">
                    <strong>Group Number</strong>
                    <p>{profile.insuranceInfo.groupNumber}</p>
                  </div>
                )}
                {profile.insuranceInfo.expiryDate && (
                  <div className="info-item">
                    <strong>Expiry Date</strong>
                    <p>{formatDate(profile.insuranceInfo.expiryDate)}</p>
                  </div>
                )}
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
      <Footer />
    </>
  )
}
