import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { departmentService, type Department } from '../../../services/departmentService'
import '../AddDepartment.css'
import './DepartmentManagement.css'

const PAGE_SIZE = 9
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

interface EditFormData {
  departmentName: string
  description: string
  departmentCode: string
  location: { floor: string; building: string; roomNumber: string }
  headOfDepartment: string
  services: string[]
  operatingHours: Record<string, { open: boolean; startTime?: string; endTime?: string }>
  image: string
  isActive: boolean
}

const defaultOperatingHours = {
  monday: { open: true, startTime: '09:00', endTime: '17:00' },
  tuesday: { open: true, startTime: '09:00', endTime: '17:00' },
  wednesday: { open: true, startTime: '09:00', endTime: '17:00' },
  thursday: { open: true, startTime: '09:00', endTime: '17:00' },
  friday: { open: true, startTime: '09:00', endTime: '17:00' },
  saturday: { open: false, startTime: '', endTime: '' },
  sunday: { open: false, startTime: '', endTime: '' }
} satisfies EditFormData['operatingHours']

function mapDepartmentToForm(dept: Department): EditFormData {
  const loc = dept.location as { floor?: string; building?: string; roomNumber?: string; room?: string } | undefined
  const headId = dept.headOfDepartment
    ? typeof dept.headOfDepartment === 'object'
      ? (dept.headOfDepartment as { _id?: string; id?: string })._id || (dept.headOfDepartment as { _id?: string; id?: string }).id
      : String(dept.headOfDepartment)
    : ''
  const hours: EditFormData['operatingHours'] = dept.operatingHours && typeof dept.operatingHours === 'object'
    ? { ...defaultOperatingHours, ...dept.operatingHours }
    : { ...defaultOperatingHours }
  return {
    departmentName: dept.departmentName ?? '',
    description: dept.description ?? '',
    departmentCode: dept.departmentCode ?? '',
    location: {
      floor: loc?.floor ?? '',
      building: (loc as { building?: string })?.building ?? '',
      roomNumber: (loc as { roomNumber?: string })?.roomNumber ?? (loc as { room?: string })?.room ?? ''
    },
    headOfDepartment: headId ?? '',
    services: Array.isArray(dept.services) ? [...dept.services] : [],
    operatingHours: hours,
    image: dept.image ?? '',
    isActive: dept.isActive ?? true
  }
}

