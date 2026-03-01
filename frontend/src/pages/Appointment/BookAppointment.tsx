import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { appointmentService } from '../../services/appointmentService'
import { doctorService, type Doctor } from '../../services/doctorService'
import { authService } from '../../services/authService'
import './BookAppointment.css'

export default function BookAppointment() {
  const navigate = useNavigate()
  const location = useLocation()
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')


  const [formData, setFormData] = useState({
    doctorId: '',
    appointmentDate: '',
    appointmentTime: '',
    reason: '',
    notes: ''
  })

  useEffect(() => {
    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
      navigate('/login', { state: { from: 'book-appointment' } })
      return
    }

    // Get doctor ID from localStorage or location state
    const doctorId = localStorage.getItem('selectedDoctorId') || location.state?.doctorId
    
    if (doctorId) {
      setFormData(prev => ({ ...prev, doctorId }))
      fetchDoctorDetails(doctorId)
    } else {
      setError('No doctor selected. Please select a doctor first.')
      setLoading(false)
    }
  }, [navigate, location])

  const fetchDoctorDetails = async (doctorId: string) => {
    try {
      setLoading(true)
      const response = await doctorService.getDoctorById(doctorId)
      setDoctor(response.doctor)
    } catch (err: unknown) {
      const errorMessage = (err as { message?: string })?.message || 'Failed to load doctor details'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (error) setError('')
    if (success) setSuccess('')
  }

  const validateForm = (): boolean => {
    if (!formData.doctorId) {
      setError('Doctor is required')
      return false
    }
    if (!formData.appointmentDate) {
      setError('Appointment date is required')
      return false
    }
    if (!formData.appointmentTime) {
      setError('Appointment time is required')
      return false
    }

    // Check if date is in the future
    const selectedDate = new Date(`${formData.appointmentDate}T${formData.appointmentTime}`)
    if (selectedDate <= new Date()) {
      setError('Appointment date and time must be in the future')
      return false
    }

    return true
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validateForm()) return

    setSubmitting(true)
    try {
      const response = await appointmentService.bookAppointment({
        doctorId: formData.doctorId,
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        reason: formData.reason || undefined,
        notes: formData.notes || undefined
      })

      setSuccess(response.message || 'Appointment booked successfully!')
      
      // Clear selected doctor 
      localStorage.removeItem('selectedDoctorId')

      // Redirect to patient dashboard 
      setTimeout(() => {
        navigate('/patient/dashboard')
      }, 2000)
    } catch (err: unknown) {
      const errorMessage = (err as { message?: string })?.message || 'Failed to book appointment. Please try again.'
      setError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const getMinDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(timeString)
      }
    }
    return slots
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="book-appointment-page">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading appointment form...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (!doctor) {
    return (
      <>
        <Header />
        <div className="book-appointment-page">
          <div className="error-container">
            <p>{error || 'Doctor not found'}</p>
            <Link to="/doctors" className="back-btn">
              Browse Doctors
            </Link>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  const doctorName = doctor.firstName || doctor.lastName
    ? `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim()
    : doctor.username

  return (
    <>
      <Header />
      <div className="book-appointment-page">
        <div className="book-appointment-container">
          <div className="appointment-header">
            <h1>Book Appointment</h1>
            <p>Schedule your appointment with Dr.{doctorName}</p>
          </div>

          <div className="appointment-content">
            
            {/* Appointment Form */}
            <div className='appointment-form'>
              <div className='image'>
                  <img src="../src/assets/doctorpatient.png"/>
              </div>

            <form onSubmit={handleSubmit}>
              {error && <div className="form-error">{error}</div>}
              {success && <div className="form-success">{success}</div>}

              <div className="form-group">
                <label htmlFor="appointmentDate">
                  Appointment Date <span className="required">*</span>
                </label>
                <input
                  type="date"
                  id="appointmentDate"
                  name="appointmentDate"
                  value={formData.appointmentDate}
                  onChange={handleChange}
                  min={getMinDate()}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="appointmentTime">
                  Appointment Time <span className="required">*</span>
                </label>
                <select
                  id="appointmentTime"
                  name="appointmentTime"
                  value={formData.appointmentTime}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select a time</option>
                  {generateTimeSlots().map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="reason">Reason for Visit</label>
                <input
                  type="text"
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  placeholder="e.g., General checkup, Consultation"
                />
              </div>

              <div className="form-group">
                <label htmlFor="notes">Additional Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Any additional information you'd like to share..."
                  rows={4}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => navigate('/patient/dashboard')}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={submitting}>
                  {submitting ? 'Booking Appointment...' : 'Book Appointment'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
