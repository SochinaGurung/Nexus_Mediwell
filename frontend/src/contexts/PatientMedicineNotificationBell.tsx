import { useEffect, useRef } from 'react'
import { useMedicineReminderUi } from './MedicineReminderNotificationContext'
import { getMedicineReminderDisplayLabel } from './medicineReminderDisplay'
import type { ReminderNotificationItem } from '../services/medicineReminderService'

function formatNotifTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function notifPrimaryLine(n: ReminderNotificationItem): string {
  const t = (n.title || '').trim()
  if (/did you take this medicine/i.test(t)) return 'Did you take this medicine?'
  return t || 'Medicine reminder'
}

export function PatientMedicineNotificationBell() {
  const {
    reminderFeed,
    unreadReminderCount,
    notificationsPanelOpen,
    setNotificationsPanelOpen,
    openReminderById,
    sessionIsPatient
  } = useMedicineReminderUi()

  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!notificationsPanelOpen) return
    const onDocDown = (e: MouseEvent) => {
      const el = wrapRef.current
      if (el && !el.contains(e.target as Node)) setNotificationsPanelOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [notificationsPanelOpen, setNotificationsPanelOpen])

  if (!sessionIsPatient) return null

  const badge =
    unreadReminderCount > 99 ? '99+' : unreadReminderCount > 0 ? String(unreadReminderCount) : null

  return (
    <div className="patient-fb-notif-wrap" ref={wrapRef}>
      <button
        type="button"
        className="patient-fb-notif-bell patient-nav-item patient-nav-item-badge"
        aria-label={`Notifications${unreadReminderCount ? `, ${unreadReminderCount} unread` : ''}`}
        aria-expanded={notificationsPanelOpen}
        onClick={() => setNotificationsPanelOpen((o) => !o)}
      >
        <span className="patient-nav-icon" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" />
          </svg>
        </span>
        <span className="patient-fb-notif-label">Notifications</span>
        {badge ? <span className="patient-nav-badge">{badge}</span> : null}
      </button>

      {notificationsPanelOpen ? (
        <div className="patient-fb-notif-dropdown" role="menu">
          <div className="patient-fb-notif-dropdown-header">
            <span className="patient-fb-notif-dropdown-title">Notifications</span>
          </div>
          <div className="patient-fb-notif-dropdown-body">
            {reminderFeed.length === 0 ? (
              <p className="patient-fb-notif-empty">No medicine reminders yet.</p>
            ) : (
              reminderFeed.map((n) => {
                const sub = getMedicineReminderDisplayLabel(n)
                return (
                  <button
                    key={n._id}
                    type="button"
                    role="menuitem"
                    className={`patient-fb-notif-item${n.isRead ? '' : ' patient-fb-notif-item--unread'}`}
                    onClick={() => {
                      if (!n.isRead) openReminderById(n._id)
                      setNotificationsPanelOpen(false)
                    }}
                  >
                    <span className="patient-fb-notif-item-avatar" aria-hidden>
                      💊
                    </span>
                    <span className="patient-fb-notif-item-main">
                      <span className="patient-fb-notif-item-line1">{notifPrimaryLine(n)}</span>
                      <span className="patient-fb-notif-item-line2">{sub}</span>
                      <span className="patient-fb-notif-item-time">{formatNotifTime(n.scheduledFor)}</span>
                    </span>
                    {!n.isRead ? <span className="patient-fb-notif-item-dot" aria-hidden /> : null}
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
