import { useEffect, useState } from 'react'
import { medicineReminderService, type MedicineSuggestion, type ReminderPlan } from '../../services/medicineReminderService'
import './PatientMedicineReminderPanel.css'

type Props = {
  embedded?: boolean
}

function doctorLabel(r: ReminderPlan) {
  if (!r.doctor) return 'Self'
  const n = `${r.doctor.firstName || ''} ${r.doctor.lastName || ''}`.trim()
  return n || r.doctor.username || 'Doctor'
}

export default function PatientMedicineReminderPanel({ embedded = false }: Props) {
  const [suggestions, setSuggestions] = useState<MedicineSuggestion[]>([])
  const [reminders, setReminders] = useState<ReminderPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [medicineName, setMedicineName] = useState('')
  const [instructions, setInstructions] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [timeInput, setTimeInput] = useState('')
  const [times, setTimes] = useState<string[]>([])
  const [savingReminder, setSavingReminder] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      setError('')
      const [sugRes, remRes] = await Promise.all([
        medicineReminderService.getPatientSuggestions(),
        medicineReminderService.getMyReminders()
      ])
      setSuggestions(sugRes.suggestions || [])
      setReminders(remRes.reminders || [])
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to load medicine data')
    } finally {
      setLoading(false)
    }
  }

  function addTime() {
    if (!timeInput) return
    if (!times.includes(timeInput)) setTimes((prev) => [...prev, timeInput].sort())
    setTimeInput('')
  }

  function resetReminderForm() {
    setMedicineName('')
    setInstructions('')
    setFromDate('')
    setToDate('')
    setTimeInput('')
    setTimes([])
  }

  async function handleDeleteReminder(id: string, medicineName: string) {
    if (!window.confirm(`Delete reminder for “${medicineName}”? This cannot be undone.`)) return
    try {
      setError('')
      setDeletingId(id)
      await medicineReminderService.deleteReminder(id)
      setSuccess('Reminder removed')
      await loadData()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to delete reminder')
    } finally {
      setDeletingId(null)
    }
  }

  async function createReminder(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!medicineName.trim()) return setError('Medicine name is required')
    if (!fromDate) return setError('Start date is required')
    if (!toDate) return setError('End date is required')
    if (new Date(toDate) < new Date(fromDate)) return setError('End date must be on or after start date')
    if (!times.length) return setError('Add at least one reminder time')
    try {
      setSavingReminder(true)
      await medicineReminderService.createReminder({
        medicineName: medicineName.trim(),
        instructions: instructions.trim() || undefined,
        fromDate,
        toDate,
        times,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      })
      setSuccess('Reminder saved successfully')
      resetReminderForm()
      await loadData()
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to create reminder')
    } finally {
      setSavingReminder(false)
    }
  }

  const wrapClass = embedded ? 'patient-meds-panel patient-meds-panel--embedded' : 'patient-meds-panel'

  return (
    <div className={wrapClass}>
      {!embedded && <h1>My Medicines & Reminders</h1>}
      {loading ? <p>Loading...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="success-text">{success}</p> : null}

      <section className="patient-meds-card">
        <h2>Add medicine reminder</h2>
        <p className="muted patient-meds-lead">
          Enter your medicine, the dates you need reminders, and the times of day to be notified.
        </p>
        <form onSubmit={createReminder} className="patient-meds-reminder-form">
          <label>
            Medicine name <span className="required-star">*</span>
            <input
              type="text"
              value={medicineName}
              onChange={(e) => setMedicineName(e.target.value)}
              placeholder="e.g. Vitamin D"
              autoComplete="off"
            />
          </label>
          <label>
            Notes (optional)
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              placeholder="Dosage or other notes for yourself"
            />
          </label>
          <div className="med-suggest-grid-2 patient-meds-date-row">
            <label>
              From date <span className="required-star">*</span>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </label>
            <label>
              To date <span className="required-star">*</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </label>
          </div>
          <div className="time-row">
            <input type="time" value={timeInput} onChange={(e) => setTimeInput(e.target.value)} />
            <button type="button" onClick={addTime}>Add time</button>
          </div>
          {times.length > 0 && (
            <div className="tags">
              {times.map((t) => (
                <button type="button" key={t} className="tag" onClick={() => setTimes((prev) => prev.filter((x) => x !== t))}>
                  {t} ×
                </button>
              ))}
            </div>
          )}
          <button type="submit" className="patient-meds-primary-btn" disabled={savingReminder}>
            {savingReminder ? 'Saving...' : 'Save reminder'}
          </button>
        </form>
      </section>

      <section className="patient-meds-card">
        <h2>From your doctor</h2>
        {suggestions.length === 0 ? (
          <p className="muted">No medicine notes from your doctor yet.</p>
        ) : (
          <div className="patient-meds-table-wrap">
            <table className="patient-meds-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Instructions</th>
                  <th>Doctor</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((s) => (
                  <tr key={s._id}>
                    <td>{s.medicineName}</td>
                    <td className="patient-meds-instructions-cell">{s.instructions?.trim() || '—'}</td>
                    <td>{`${s.doctor?.firstName || ''} ${s.doctor?.lastName || ''}`.trim() || s.doctor?.username || 'Doctor'}</td>
                    <td>{s.status}</td>
                    <td>
                      {s.status === 'suggested' ? (
                        <div className="inline-actions">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                setError('')
                                await medicineReminderService.respondToSuggestion(s._id, 'accepted')
                                await loadData()
                              } catch (err: unknown) {
                                setError((err as { message?: string })?.message || 'Failed to update')
                              }
                            }}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="danger"
                            onClick={async () => {
                              try {
                                setError('')
                                await medicineReminderService.respondToSuggestion(s._id, 'rejected')
                                await loadData()
                              } catch (err: unknown) {
                                setError((err as { message?: string })?.message || 'Failed to update')
                              }
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="patient-meds-card">
        <h2>My reminders</h2>
        {reminders.length === 0 ? (
          <p className="muted">No reminders yet. Add one above.</p>
        ) : (
          <div className="patient-meds-table-wrap">
            <table className="patient-meds-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Notes</th>
                  <th>Source</th>
                  <th>Date range</th>
                  <th>Times</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reminders.map((r) => (
                  <tr key={r._id}>
                    <td>{r.medicineName}</td>
                    <td className="patient-meds-instructions-cell">{r.instructions?.trim() || '—'}</td>
                    <td>{doctorLabel(r)}</td>
                    <td>{new Date(r.fromDate).toLocaleDateString()} – {new Date(r.toDate).toLocaleDateString()}</td>
                    <td>{(r.times || []).join(', ')}</td>
                    <td>{r.isActive ? 'Active' : 'Paused'}</td>
                    <td>
                      <button
                        type="button"
                        className="danger patient-meds-delete-btn"
                        disabled={deletingId === r._id}
                        onClick={() => handleDeleteReminder(r._id, r.medicineName)}
                      >
                        {deletingId === r._id ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
