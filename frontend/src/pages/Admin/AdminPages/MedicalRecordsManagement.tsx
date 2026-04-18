import { useState, useEffect } from 'react'
import {
  patientService,
  type AdminMedicalRecordRow,
} from '../../../services/patientService'
import './MedicalRecordsManagement.css'

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function preview(text: string, max = 72) {
  const t = (text || '').replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t || '—'
  return `${t.slice(0, max)}…`
}

const MedicalRecordsManagement = () => {
  const [records, setRecords] = useState<AdminMedicalRecordRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchApplied, setSearchApplied] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    totalPages: 1,
    totalRecords: 0,
    hasNextPage: false,
    hasPrevPage: false,
  })
  const [selected, setSelected] = useState<AdminMedicalRecordRow | null>(null)

  const limit = 20

  useEffect(() => {
    loadRecords()
  }, [page, searchApplied])

  async function loadRecords() {
    try {
      setLoading(true)
      setError('')
      const res = await patientService.getAdminMedicalRecords({
        page: String(page),
        limit: String(limit),
        ...(searchApplied ? { search: searchApplied } : {}),
      })
      setRecords(res.records || [])
      setPagination({
        totalPages: res.pagination?.totalPages ?? 1,
        totalRecords: res.pagination?.totalRecords ?? 0,
        hasNextPage: res.pagination?.hasNextPage ?? false,
        hasPrevPage: res.pagination?.hasPrevPage ?? false,
      })
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to load medical records')
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  const applySearch = () => {
    setPage(1)
    setSearchApplied(searchInput.trim())
  }

  if (loading && records.length === 0) {
    return <div className="page-loading">Loading medical records…</div>
  }

  return (
    <div className="medical-records-admin">
      <div className="page-header">
        <div>
          <h2>Medical records</h2>
          <p>Entries from patient charts (doctor-added records show the prescribing doctor)</p>
        </div>
      </div>

      {error ? <div className="medical-records-admin-error">{error}</div> : null}

      <div className="filters-section medical-records-filters">
        <div className="search-bar medical-records-search">
          <input
            type="search"
            placeholder="Search by patient, doctor, condition, prescription… — press Enter"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                applySearch()
              }
            }}
            autoComplete="off"
            enterKeyHint="search"
          />
          <button type="button" className="medical-records-search-btn" onClick={applySearch}>
            Search
          </button>
        </div>
        <span className="medical-records-count">{pagination.totalRecords} record(s)</span>
      </div>

      <div className="table-container">
        <table className="medical-records-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Condition</th>
              <th>Prescription</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={6} className="no-data">
                  No medical records found
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={`${r.patientId}-${r.recordId}`}>
                  <td>{formatDate(r.diagnosisDate)}</td>
                  <td>
                    <div className="mr-name">{r.patientName}</div>
                    <div className="mr-sub">{r.patientEmail}</div>
                  </td>
                  <td>
                    {r.doctorName || (r.doctorId ? 'Unknown doctor' : '—')}
                  </td>
                  <td className="mr-preview">{preview(r.condition, 56)}</td>
                  <td className="mr-preview">{preview(r.prescription, 80)}</td>
                  <td>
                    <button type="button" className="view-btn" onClick={() => setSelected(r)}>
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="medical-records-pagination">
          <button
            type="button"
            className="page-btn"
            disabled={!pagination.hasPrevPage || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span>
            Page {page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            className="page-btn"
            disabled={!pagination.hasNextPage || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {selected && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mr-modal-title"
          onClick={() => setSelected(null)}
        >
          <div className="modal-content mr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="mr-modal-title">Medical record</h3>
              <button type="button" className="close-btn" onClick={() => setSelected(null)}>
                ×
              </button>
            </div>
            <div className="modal-body mr-modal-body">
              <div className="detail-row">
                <strong>Patient</strong>
                <span>
                  {selected.patientName} ({selected.patientEmail})
                </span>
              </div>
              <div className="detail-row">
                <strong>Doctor</strong>
                <span>
                  {selected.doctorName
                    ? selected.doctorName
                    : selected.doctorId
                      ? 'Unknown doctor'
                      : 'Not recorded (legacy entry)'}
                </span>
              </div>
              <div className="detail-row">
                <strong>Diagnosis date</strong>
                <span>{formatDate(selected.diagnosisDate)}</span>
              </div>
              <div className="detail-row detail-row-block">
                <strong>Condition</strong>
                <p className="mr-full">{selected.condition || '—'}</p>
              </div>
              <div className="detail-row detail-row-block">
                <strong>Prescription</strong>
                <p className="mr-full">{selected.prescription || '—'}</p>
              </div>
              {selected.symptoms ? (
                <div className="detail-row detail-row-block">
                  <strong>Symptoms</strong>
                  <p className="mr-full">{selected.symptoms}</p>
                </div>
              ) : null}
              {selected.notes ? (
                <div className="detail-row detail-row-block">
                  <strong>Notes</strong>
                  <p className="mr-full">{selected.notes}</p>
                </div>
              ) : null}
              {selected.followUpInstructions ? (
                <div className="detail-row detail-row-block">
                  <strong>Follow-up</strong>
                  <p className="mr-full">{selected.followUpInstructions}</p>
                </div>
              ) : null}
              {selected.testRecommendations ? (
                <div className="detail-row detail-row-block">
                  <strong>Tests</strong>
                  <p className="mr-full">{selected.testRecommendations}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MedicalRecordsManagement
