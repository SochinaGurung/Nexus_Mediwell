import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { patientService, type Patient, type MedicalRecordData } from '../../services/patientService'
import { appointmentService } from '../../services/appointmentService'
import { authService } from '../../services/authService'
import { medicineReminderService } from '../../services/medicineReminderService'
import './PatientRecords.css'

type LocationState = { patientId?: string; appointmentId?: string; patientName?: string } | null

export default function ManagePatientRecords() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as LocationState
  const appointmentId = locationState?.appointmentId
  const fromAppointmentPatientId = locationState?.patientId

  const [searchTerm, setSearchTerm] = useState<string>('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [searching, setSearching] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [markAppointmentCompleted, setMarkAppointmentCompleted] = useState<boolean>(!!appointmentId)

  const [medicalRecord, setMedicalRecord] = useState<MedicalRecordData>({
    condition: '',
    diagnosisDate: '',
    symptoms: '',
    prescription: '',
    notes: '',
    followUpInstructions: '',
    testRecommendations: ''
  })
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [medicineName, setMedicineName] = useState<string>('')
  const [medicineInstructions, setMedicineInstructions] = useState<string>('')
  const [medicineSubmitting, setMedicineSubmitting] = useState<boolean>(false)
  const [medicineFormError, setMedicineFormError] = useState<string>('')
  const [medicineFormSuccess, setMedicineFormSuccess] = useState<string>('')
  const hasPreSelectedFromAppointment = useRef(false)

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login')
      return
    }

    const currentUser = authService.getCurrentUser()
    if (currentUser && currentUser.role !== 'doctor') {
      navigate('/patient/dashboard')
      return
    }
  }, [navigate])

  // Pre-select patient when navigated from appointment (Add diagnostics)
  useEffect(() => {
    if (fromAppointmentPatientId && !hasPreSelectedFromAppointment.current) {
      hasPreSelectedFromAppointment.current = true
      selectPatient(fromAppointmentPatientId)
    }
  }, [fromAppointmentPatientId])

  useEffect(() => {
    if (searchTerm.length >= 2) {
      const timeoutId = setTimeout(() => {
        searchPatients()
      }, 500) // Debounce search

      return () => clearTimeout(timeoutId)
    } else {
      setPatients([])
    }
  }, [searchTerm])

  const searchPatients = async () => {
    try {
      setSearching(true)
      setError('')
      const response = await patientService.searchPatients(searchTerm)
      setPatients(response.patients)
    } catch (err: unknown) {
      const errorMessage = (err as { message?: string })?.message || 'Failed to search patients'
      setError(errorMessage)
      console.error('Error searching patients:', err)
    } finally {
      setSearching(false)
    }
  }

  const selectPatient = async (patientId: string) => {
    try {
      setLoading(true)
      setError('')
      const response = await patientService.getPatientWithRecords(patientId)
      setSelectedPatient(response.patient)
      setSearchTerm('')
      setPatients([])
    } catch (err: unknown) {
      const errorMessage = (err as { message?: string })?.message || 'Failed to load patient'
      setError(errorMessage)
      console.error('Error loading patient:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleMedicalRecordChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setMedicalRecord(prev => ({
      ...prev,
      [name]: value
    }))
    if (error) setError('')
    if (success) setSuccess('')
  }

  const handleAddMedicalRecord = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!medicalRecord.condition.trim()) {
      setError('Condition is required')
      return
    }

    if (!selectedPatient) {
      setError('Please select a patient first')
      return
    }

    setSubmitting(true)
    try {
      await patientService.addMedicalRecord(selectedPatient.id, {
        condition: medicalRecord.condition.trim(),
        diagnosisDate: medicalRecord.diagnosisDate || undefined,
        symptoms: medicalRecord.symptoms?.trim() || undefined,
        prescription: medicalRecord.prescription?.trim() || undefined,
        notes: medicalRecord.notes?.trim() || undefined,
        followUpInstructions: medicalRecord.followUpInstructions?.trim() || undefined,
        testRecommendations: medicalRecord.testRecommendations?.trim() || undefined
      })

      if (appointmentId && markAppointmentCompleted) {
        try {
          await appointmentService.updateAppointmentStatus(appointmentId, 'completed')
          setSuccess('Medical record added and appointment marked as completed.')
        } catch {
          setSuccess('Medical record added. Could not update appointment status.')
        }
      } else {
        setSuccess('Medical record added successfully!')
      }

      // Refresh patient data
      const response = await patientService.getPatientWithRecords(selectedPatient.id)
      setSelectedPatient(response.patient)

      // Reset form and clear appointment context from URL state
      setMedicalRecord({
        condition: '',
        diagnosisDate: '',
        symptoms: '',
        prescription: '',
        notes: '',
        followUpInstructions: '',
        testRecommendations: ''
      })
      setMedicineName('')
      setMedicineInstructions('')
      setMedicineFormError('')
      setMedicineFormSuccess('')
      if (appointmentId) {
        navigate('/doctor/manage-records', { replace: true, state: null })
      }

      setTimeout(() => setSuccess(''), 5000)
    } catch (err: unknown) {
      const errorMessage = (err as { message?: string })?.message || 'Failed to add medical record'
      setError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendMedicineToPatient = async () => {
    setMedicineFormError('')
    setMedicineFormSuccess('')
    if (!selectedPatient?.id) {
      setMedicineFormError('Please select a patient first.')
      return
    }
    if (!medicineName.trim()) {
      setMedicineFormError('Medicine name is required.')
      return
    }
    const name = medicineName.trim()
    const instr = medicineInstructions.trim()
    const chartLine = instr ? `${name}: ${instr}` : name
    try {
      setMedicineSubmitting(true)
      await medicineReminderService.createSuggestion(selectedPatient.id, {
        medicineName: name,
        instructions: instr || undefined,
        appointmentId: appointmentId || null
      })
      setMedicalRecord((prev) => {
        const prevRx = prev.prescription?.trim() || ''
        const nextRx = prevRx ? `${prevRx}\n${chartLine}` : chartLine
        return { ...prev, prescription: nextRx }
      })
      setMedicineFormSuccess('Sent to patient app and added to prescription below.')
      setMedicineName('')
      setMedicineInstructions('')
      setTimeout(() => setMedicineFormSuccess(''), 5000)
    } catch (err: unknown) {
      setMedicineFormError((err as { message?: string })?.message || 'Failed to send medicine to patient')
    } finally {
      setMedicineSubmitting(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getMinDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  return (
    <>
      <Header />
      <div className="manage-patient-records-page">
        <div className="manage-records-container">
          <div className="page-header">
            <h1>Manage Patient Medical Records</h1>
            <p>Search for a patient and add medical records to their profile</p>
          </div>

          {/* Patient Search */}
          <div className="search-section">
            <h2>Search Patient</h2>
            <div className="search-bar-wrapper">
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
                placeholder="Search by name, username, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searching && <div className="search-spinner"></div>}
            </div>

            {/* Search Results */}
            {patients.length > 0 && (
              <div className="search-results">
                {patients.map((patient) => {
                  const patientName = patient.firstName || patient.lastName
                    ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim()
                    : patient.username
                  return (
                    <div
                      key={patient.id}
                      className="patient-result-card"
                      onClick={() => selectPatient(patient.id)}
                    >
                      <div className="patient-result-info">
                        <h3>{patientName}</h3>
                        <p>{patient.email}</p>
                        {patient.phoneNumber && <p>{patient.phoneNumber}</p>}
                      </div>
                      <button className="select-patient-btn">Select</button>
                    </div>
                  )
                })}
              </div>
            )}

            {searchTerm.length >= 2 && !searching && patients.length === 0 && (
              <p className="no-results">No patients found</p>
            )}
          </div>

          {loading && (
            <p className="manage-records-loading-msg" role="status">
              Loading patient…
            </p>
          )}

          {/* Selected Patient Info */}
          {selectedPatient && (
            <div className="selected-patient-section">
              <h2>Selected Patient</h2>
              <div className="patient-info-card">
                <div className="patient-header">
                  <h3>
                    {selectedPatient.firstName || selectedPatient.lastName
                      ? `${selectedPatient.firstName || ''} ${selectedPatient.lastName || ''}`.trim()
                      : selectedPatient.username}
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedPatient(null)
                      setMedicalRecord({
                        condition: '',
                        diagnosisDate: '',
                        symptoms: '',
                        prescription: '',
                        notes: '',
                        followUpInstructions: '',
                        testRecommendations: ''
                      })
                      setMedicineName('')
                      setMedicineInstructions('')
                      setMedicineFormError('')
                      setMedicineFormSuccess('')
                    }}
                    className="clear-patient-btn"
                  >
                    Clear Selection
                  </button>
                </div>
                <div className="patient-details-grid">
                  <div>
                    <strong>Email:</strong> {selectedPatient.email}
                  </div>
                  {selectedPatient.phoneNumber && (
                    <div>
                      <strong>Phone:</strong> {selectedPatient.phoneNumber}
                    </div>
                  )}
                  {selectedPatient.bloodGroup && (
                    <div>
                      <strong>Blood Group:</strong> {selectedPatient.bloodGroup}
                    </div>
                  )}
                  {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                    <div>
                      <strong>Allergies:</strong> {selectedPatient.allergies.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Add Medical Record Form */}
          {selectedPatient && (
            <div className="add-record-section">
              {appointmentId && (
                <div className="add-record-appointment-banner">
                  <span>Adding diagnostics for this appointment.</span>
                  <label className="add-record-mark-completed-label">
                    <input
                      type="checkbox"
                      checked={markAppointmentCompleted}
                      onChange={(e) => setMarkAppointmentCompleted(e.target.checked)}
                    />
                    Mark appointment as completed after adding record
                  </label>
                </div>
              )}
              <h2>Add Medical Record</h2>
              <form onSubmit={handleAddMedicalRecord} className="medical-record-form">
                {error && <div className="form-error">{error}</div>}
                {success && <div className="form-success">{success}</div>}

                <div className="form-group">
                  <label htmlFor="condition">
                    Diagnosis (disease/condition) <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="condition"
                    name="condition"
                    value={medicalRecord.condition}
                    onChange={handleMedicalRecordChange}
                    placeholder="e.g., Hypertension, Diabetes Type 2"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="diagnosisDate">Diagnosis Date</label>
                  <input
                    type="date"
                    id="diagnosisDate"
                    name="diagnosisDate"
                    value={medicalRecord.diagnosisDate ?? ''}
                    onChange={handleMedicalRecordChange}
                    max={getMinDate()}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="symptoms">Symptoms</label>
                  <textarea
                    id="symptoms"
                    name="symptoms"
                    value={medicalRecord.symptoms ?? ''}
                    onChange={handleMedicalRecordChange}
                    placeholder="Patient-reported or observed symptoms"
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="notes">Doctor notes</label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={medicalRecord.notes ?? ''}
                    onChange={handleMedicalRecordChange}
                    placeholder="Clinical notes and observations"
                    rows={4}
                  />
                </div>

                <div className="doctor-add-medicine-section doctor-add-medicine-section--nested">
                  <h3 className="doctor-add-medicine-heading">Add medicine for patient</h3>
                  <p className="doctor-add-medicine-intro">
                    Sends to the patient app and <strong>adds a line to prescription / medicines</strong> below. You can edit that field before saving the record.
                  </p>
                  {medicineFormError ? <div className="form-error">{medicineFormError}</div> : null}
                  {medicineFormSuccess ? <div className="form-success">{medicineFormSuccess}</div> : null}
                  <div className="form-group">
                    <label htmlFor="doctor-medicine-name">
                      Medicine name <span className="required">*</span>
                    </label>
                    <input
                      id="doctor-medicine-name"
                      type="text"
                      value={medicineName}
                      onChange={(e) => setMedicineName(e.target.value)}
                      placeholder="e.g. Amoxicillin"
                      autoComplete="off"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="doctor-medicine-instructions">Instructions for patient</label>
                    <textarea
                      id="doctor-medicine-instructions"
                      value={medicineInstructions}
                      onChange={(e) => setMedicineInstructions(e.target.value)}
                      rows={3}
                      placeholder="Dosage, how often, and other directions"
                    />
                  </div>
                  <button
                    type="button"
                    className="submit-btn doctor-add-medicine-send-btn"
                    disabled={medicineSubmitting}
                    onClick={() => void handleSendMedicineToPatient()}
                  >
                    {medicineSubmitting ? 'Sending…' : 'Send to patient app'}
                  </button>
                </div>

                
                <div className="form-group">
                  <label htmlFor="followUpInstructions">Follow-up instructions</label>
                  <textarea
                    id="followUpInstructions"
                    name="followUpInstructions"
                    value={medicalRecord.followUpInstructions ?? ''}
                    onChange={handleMedicalRecordChange}
                    placeholder="When to return, what to monitor, etc."
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="testRecommendations">Test recommendations</label>
                  <textarea
                    id="testRecommendations"
                    name="testRecommendations"
                    value={medicalRecord.testRecommendations ?? ''}
                    onChange={handleMedicalRecordChange}
                    placeholder="Lab work, imaging, or other tests to consider"
                    rows={3}
                  />
                </div>
                <button type="submit" className="submit-btn" disabled={submitting}>
                  {submitting ? 'Adding Record...' : 'Add Medical Record'}
                </button>
              </form>
            </div>
          )}

          {/* Patient Medical History */}
          {selectedPatient && selectedPatient.medicalHistory && selectedPatient.medicalHistory.length > 0 && (
            <div className="medical-history-section">
              <h2>Medical History</h2>
              <div className="medical-history-list">
                {selectedPatient.medicalHistory.map((history, idx) => (
                  <div key={idx} className="history-item">
                    <div className="history-header">
                      <strong>{history.condition}</strong>
                      {history.diagnosisDate && (
                        <span className="history-date">{formatDate(history.diagnosisDate)}</span>
                      )}
                    </div>
                    {history.doctorName ? (
                      <div className="history-row">
                        <span className="history-label">Recorded by:</span>
                        <span>{history.doctorName}</span>
                      </div>
                    ) : null}
                    {history.symptoms && (
                      <div className="history-row">
                        <span className="history-label">Symptoms:</span>
                        <span>{history.symptoms}</span>
                      </div>
                    )}
                    {history.prescription && (
                      <div className="history-row">
                        <span className="history-label">Prescription / medicines:</span>
                        <span>{history.prescription}</span>
                      </div>
                    )}
                    {history.notes && (
                      <div className="history-row">
                        <span className="history-label">Doctor notes:</span>
                        <span>{history.notes}</span>
                      </div>
                    )}
                    {history.followUpInstructions && (
                      <div className="history-row">
                        <span className="history-label">Follow-up:</span>
                        <span>{history.followUpInstructions}</span>
                      </div>
                    )}
                    {history.testRecommendations && (
                      <div className="history-row">
                        <span className="history-label">Test recommendations:</span>
                        <span>{history.testRecommendations}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}
