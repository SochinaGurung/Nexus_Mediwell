import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { authService } from '../../services/authService'
import './PatientProfile.css'
import './EditPatientProfile.css'

interface ProfileData {
  firstName?: string
  lastName?: string
  phoneNumber?: string
  address?: { street?: string; city?: string; state?: string; zipCode?: string; country?: string }
  dateOfBirth?: string
  gender?: string
  bloodGroup?: string
  emergencyContact?: { name?: string; relationship?: string; phoneNumber?: string; email?: string }
  allergies?: string[]
  insuranceInfo?: { provider?: string; policyNumber?: string; groupNumber?: string; expiryDate?: string }
  medicalHistory?: Array<{ condition: string; diagnosisDate?: string; notes?: string }>
}

export default function EditPatientProfile() {
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
    bloodGroup: '',
    emergencyContact: { name: '', relationship: '', phoneNumber: '', email: '' },
    allergies: [],
    insuranceInfo: { provider: '', policyNumber: '', groupNumber: '', expiryDate: '' },
    medicalHistory: []
  })
  const [allergyInput, setAllergyInput] = useState('')
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login')
      return
    }
    const user = authService.getCurrentUser()
    if (user && user.role !== 'patient') {
      navigate('/patient/dashboard')
      return
    }
    loadProfile()
  }, [navigate])

  async function loadProfile() {
    try {
      setLoading(true)
      setError('')
      const res = await authService.getProfile()
      const u = res.user as ProfileData & { address?: ProfileData['address']; emergencyContact?: ProfileData['emergencyContact']; insuranceInfo?: ProfileData['insuranceInfo']; medicalHistory?: ProfileData['medicalHistory']; profilePicture?: string }
      setProfilePictureUrl(u.profilePicture ?? null)
      setForm({
        firstName: u.firstName ?? '',
        lastName: u.lastName ?? '',
        phoneNumber: u.phoneNumber ?? '',
        address: u.address ? { ...{ street: '', city: '', state: '', zipCode: '', country: 'Nepal' }, ...u.address } : { street: '', city: '', state: '', zipCode: '', country: 'Nepal' },
        dateOfBirth: u.dateOfBirth ? (typeof u.dateOfBirth === 'string' ? u.dateOfBirth.slice(0, 10) : '') : '',
        gender: u.gender ?? '',
        bloodGroup: u.bloodGroup ?? '',
        emergencyContact: u.emergencyContact ? { ...{ name: '', relationship: '', phoneNumber: '', email: '' }, ...u.emergencyContact } : { name: '', relationship: '', phoneNumber: '', email: '' },
        allergies: Array.isArray(u.allergies) ? [...u.allergies] : [],
        insuranceInfo: u.insuranceInfo ? { ...{ provider: '', policyNumber: '', groupNumber: '', expiryDate: '' }, ...u.insuranceInfo, expiryDate: (u.insuranceInfo as { expiryDate?: string })?.expiryDate ? String((u.insuranceInfo as { expiryDate?: string }).expiryDate).slice(0, 10) : '' } : { provider: '', policyNumber: '', groupNumber: '', expiryDate: '' },
        medicalHistory: Array.isArray(u.medicalHistory) ? u.medicalHistory.map((m: { condition?: string; diagnosisDate?: string; notes?: string }) => ({ condition: m.condition ?? '', diagnosisDate: m.diagnosisDate ? String(m.diagnosisDate).slice(0, 10) : '', notes: m.notes ?? '' })) : []
      })
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const update = (path: string, value: unknown) => {
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

  function addAllergy() {
    const t = allergyInput.trim()
    if (t && !form.allergies?.includes(t)) {
      setForm((prev) => ({ ...prev, allergies: [...(prev.allergies || []), t] }))
      setAllergyInput('')
    }
  }

  function removeAllergy(idx: number) {
    setForm((prev) => ({ ...prev, allergies: prev.allergies?.filter((_, i) => i !== idx) || [] }))
  }

  function addMedicalEntry() {
    setForm((prev) => ({ ...prev, medicalHistory: [...(prev.medicalHistory || []), { condition: '', diagnosisDate: '', notes: '' }] }))
  }

  function removeMedicalEntry(idx: number) {
    setForm((prev) => ({ ...prev, medicalHistory: prev.medicalHistory?.filter((_, i) => i !== idx) || [] }))
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image must be 5MB or smaller.')
      return
    }
    setPhotoError('')
    setPhotoUploading(true)
    try {
      const res = await authService.uploadProfilePhoto(file)
      setProfilePictureUrl(res.profilePicture)
    } catch (err: unknown) {
      setPhotoError((err as { message?: string })?.message || 'Upload failed')
    } finally {
      setPhotoUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        phoneNumber: form.phoneNumber || undefined,
        address: form.address,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        bloodGroup: form.bloodGroup || undefined,
        emergencyContact: form.emergencyContact,
        allergies: form.allergies,
        insuranceInfo: form.insuranceInfo,
        medicalHistory: form.medicalHistory?.filter((m) => m.condition.trim())
      }
      await authService.updateProfile(payload)
      navigate('/patient/profile')
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
        <div className="patient-profile-page">
          <div className="loading-container"><div className="spinner" /><p>Loading...</p></div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="patient-profile-page">
        <div className="patient-profile-container">
          <div className="profile-edit-header">
            <h1>Edit Profile</h1>
            <Link to="/patient/profile" className="back-link">← Back to profile</Link>
          </div>
          {error && <div className="profile-edit-error">{error}</div>}
          <form onSubmit={handleSubmit} className="profile-edit-form">
            <section className="profile-edit-section profile-photo-section">
              <h2>Profile photo</h2>
              <p className="form-hint">Upload your Profile Picture.</p>
              {photoError ? <div className="profile-edit-error profile-photo-error">{photoError}</div> : null}
              <div className="profile-photo-upload-row">
                <div className="profile-photo-preview">
                  {profilePictureUrl ? (
                    <img src={profilePictureUrl} alt="Your profile" />
                  ) : (
                    <div className="profile-photo-placeholder">No photo</div>
                  )}
                </div>
                <div className="profile-photo-actions">
                  <label className="btn-secondary profile-photo-file-label">
                    {photoUploading ? 'Uploading…' : 'Choose photo'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handlePhotoChange}
                      disabled={photoUploading}
                      hidden
                    />
                  </label>
                </div>
              </div>
            </section>
            <section className="profile-edit-section">
              <h2>Personal Information</h2>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input value={form.firstName ?? ''} onChange={(e) => update('firstName', e.target.value)} placeholder="First name" />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input value={form.lastName ?? ''} onChange={(e) => update('lastName', e.target.value)} placeholder="Last name" />
                </div>
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" value={form.phoneNumber ?? ''} onChange={(e) => update('phoneNumber', e.target.value)} placeholder="Phone" />
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
                <input type="date" value={form.dateOfBirth ?? ''} onChange={(e) => update('dateOfBirth', e.target.value)} />
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
                <input value={form.address?.street ?? ''} onChange={(e) => update('address.street', e.target.value)} placeholder="Street" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input value={form.address?.city ?? ''} onChange={(e) => update('address.city', e.target.value)} placeholder="City" />
                </div>
                
              </div>
              <div className="form-group">
                <label>Country</label>
                <input value={form.address?.country ?? ''} onChange={(e) => update('address.country', e.target.value)} placeholder="Country" />
              </div>
            </section>

            <section className="profile-edit-section">
              <h2>Emergency Contact</h2>
              <div className="form-group">
                <label>Name</label>
                <input value={form.emergencyContact?.name ?? ''} onChange={(e) => update('emergencyContact.name', e.target.value)} placeholder="Full name" />
              </div>
              <div className="form-group">
                <label>Relationship</label>
                <input value={form.emergencyContact?.relationship ?? ''} onChange={(e) => update('emergencyContact.relationship', e.target.value)} placeholder="e.g. Spouse, Parent" />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" value={form.emergencyContact?.phoneNumber ?? ''} onChange={(e) => update('emergencyContact.phoneNumber', e.target.value)} placeholder="Phone" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.emergencyContact?.email ?? ''} onChange={(e) => update('emergencyContact.email', e.target.value)} placeholder="Email" />
              </div>
            </section>

            <section className="profile-edit-section">
              <h2>Medical Information</h2>
              <div className="form-group">
                <label>Blood Group</label>
                <select value={form.bloodGroup ?? ''} onChange={(e) => update('bloodGroup', e.target.value)}>
                  <option value="">Select</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Allergies</label>
                <div className="tag-input-row">
                  <input value={allergyInput} onChange={(e) => setAllergyInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())} placeholder="Add allergy and press Enter" />
                  <button type="button" onClick={addAllergy} className="btn-secondary">Add</button>
                </div>
                <div className="tag-list">
                  {form.allergies?.map((a, i) => (
                    <span key={i} className="tag"><span>{a}</span><button type="button" onClick={() => removeAllergy(i)} aria-label="Remove">×</button></span>
                  ))}
                </div>
              </div>
            </section>

            <section className="profile-edit-section">
              <h2>Medical History</h2>
              <p className="form-hint">Add conditions, diagnosis date and notes.</p>
              {form.medicalHistory?.map((entry, idx) => (
                <div key={idx} className="repeatable-block">
                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label>Condition</label>
                      <input value={entry.condition} onChange={(e) => {
                        const next = [...(form.medicalHistory || [])]
                        next[idx] = { ...entry, condition: e.target.value }
                        setForm((f) => ({ ...f, medicalHistory: next }))
                      }} placeholder="Condition" />
                    </div>
                    <div className="form-group">
                      <label>Diagnosis Date</label>
                      <input type="date" value={entry.diagnosisDate ?? ''} onChange={(e) => {
                        const next = [...(form.medicalHistory || [])]
                        next[idx] = { ...entry, diagnosisDate: e.target.value }
                        setForm((f) => ({ ...f, medicalHistory: next }))
                      }} />
                    </div>
                    <button type="button" onClick={() => removeMedicalEntry(idx)} className="btn-remove">Remove</button>
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <textarea value={entry.notes ?? ''} onChange={(e) => {
                      const next = [...(form.medicalHistory || [])]
                      next[idx] = { ...entry, notes: e.target.value }
                      setForm((f) => ({ ...f, medicalHistory: next }))
                    }} placeholder="Notes" rows={2} />
                  </div>
                </div>
              ))}
              <button type="button" onClick={addMedicalEntry} className="btn-secondary">+ Add medical history entry</button>
            </section>

            <div className="form-actions">
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save changes'}</button>
              <Link to="/patient/profile" className="btn-cancel">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  )
}
