import { useState, useEffect } from 'react'
import {
  feedbackService,
  type FeedbackItem,
} from '../../../services/feedbackService'
import './FeedbackManagement.css'

function formatDate(d: string | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function previewText(text: string, max = 80) {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

const FeedbackManagement = () => {
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    totalPages: 1,
    totalFeedback: 0,
    hasNextPage: false,
    hasPrevPage: false,
  })
  const [selected, setSelected] = useState<FeedbackItem | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const limit = 15

  useEffect(() => {
    loadFeedback()
  }, [statusFilter, page])

  async function loadFeedback() {
    try {
      setLoading(true)
      setError('')
      const res = await feedbackService.getAllFeedback({
        page: String(page),
        limit: String(limit),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      })
      setItems(res.feedback || [])
      setPagination({
        totalPages: res.pagination?.totalPages ?? 1,
        totalFeedback: res.pagination?.totalFeedback ?? 0,
        hasNextPage: res.pagination?.hasNextPage ?? false,
        hasPrevPage: res.pagination?.hasPrevPage ?? false,
      })
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to load feedback')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  async function markStatus(id: string, status: 'read' | 'archived') {
    try {
      setUpdatingId(id)
      setError('')
      await feedbackService.updateFeedbackStatus(id, { status })
      await loadFeedback()
      setSelected((s) => (s && s._id === id ? { ...s, status } : s))
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to update status')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this feedback permanently?')) return
    try {
      setUpdatingId(id)
      setError('')
      await feedbackService.deleteFeedback(id)
      if (selected?._id === id) setSelected(null)
      await loadFeedback()
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to delete')
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading && items.length === 0) {
    return <div className="page-loading">Loading feedback…</div>
  }

  return (
    <div className="feedback-management">
      <div className="page-header">
        <div>
          <h2>Feedback & reviews</h2>
          <p>Messages submitted from the site contact / feedback form</p>
        </div>
      </div>

      {error ? <div className="feedback-admin-error">{error}</div> : null}

      <div className="filters-section feedback-filters">
        <label className="feedback-filter-label" htmlFor="feedback-status">
          Status
        </label>
        <select
          id="feedback-status"
          className="filter-select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
        >
          <option value="all">All</option>
          <option value="new">New</option>
          <option value="read">Read</option>
          <option value="replied">Replied</option>
          <option value="archived">Archived</option>
        </select>
        <span className="feedback-count">
          {pagination.totalFeedback} total
        </span>
      </div>

      <div className="table-container">
        <table className="feedback-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Message</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="no-data">
                  No feedback for this filter
                </td>
              </tr>
            ) : (
              items.map((f) => (
                <tr key={f._id}>
                  <td>{formatDate(f.createdAt)}</td>
                  <td>{f.fullName}</td>
                  <td>{f.email}</td>
                  <td>{f.phoneNumber}</td>
                  <td>
                    <span className={`fb-status fb-status-${f.status}`}>{f.status}</span>
                  </td>
                  <td className="feedback-preview-cell">{previewText(f.message)}</td>
                  <td>
                    <div className="action-buttons feedback-row-actions">
                      <button
                        type="button"
                        className="view-btn"
                        onClick={() => setSelected(f)}
                      >
                        View
                      </button>
                      {f.status === 'new' && (
                        <button
                          type="button"
                          className="edit-btn"
                          disabled={updatingId === f._id}
                          onClick={() => markStatus(f._id, 'read')}
                        >
                          Mark read
                        </button>
                      )}
                      {f.status !== 'archived' && (
                        <button
                          type="button"
                          className="archive-btn"
                          disabled={updatingId === f._id}
                          onClick={() => markStatus(f._id, 'archived')}
                        >
                          Archive
                        </button>
                      )}
                      <button
                        type="button"
                        className="delete-btn"
                        disabled={updatingId === f._id}
                        onClick={() => handleDelete(f._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="feedback-pagination">
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
          aria-labelledby="feedback-modal-title"
          onClick={() => setSelected(null)}
        >
          <div className="modal-content feedback-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="feedback-modal-title">Feedback detail</h3>
              <button type="button" className="close-btn" onClick={() => setSelected(null)}>
                ×
              </button>
            </div>
            <div className="modal-body feedback-modal-body">
              <div className="detail-row">
                <strong>From</strong>
                <span>{selected.fullName}</span>
              </div>
              <div className="detail-row">
                <strong>Email</strong>
                <span>{selected.email}</span>
              </div>
              <div className="detail-row">
                <strong>Phone</strong>
                <span>{selected.phoneNumber}</span>
              </div>
              <div className="detail-row">
                <strong>Submitted</strong>
                <span>{formatDate(selected.createdAt)}</span>
              </div>
              <div className="detail-row">
                <strong>Status</strong>
                <span className={`fb-status fb-status-${selected.status}`}>
                  {selected.status}
                </span>
              </div>
              <div className="detail-row detail-row-block">
                <strong>Message</strong>
                <p className="feedback-full-message">{selected.message}</p>
              </div>
              {selected.adminResponse ? (
                <div className="detail-row detail-row-block">
                  <strong>Admin response</strong>
                  <p className="feedback-admin-response">{selected.adminResponse}</p>
                  <p className="feedback-meta">
                    {formatDate(selected.respondedAt)}
                    {selected.respondedBy &&
                    typeof selected.respondedBy === 'object' &&
                    (selected.respondedBy.username || selected.respondedBy.email)
                      ? ` · ${selected.respondedBy.username || selected.respondedBy.email}`
                      : ''}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FeedbackManagement
