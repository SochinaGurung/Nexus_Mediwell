import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { authService } from '../../services/authService'
//import './DoctorProfile.css'
import './EditDoctorProfile.css'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

interface ProfileData {
  firstName?: string
  lastName?: string
  phoneNumber?: string
  address?: { street?: string; city?: string; state?: string; zipCode?: string; country?: string }
  dateOfBirth?: string
  gender?: string
  specialization?: string
  department?: string
  licenseNumber?: string
  qualifications?: Array<{ degree: string; institution: string; year: number }>
  yearsOfExperience?: number
  consultationFee?: number
  availability?: Record<string, { available: boolean; startTime?: string; endTime?: string }>
  bio?: string
}

function defaultAvailability(): Record<string, { available: boolean; startTime: string; endTime: string }> {
  return Object.fromEntries(
    DAYS.map((d) => [d, { available: false, startTime: '', endTime: '' }])
  ) as Record<string, { available: boolean; startTime: string; endTime: string }>
}

export default function EditDoctorProfile() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    address: { street: '', city: '', state: '', zipCode: '', country: 'Nepal' },
    dateOfBirth: '',
    gender: '',
    specialization: '',
    department: '',
    licenseNumber: '',
    qualifications: [],
    yearsOfExperience: 0,
    consultationFee: 0,
    availability: defaultAvailability(),
    bio: ''
  })

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login')
      return
    }
    const user = authService.getCurrentUser()
    if (user && user.role !== 'doctor') {
      navigate('/doctor/dashboard')
      return
    }
    loadProfile()
  }, [navigate])

  async function loadProfile() {
    try {
      setLoading(true)
      setError('')
      const res = await authService.getProfile()
      const u = res.user as ProfileData & {
        address?: ProfileData['address']
        availability?: ProfileData['availability']
        qualifications?: ProfileData['qualifications']
      }
      if ((u as { role?: string }).role !== 'doctor') {
        setError('Access denied.')
        setLoading(false)
        return
      }
      const avail = defaultAvailability()
      if (u.availability && typeof u.availability === 'object') {
        DAYS.forEach((d) => {
          const day = u.availability![d]
          if (day) {
            avail[d] = {
              available: !!day.available,
              startTime: day.startTime ?? '',
              endTime: day.endTime ?? ''
            }
          }
        })
      }
      setForm({
        firstName: u.firstName ?? '',
        lastName: u.lastName ?? '',
        phoneNumber: u.phoneNumber ?? '',
        address: u.address
          ? { ...{ street: '', city: '', state: '', zipCode: '', country: 'Nepal' }, ...u.address }
          : { street: '', city: '', state: '', zipCode: '', country: 'Nepal' },
        dateOfBirth: u.dateOfBirth ? String(u.dateOfBirth).slice(0, 10) : '',
        gender: u.gender ?? '',
        specialization: u.specialization ?? '',
        department: u.department ?? '',
        licenseNumber: u.licenseNumber ?? '',
        qualifications: Array.isArray(u.qualifications)
          ? u.qualifications.map((q) => ({
              degree: q.degree ?? '',
              institution: q.institution ?? '',
              year: Number(q.year) || 0
            }))
          : [],
        yearsOfExperience:
          typeof u.yearsOfExperience === 'number' ? u.yearsOfExperience : Number(u.yearsOfExperience) || 0,
        consultationFee:
          typeof u.consultationFee === 'number' ? u.consultationFee : Number(u.consultationFee) || 0,
        availability: avail,
        bio: u.bio ?? ''
      })
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  function update(path: string, value: unknown) {
    setForm((prev) => {
      const next = JSON.parse(JSON.stringify(prev))
      const parts = path.split('.')
      let cur: Record<string, unknown> = next
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i]
        if (!(key in cur)) cur[key] = {}
        cur = cur[key] as Record<string, unknown>
      }
      cur[parts[parts.length - 1]] = value
      return next
    })
  }

  function addQualification() {
    setForm((prev) => ({
      ...prev,
      qualifications: [
        ...(prev.qualifications || []),
        { degree: '', institution: '', year: new Date().getFullYear() }
      ]
    }))
  }

  function removeQualification(idx: number) {
    setForm((prev) => ({
      ...prev,
      qualifications: prev.qualifications?.filter((_, i) => i !== idx) || []
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const availabilityPayload: Record<string, { available: boolean; startTime?: string; endTime?: string }> =
        {}
      DAYS.forEach((d) => {
        const day = form.availability?.[d]
        availabilityPayload[d] = {
          available: !!day?.available,
          startTime: day?.startTime || undefined,
          endTime: day?.endTime || undefined
        }
      })
      const payload: Record<string, unknown> = {
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        phoneNumber: form.phoneNumber || undefined,
        address: form.address,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        specialization: form.specialization || undefined,
        department: form.department || undefined,
        licenseNumber: form.licenseNumber || undefined,
        qualifications: form.qualifications?.filter((q) => q.degree.trim()),
        yearsOfExperience: form.yearsOfExperience,
        consultationFee: form.consultationFee,
        availability: availabilityPayload,
        bio: form.bio?.trim().slice(0, 500) || undefined
      }
      await authService.updateProfile(payload)
      navigate('/doctor/profile')
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="doctor-profile-page">
          <div className="loading-container">
            <div className="spinner" />
            <p>Loading...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="doctor-profile-page">
        <div className="doctor-profile-container">
          <div className="profile-edit-header">
            <h1>Edit Profile</h1>
            <Link to="/doctor/profile" className="back-link">
              ← Back to profile
            </Link>
          </div>
          {error && <div className="profile-edit-error">{error}</div>}
          <form onSubmit={handleSubmit} className="profile-edit-form">
            <section className="profile-edit-section">
              <h2>Personal Information</h2>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    value={form.firstName ?? ''}
                    onChange={(e) => update('firstName', e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    value={form.lastName ?? ''}
                    onChange={(e) => update('lastName', e.target.value)}
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={form.phoneNumber ?? ''}
                  onChange={(e) => update('phoneNumber', e.target.value)}
                  placeholder="Phone"
                />
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
                <input
                  type="date"
                  value={form.dateOfBirth ?? ''}
                  onChange={(e) => update('dateOfBirth', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select value={form.gender ?? ''} onChange={(e) => update('gender', e.target.value)}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <h3>Address</h3>
              <div className="form-group">
                <label>Street</label>
                <input
                  value={form.address?.street ?? ''}
                  onChange={(e) => update('address.street', e.target.value)}
                  placeholder="Street"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input
                    value={form.address?.city ?? ''}
                    onChange={(e) => update('address.city', e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input
                    value={form.address?.state ?? ''}
                    onChange={(e) => update('address.state', e.target.value)}
                    placeholder="State"
                  />
                </div>
                <div className="form-group">
                  <label>Zip Code</label>
                  <input
                    value={form.address?.zipCode ?? ''}
                    onChange={(e) => update('address.zipCode', e.target.value)}
                    placeholder="Zip"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Country</label>
                <input
                  value={form.address?.country ?? ''}
                  onChange={(e) => update('address.country', e.target.value)}
                  placeholder="Country"
                />
              </div>
            </section>

            <section className="profile-edit-section">
              <h2>Professional Information</h2>
              <div className="form-group">
                <label>Specialization</label>
                <input
                  value={form.specialization ?? ''}
                  onChange={(e) => update('specialization', e.target.value)}
                  placeholder="e.g. Cardiology"
                />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input
                  value={form.department ?? ''}
                  onChange={(e) => update('department', e.target.value)}
                  placeholder="Department"
                />
              </div>
              <div className="form-group">
                <label>License Number</label>
                <input
                  value={form.licenseNumber ?? ''}
                  onChange={(e) => update('licenseNumber', e.target.value)}
                  placeholder="License number"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Years of Experience</label>
                  <input
                    type="number"
                    min={0}
                    value={form.yearsOfExperience ?? 0}
                    onChange={(e) => update('yearsOfExperience', Number(e.target.value) || 0)}
                  />
                </div>
                <div className="form-group">
                  <label>Consultation Fee</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.consultationFee ?? 0}
                    onChange={(e) => update('consultationFee', Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Bio (max 500 characters)</label>
                <textarea
                  value={form.bio ?? ''}
                  onChange={(e) => update('bio', e.target.value.slice(0, 500))}
                  placeholder="Short bio"
                  rows={4}
                  maxLength={500}
                />
                <span className="char-count">{(form.bio?.length || 0)}/500</span>
              </div>
            </section>

            <section className="profile-edit-section">
              <h2>Qualifications</h2>
              {(form.qualifications || []).map((q, idx) => (
                <div key={idx} className="repeatable-block">
                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label>Degree</label>
                      <input
                        value={q.degree}
                        onChange={(e) => {
                          const next = [...(form.qualifications || [])]
                          next[idx] = { ...q, degree: e.target.value }
                          setForm((f) => ({ ...f, qualifications: next }))
                        }}
                        placeholder="Degree"
                      />
                    </div>
                    <div className="form-group flex-1">
                      <label>Institution</label>
                      <input
                        value={q.institution}
                        onChange={(e) => {
                          const next = [...(form.qualifications || [])]
                          next[idx] = { ...q, institution: e.target.value }
                          setForm((f) => ({ ...f, qualifications: next }))
                        }}
                        placeholder="Institution"
                      />
                    </div>
                    <div className="form-group form-group-year">
                      <label>Year</label>
                      <input
                        type="number"
                        value={q.year || ''}
                        onChange={(e) => {
                          const next = [...(form.qualifications || [])]
                          next[idx] = { ...q, year: Number(e.target.value) || 0 }
                          setForm((f) => ({ ...f, qualifications: next }))
                        }}
                        placeholder="Year"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeQualification(idx)}
                      className="btn-remove"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addQualification} className="btn-secondary">
                + Add qualification
              </button>
            </section>

            <section className="profile-edit-section">
              <h2>Availability</h2>
              <p className="form-hint">Set available days and time slots.</p>
              <div className="availability-edit-grid">
                {DAYS.map((day) => {
                  const d = form.availability?.[day] || { available: false, startTime: '', endTime: '' }
                  return (
                    <div key={day} className="availability-edit-row">
                      <label className="availability-day-label">
                        <input
                          type="checkbox"
                          checked={!!d.available}
                          onChange={(e) => update(`availability.${day}.available`, e.target.checked)}
                        />
                        <span>{day.charAt(0).toUpperCase() + day.slice(1)}</span>
                      </label>
                      <input
                        type="time"
                        value={d.startTime ?? ''}
                        onChange={(e) => update(`availability.${day}.startTime`, e.target.value)}
                        disabled={!d.available}
                      />
                      <span className="availability-sep">–</span>
                      <input
                        type="time"
                        value={d.endTime ?? ''}
                        onChange={(e) => update(`availability.${day}.endTime`, e.target.value)}
                        disabled={!d.available}
                      />
                    </div>
                  )
                })}
              </div>
            </section>

            <div className="form-actions">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <Link to="/doctor/profile" className="btn-cancel">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  )
}