const DepartmentsManagement = () => {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDepartments, setTotalDepartments] = useState(0)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<EditFormData | null>(null)
  const [editCurrentService, setEditCurrentService] = useState('')
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editLoadError, setEditLoadError] = useState('')

  useEffect(() => {
    loadDepartments()
  }, [page])

  useEffect(() => {
    if (!editingId) {
      setEditFormData(null)
      setEditLoadError('')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        setEditLoadError('')
        const dept = await departmentService.getDepartmentById(editingId)
        if (!cancelled) setEditFormData(mapDepartmentToForm(dept))
      } catch (err) {
        if (!cancelled) setEditLoadError((err as { message?: string })?.message || 'Failed to load department')
      }
    })()
    return () => { cancelled = true }
  }, [editingId])

  const loadDepartments = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await departmentService.getAllDepartments({
        page,
        limit: PAGE_SIZE,
        sortBy: 'departmentName',
        sortOrder: 'asc'
      })
      setDepartments(response.departments || [])
      setTotalPages(response.pagination?.totalPages ?? 1)
      setTotalDepartments(response.pagination?.totalDepartments ?? 0)
    } catch (err) {
      console.error('Error loading departments:', err)
      setError((err as { message?: string })?.message || 'Failed to load departments')
      setDepartments([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (dept: Department) => {
    const id = dept.id || (dept as { _id?: string })._id
    if (!id) return
    if (!window.confirm(`Delete department "${dept.departmentName}"? This cannot be undone.`)) return
    try {
      setError('')
      await departmentService.deleteDepartment(id)
      await loadDepartments()
    } catch (err) {
      setError((err as { message?: string })?.message || 'Failed to delete department')
    }
  }

  const handleEditChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!editFormData) return
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    if (name.startsWith('location.')) {
      const field = name.split('.')[1]
      setEditFormData((prev) => prev && ({ ...prev, location: { ...prev.location, [field]: value } }))
    } else if (name.startsWith('operatingHours.')) {
      const [, day, field] = name.split('.')
      setEditFormData((prev) => {
        if (!prev) return prev
        const next = { ...prev, operatingHours: { ...prev.operatingHours } }
        next.operatingHours[day] = { ...next.operatingHours[day], [field]: field === 'open' ? checked : value }
        return next
      })
    } else {
      setEditFormData((prev) => prev && ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    }
    setEditError('')
    setEditSuccess('')
  }

  const handleAddService = () => {
    if (!editFormData || !editCurrentService.trim() || editFormData.services.includes(editCurrentService.trim())) return
    setEditFormData((prev) => prev ? { ...prev, services: [...prev.services, editCurrentService.trim()] } : null)
    setEditCurrentService('')
  }

  const handleRemoveService = (index: number) => {
    setEditFormData((prev) => prev ? { ...prev, services: prev.services.filter((_, i) => i !== index) } : null)
  }

  const validateEditForm = (): boolean => {
    if (!editFormData) return false
    if (!editFormData.departmentName.trim()) { setEditError('Department name is required'); return false }
    if (!editFormData.description.trim()) { setEditError('Description is required'); return false }
    for (const day of DAYS) {
      const h = editFormData.operatingHours[day]
      if (h?.open) {
        if (!h.startTime || !h.endTime) { setEditError(`Provide start and end times for ${day}`); return false }
        if (h.startTime >= h.endTime) { setEditError(`End time must be after start time for ${day}`); return false }
      }
    }
    return true
  }

  const handleEditSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setEditError('')
    setEditSuccess('')
    if (!editFormData || !editingId || !validateEditForm()) return
    setEditLoading(true)
    try {
      const payload: Parameters<typeof departmentService.updateDepartment>[1] = {
        departmentName: editFormData.departmentName.trim(),
        description: editFormData.description.trim(),
        isActive: editFormData.isActive,
        operatingHours: editFormData.operatingHours
      }
      if (editFormData.departmentCode.trim()) payload.departmentCode = editFormData.departmentCode.trim().toUpperCase()
      if (editFormData.headOfDepartment.trim()) payload.headOfDepartment = editFormData.headOfDepartment.trim()
      if (editFormData.image.trim()) payload.image = editFormData.image.trim()
      if (editFormData.location.floor || editFormData.location.building || editFormData.location.roomNumber) {
        payload.location = {}
        if (editFormData.location.floor) payload.location.floor = editFormData.location.floor.trim()
        if (editFormData.location.building) payload.location.building = editFormData.location.building.trim()
        if (editFormData.location.roomNumber) payload.location.roomNumber = editFormData.location.roomNumber.trim()
      }
      if (editFormData.services.length > 0) payload.services = editFormData.services
      await departmentService.updateDepartment(editingId, payload)
      setEditSuccess('Department updated successfully.')
      setTimeout(() => {
        setEditingId(null)
        loadDepartments()
      }, 800)
    } catch (err) {
      setEditError((err as { message?: string })?.message || 'Failed to update department')
    } finally {
      setEditLoading(false)
    }
  }

  const closeEditModal = () => {
    setEditingId(null)
    setEditFormData(null)
    setEditCurrentService('')
    setEditError('')
    setEditSuccess('')
  }

  if (loading) {
    return <div className="departments-page-loading">Loading departments...</div>
  }

  return (
    <div className="departments-management">
      <div className="departments-page-header">
        <div>
          <h2>Departments Management</h2>
          <p>Manage hospital departments </p>
        </div>
        <Link to="/admin/add-department" className="departments-add-btn">
          Add Department
        </Link>
      </div>

      {error && <div className="departments-error-msg">{error}</div>}

      <div className="departments-list-wrap">
        {departments.length === 0 ? (
          <div className="departments-no-data">No departments found</div>
        ) : (
          <>
            <div className="departments-count">
              <p>
                Showing <strong>{(page - 1) * PAGE_SIZE + 1}</strong> to{' '}
                <strong>{Math.min(page * PAGE_SIZE, totalDepartments)}</strong> of{' '}
                <strong>{totalDepartments}</strong> department{totalDepartments !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="departments-grid">
              {departments.map((dept) => {
                const id = dept.id || (dept as { _id?: string })._id
                return (
                  <div key={id} className="department-card">
                    {dept.departmentCode && (
                      <span className="department-code">{dept.departmentCode}</span>
                    )}
                    <span className={`department-card-status ${dept.isActive ? 'active' : 'inactive'}`}>
                      {dept.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <h3>{dept.departmentName}</h3>
                    <p className="department-description">{dept.description}</p>
                    <div className="department-card-footer">
                      <Link to={`/departments/${id}`} className="view-details-btn">
                        View Details
                      </Link>
                      <div className="department-card-actions">
                        <button
                          type="button"
                          className="department-card-btn department-card-btn-edit"
                          onClick={() => id && setEditingId(id)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="department-card-btn department-card-btn-delete"
                          onClick={() => handleDelete(dept)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="pagination-container">
                <button
                  type="button"
                  className="pagination-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Previous
                </button>
                <div className="pagination-pages">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`pagination-page-btn ${p === page ? 'active' : ''}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="pagination-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Popup for editing the departments */}
      {editingId && (
        <div className="departments-edit-backdrop" onClick={closeEditModal} role="presentation">
          <div className="departments-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="departments-edit-modal-header">
              <h3>Edit Department</h3>
              <button type="button" className="departments-edit-modal-close" onClick={closeEditModal} aria-label="Close">×</button>
            </div>
            <div className="departments-edit-modal-body">
              {editLoadError ? (
                <div className="error-message">{editLoadError}<button type="button" className="submit-button" style={{ marginTop: 12 }} onClick={closeEditModal}>Close</button></div>
              ) : !editFormData ? (
                <p>Loading...</p>
              ) : (
                <form onSubmit={handleEditSubmit} className="add-department-form">
                  {editError && <div className="error-message">{editError}</div>}
                  {editSuccess && <div className="success-message">{editSuccess}</div>}

                  <div className="form-section">
                    <h3>Basic Information</h3>
                    <div className="form-group">
                      <label htmlFor="edit-dept-name">Department Name <span className="required">*</span></label>
                      <input type="text" id="edit-dept-name" name="departmentName" value={editFormData.departmentName} onChange={handleEditChange} placeholder="e.g., Cardiology" required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-dept-desc">Description <span className="required">*</span></label>
                      <textarea id="edit-dept-desc" name="description" value={editFormData.description} onChange={handleEditChange} placeholder="Enter department description" rows={4} required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-dept-code">Department Code</label>
                      <input type="text" id="edit-dept-code" name="departmentCode" value={editFormData.departmentCode} onChange={handleEditChange} placeholder="e.g., CARD" style={{ textTransform: 'uppercase' }} />
                    </div>
                  </div>

                  <div className="form-section">
                    <h3>Location</h3>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="edit-dept-floor">Floor</label>
                        <input type="text" id="edit-dept-floor" name="location.floor" value={editFormData.location.floor} onChange={handleEditChange} placeholder="e.g., 3rd Floor" />
                      </div>
                      <div className="form-group">
                        <label htmlFor="edit-dept-building">Building</label>
                        <input type="text" id="edit-dept-building" name="location.building" value={editFormData.location.building} onChange={handleEditChange} placeholder="e.g., Main Building" />
                      </div>
                      <div className="form-group">
                        <label htmlFor="edit-dept-room">Room Number</label>
                        <input type="text" id="edit-dept-room" name="location.roomNumber" value={editFormData.location.roomNumber} onChange={handleEditChange} placeholder="e.g., 301" />
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <h3>Head of Department</h3>
                    <div className="form-group">
                      <label htmlFor="edit-dept-head">Head of Department User ID</label>
                      <input type="text" id="edit-dept-head" name="headOfDepartment" value={editFormData.headOfDepartment} onChange={handleEditChange} placeholder="Enter user ID (optional)" />
                      <small>Leave empty if not assigned yet</small>
                    </div>
                  </div>

                  <div className="form-section">
                    <h3>Services</h3>
                    <div className="form-group">
                      <label htmlFor="edit-dept-service">Add Service</label>
                      <div className="input-with-button">
                        <input type="text" id="edit-dept-service" value={editCurrentService} onChange={(e) => setEditCurrentService(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddService())} placeholder="e.g., Heart Surgery" />
                        <button type="button" onClick={handleAddService} className="add-item-btn">Add</button>
                      </div>
                      {editFormData.services.length > 0 && (
                        <div className="tag-list">
                          {editFormData.services.map((s, i) => (
                            <span key={i} className="tag">{s}<button type="button" onClick={() => handleRemoveService(i)} className="remove-tag">×</button></span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-section">
                    <h3>Operating Hours</h3>
                    {DAYS.map((day) => (
                      <div key={day} className="operating-hours-row">
                        <div className="day-checkbox">
                          <input type="checkbox" id={`edit-dept-${day}-open`} name={`operatingHours.${day}.open`} checked={editFormData.operatingHours[day]?.open ?? false} onChange={handleEditChange} />
                          <label htmlFor={`edit-dept-${day}-open`}>{day.charAt(0).toUpperCase() + day.slice(1)}</label>
                        </div>
                        {editFormData.operatingHours[day]?.open && (
                          <div className="time-inputs">
                            <input type="time" name={`operatingHours.${day}.startTime`} value={editFormData.operatingHours[day].startTime} onChange={handleEditChange} required />
                            <span>to</span>
                            <input type="time" name={`operatingHours.${day}.endTime`} value={editFormData.operatingHours[day].endTime} onChange={handleEditChange} required />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="form-section">
                    <h3>Additional Information</h3>
                    <div className="form-group">
                      <label htmlFor="edit-dept-image">Image URL</label>
                      <input type="url" id="edit-dept-image" name="image" value={editFormData.image} onChange={handleEditChange} placeholder="https://example.com/image.jpg" />
                    </div>
                    <div className="form-group checkbox-group">
                      <label>
                        <input type="checkbox" name="isActive" checked={editFormData.isActive} onChange={handleEditChange} />
                        Department is active
                      </label>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="button" onClick={closeEditModal} className="cancel-button">Cancel</button>
                    <button type="submit" className="submit-button" disabled={editLoading}>{editLoading ? 'Saving...' : 'Save Changes'}</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DepartmentsManagement
