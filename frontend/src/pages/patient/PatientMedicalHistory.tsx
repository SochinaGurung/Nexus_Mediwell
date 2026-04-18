import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { authService } from '../../services/authService'
import './PatientMedicalHistory.css'

interface MedicalHistoryEntry {
  condition: string
  diagnosisDate?: string
  symptoms?: string
  prescription?: string
  notes?: string
  followUpInstructions?: string
  testRecommendations?: string
}

export default function PatientMedicalHistory() {
  const navigate = useNavigate()
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login')
      return
    }
    const currentUser = authService.getCurrentUser()
    if (currentUser && currentUser.role !== 'patient') {
      navigate('/patient/dashboard')
      return
    }
    fetchProfile()
  }, [navigate])

  async function fetchProfile() {
    try {
      setLoading(true)
      const res = await authService.getProfile()
      const profile = res.user as { medicalHistory?: MedicalHistoryEntry[] }
      setMedicalHistory(Array.isArray(profile.medicalHistory) ? profile.medicalHistory : [])
    } catch {
      setMedicalHistory([])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <>
      <Header />
      <div className="patient-medical-history-page">
        <div className="patient-medical-history-container">
          <div className="patient-medical-history-header">
            <h1>Medical History</h1>
            <Link to="/patient/dashboard" className="back-link">← Back to dashboard</Link>
          </div>
          {loading ? (
            <div className="loading-container">
              <div className="spinner" />
              <p>Loading...</p>
            </div>
          ) : medicalHistory.length === 0 ? (
            <div className="patient-medical-empty">
              <p>No medical history recorded.</p>
              <p>You can add entries in your <Link to="/patient/profile/edit">profile</Link>.</p>
            </div>
          ) : (
            <div className="patient-medical-list">
              {medicalHistory.map((entry, idx) => (
                <div key={idx} className="patient-medical-item">
                  <div className="patient-medical-item-header">
                    <strong>{entry.condition}</strong>
                    {entry.diagnosisDate && (
                      <span className="patient-medical-date">{formatDate(entry.diagnosisDate)}</span>
                    )}
                  </div>
                  {entry.symptoms && (
                    <div className="patient-medical-row">
                      <span className="patient-medical-label">Symptoms:</span>
                      <span>{entry.symptoms}</span>
                    </div>
                  )}
                  {entry.prescription && (
                    <div className="patient-medical-row">
                      <span className="patient-medical-label">Prescription / medicines:</span>
                      <span>{entry.prescription}</span>
                    </div>
                  )}
                  {entry.notes && (
                    <div className="patient-medical-row">
                      <span className="patient-medical-label">Doctor notes:</span>
                      <span>{entry.notes}</span>
                    </div>
                  )}
                  {entry.followUpInstructions && (
                    <div className="patient-medical-row">
                      <span className="patient-medical-label">Follow-up:</span>
                      <span>{entry.followUpInstructions}</span>
                    </div>
                  )}
                  {entry.testRecommendations && (
                    <div className="patient-medical-row">
                      <span className="patient-medical-label">Test recommendations:</span>
                      <span>{entry.testRecommendations}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}
