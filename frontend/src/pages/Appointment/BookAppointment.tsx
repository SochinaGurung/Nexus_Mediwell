import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { appointmentService } from '../../services/appointmentService'
import { doctorService, type Doctor } from '../../services/doctorService'
import { authService } from '../../services/authService'
import './BookAppointment.css'

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

function getDayNameFromDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return DAY_NAMES[d.getDay()]
}

function getAvailableDays(doctor: Doctor): string[] {
  const av = doctor.availability
  if (!av) return []
  return DAY_NAMES.filter((day) => av[day]?.available === true)
}

function getTimeSlotsForDay(doctor: Doctor, dayName: string): string[] | null {
  const av = doctor.availability
  if (!av || !av[dayName]?.available) return null
  const dayAv = av[dayName]
  let start = '09:00'
  let end = '17:30'
  if (dayAv.startTime) start = dayAv.startTime.slice(0, 5)
  if (dayAv.endTime) end = dayAv.endTime.slice(0, 5)
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const startMins = sh * 60 + (sm || 0)
  let endMins = eh * 60 + (em || 0)
  if (endMins <= startMins) endMins = 17 * 60 + 30
  const slots: string[] = []
  for (let m = startMins; m < endMins; m += 30) {
    const h = Math.floor(m / 60)
    const min = m % 60
    slots.push(`${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`)
  }
  return slots
}

function getDefaultTimeSlots(): string[] {
  const slots: string[] = []
  for (let hour = 9; hour <= 17; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`)
    }
  }
  return slots
}

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

    if (doctor && hasAvailability) {
      const dayName = getDayNameFromDate(formData.appointmentDate)
      if (!availableDays.includes(dayName)) {
        setError(`Doctor is not available on ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}. Please choose another date.`)
        return false
      }
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

  const availableDays = doctor ? getAvailableDays(doctor) : []
  const hasAvailability = availableDays.length > 0

  const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFormData((prev) => ({ ...prev, appointmentDate: value, appointmentTime: '' }))
    setError('')
    if (hasAvailability && value) {
      const dayName = getDayNameFromDate(value)
      if (!availableDays.includes(dayName)) {
        setError(`Doctor is not available on ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}. Please choose another date.`)
      }
    }
  }

  const timeSlotsForSelectedDate = (): string[] | null => {
    if (!doctor) return null
    if (!hasAvailability) return getDefaultTimeSlots()
    if (!formData.appointmentDate) return null
    const dayName = getDayNameFromDate(formData.appointmentDate)
    if (!availableDays.includes(dayName)) return null
    const slots = getTimeSlotsForDay(doctor, dayName)
    return slots ?? getDefaultTimeSlots()
  }

  const timeSlots = timeSlotsForSelectedDate()
  const showTimeSelect = timeSlots !== null && timeSlots.length > 0
  const showDateHint = hasAvailability && availableDays.length > 0
  const selectedDayUnavailable = hasAvailability && formData.appointmentDate && !availableDays.includes(getDayNameFromDate(formData.appointmentDate))

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
                {showDateHint && (
                  <p className="availability-hint">
                    Doctor available: {availableDays.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}
                  </p>
                )}
                <input
                  type="date"
                  id="appointmentDate"
                  name="appointmentDate"
                  value={formData.appointmentDate}
                  onChange={handleDateChange}
                  min={getMinDate()}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="appointmentTime">
                  Appointment Time <span className="required">*</span>
                </label>
                {hasAvailability && !formData.appointmentDate && (
                  <p className="availability-hint">Select a date first to see available times.</p>
                )}
                {selectedDayUnavailable && (
                  <p className="availability-hint availability-warning">Doctor is not available on the selected day. Please choose another date.</p>
                )}
                <select
                  id="appointmentTime"
                  name="appointmentTime"
                  value={formData.appointmentTime}
                  onChange={handleChange}
                  required
                  disabled={!!(hasAvailability && (!formData.appointmentDate || selectedDayUnavailable))}
                >
                  <option value="">
                    {!formData.appointmentDate && hasAvailability
                      ? 'Select a date first'
                      : selectedDayUnavailable
                        ? 'Choose another date'
                        : 'Select a time'}
                  </option>
                  {showTimeSelect &&
                    timeSlots?.map((time) => (
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
