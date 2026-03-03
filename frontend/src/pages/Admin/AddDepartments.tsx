import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { departmentService } from '../../services/departmentService'
import './AddDepartment.css'

interface AddDepartmentFormData {
  departmentName: string
  description: string
  departmentCode: string
  location: {
    floor: string
    building: string
    roomNumber: string
  }
  headOfDepartment: string
  services: string[]
  operatingHours: {
    [key: string]: {
      open: boolean
      startTime: string
      endTime: string
    }
  }
  image: string
  isActive: boolean
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

export default function AddDepartments() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<AddDepartmentFormData>({
    departmentName: '',
    description: '',
    departmentCode: '',
    location: {
      floor: '',
      building: '',
      roomNumber: ''
    },
    headOfDepartment: '',
    services: [],
    operatingHours: {
      monday: { open: true, startTime: '09:00', endTime: '17:00' },
      tuesday: { open: true, startTime: '09:00', endTime: '17:00' },
      wednesday: { open: true, startTime: '09:00', endTime: '17:00' },
      thursday: { open: true, startTime: '09:00', endTime: '17:00' },
      friday: { open: true, startTime: '09:00', endTime: '17:00' },
      saturday: { open: false, startTime: '', endTime: '' },
      sunday: { open: false, startTime: '', endTime: '' }
    },
    image: '',
    isActive: true
  })
  const [currentService, setCurrentService] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    if (name.startsWith('location.')) {
      const locationField = name.split('.')[1]
      setFormData((prev) => ({
        ...prev,
        location: {
          ...prev.location,
          [locationField]: value
        }
      }))
    } else if (name.startsWith('operatingHours.')) {
      const parts = name.split('.')
      const day = parts[1]
      const field = parts[2]

      setFormData((prev) => ({
        ...prev,
        operatingHours: {
          ...prev.operatingHours,
          [day]: {
            ...prev.operatingHours[day],
            [field]: field === 'open' ? checked : value
          }
        }
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
    }

    if (error) setError('')
    if (success) setSuccess('')
  }

  const handleAddService = () => {
    if (currentService.trim() && !formData.services.includes(currentService.trim())) {
      setFormData((prev) => ({
        ...prev,
        services: [...prev.services, currentService.trim()]
      }))
      setCurrentService('')
    }
  }

  const handleRemoveService = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }))
  }

  const validateForm = (): boolean => {
    if (!formData.departmentName.trim()) {
      setError('Department name is required')
      return false
    }
    if (!formData.description.trim()) {
      setError('Description is required')
      return false
    }
    
    // Validate operating hours
    for (const day of DAYS) {
      const hours = formData.operatingHours[day]
      if (hours.open) {
        if (!hours.startTime || !hours.endTime) {
          setError(`Please provide start and end times for ${day}`)
          return false
        }
        if (hours.startTime >= hours.endTime) {
          setError(`End time must be after start time for ${day}`)
          return false
        }
      }
    }

    return true
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validateForm()) return

    setLoading(true)
    try {
      // Prepare data for API
      const departmentData: any = {
        departmentName: formData.departmentName.trim(),
        description: formData.description.trim(),
        isActive: formData.isActive
      }

      // Add optional fields only if they have values
      if (formData.departmentCode.trim()) {
        departmentData.departmentCode = formData.departmentCode.trim().toUpperCase()
      }
      if (formData.headOfDepartment.trim()) {
        departmentData.headOfDepartment = formData.headOfDepartment.trim()
      }
      if (formData.image.trim()) {
        departmentData.image = formData.image.trim()
      }

      // Add location if any field is filled
      if (formData.location.floor || formData.location.building || formData.location.roomNumber) {
        departmentData.location = {}
        if (formData.location.floor) departmentData.location.floor = formData.location.floor.trim()
        if (formData.location.building) departmentData.location.building = formData.location.building.trim()
        if (formData.location.roomNumber) departmentData.location.roomNumber = formData.location.roomNumber.trim()
      }

      // Add services and specialties if they exist
      if (formData.services.length > 0) {
        departmentData.services = formData.services
      }

      // Add operating hours
      departmentData.operatingHours = formData.operatingHours

      const response = await departmentService.createDepartment(departmentData)
      setSuccess(response.message || 'Department created successfully!')
      setTimeout(() => navigate('/admin/dashboard'), 2000)
    } catch (err: unknown) {
      const errorMessage = (err as { message?: string })?.message || 'Failed to create department'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="add-department-container">
      <div className="add-department-card">
        <div className="add-department-header">
          <div className="logo">
            <div className="logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#2C5F7C" />
                <path d="M2 17L12 22L22 17" stroke="#2C5F7C" strokeWidth="2" strokeLinecap="round" />
                <path d="M2 12L12 17L22 12" stroke="#2C5F7C" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="logo-text">Nexus Mediwell</span>
          </div>
          <p>Add a new department</p>
        </div>

        <form onSubmit={handleSubmit} className="add-department-form">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {/* Required Fields */}
          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-group">
              <label htmlFor="departmentName">
                Department Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="departmentName"
                name="departmentName"
                value={formData.departmentName}
                onChange={handleChange}
                placeholder="e.g., Cardiology"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">
                Description <span className="required">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter department description"
                rows={4}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="departmentCode">Department Code</label>
              <input
                type="text"
                id="departmentCode"
                name="departmentCode"
                value={formData.departmentCode}
                onChange={handleChange}
                placeholder="e.g., CARD"
                style={{ textTransform: 'uppercase' }}
              />
            </div>
          </div>

          {/* Location */}
          <div className="form-section">
            <h3>Location</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="location.floor">Floor</label>
                <input
                  type="text"
                  id="location.floor"
                  name="location.floor"
                  value={formData.location.floor}
                  onChange={handleChange}
                  placeholder="e.g., 3rd Floor"
                />
              </div>
              <div className="form-group">
                <label htmlFor="location.building">Building</label>
                <input
                  type="text"
                  id="location.building"
                  name="location.building"
                  value={formData.location.building}
                  onChange={handleChange}
                  placeholder="e.g., Main Building"
                />
              </div>
              <div className="form-group">
                <label htmlFor="location.roomNumber">Room Number</label>
                <input
                  type="text"
                  id="location.roomNumber"
                  name="location.roomNumber"
                  value={formData.location.roomNumber}
                  onChange={handleChange}
                  placeholder="e.g., 301"
                />
              </div>
            </div>
          </div>

          {/* Head of Department */}
          <div className="form-section">
            <h3>Head of Department</h3>
            <div className="form-group">
              <label htmlFor="headOfDepartment">Head of Department User ID</label>
              <input
                type="text"
                id="headOfDepartment"
                name="headOfDepartment"
                value={formData.headOfDepartment}
                onChange={handleChange}
                placeholder="Enter user ID (optional)"
              />
              <small>Leave empty if not assigned yet</small>
            </div>
          </div>

          {/* Services */}
          <div className="form-section">
            <h3>Services</h3>
            <div className="form-group">
              <label htmlFor="currentService">Add Service</label>
              <div className="input-with-button">
                <input
                  type="text"
                  id="currentService"
                  value={currentService}
                  onChange={(e) => setCurrentService(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddService()
                    }
                  }}
                  placeholder="e.g., Heart Surgery"
                />
                <button type="button" onClick={handleAddService} className="add-item-btn">
                  Add
                </button>
              </div>
              {formData.services.length > 0 && (
                <div className="tag-list">
                  {formData.services.map((service, index) => (
                    <span key={index} className="tag">
                      {service}
                      <button
                        type="button"
                        onClick={() => handleRemoveService(index)}
                        className="remove-tag"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Operating Hours */}
          <div className="form-section">
            <h3>Operating Hours</h3>
            {DAYS.map((day) => (
              <div key={day} className="operating-hours-row">
                <div className="day-checkbox">
                  <input
                    type="checkbox"
                    id={`operatingHours.${day}.open`}
                    name={`operatingHours.${day}.open`}
                    checked={formData.operatingHours[day].open}
                    onChange={handleChange}
                  />
                  <label htmlFor={`operatingHours.${day}.open`}>
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </label>
                </div>
                {formData.operatingHours[day].open && (
                  <div className="time-inputs">
                    <input
                      type="time"
                      name={`operatingHours.${day}.startTime`}
                      value={formData.operatingHours[day].startTime}
                      onChange={handleChange}
                      required={formData.operatingHours[day].open}
                    />
                    <span>to</span>
                    <input
                      type="time"
                      name={`operatingHours.${day}.endTime`}
                      value={formData.operatingHours[day].endTime}
                      onChange={handleChange}
                      required={formData.operatingHours[day].open}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Additional Information */}
          <div className="form-section">
            <h3>Additional Information</h3>
            <div className="form-group">
              <label htmlFor="image">Image URL</label>
              <input
                type="url"
                id="image"
                name="image"
                value={formData.image}
                onChange={handleChange}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                />
                Department is active
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/admin/dashboard')}
              className="cancel-button"
            >
              Cancel
            </button>
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Creating Department...' : 'Create Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
