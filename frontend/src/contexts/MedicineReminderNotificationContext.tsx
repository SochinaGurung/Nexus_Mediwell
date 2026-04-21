import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction
} from 'react'
import { authService } from '../services/authService'
import {
  medicineReminderService,
  isReminderNotificationDueNow,
  type ReminderNotificationItem
} from '../services/medicineReminderService'
import { getMedicineReminderDisplayLabel } from './medicineReminderDisplay'
import './MedicineReminderNotificationContext.css'

type ModalState = {
  id: string
  medicineName: string
  timeLabel: string
  detail: string
}

const POLL_MS_VISIBLE = 1500
const POLL_MS_HIDDEN = 15000

type ReminderUiValue = {
  dueNotifications: ReminderNotificationItem[]
  openReminderById: (id: string) => void
  reminderFeed: ReminderNotificationItem[]
  unreadReminderCount: number
  notificationsPanelOpen: boolean
  setNotificationsPanelOpen: Dispatch<SetStateAction<boolean>>
  sessionIsPatient: boolean
}

const ReminderUiContext = createContext<ReminderUiValue | null>(null)

export function useMedicineReminderUi(): ReminderUiValue {
  const ctx = useContext(ReminderUiContext)
  if (!ctx) {
    throw new Error('useMedicineReminderUi must be used within MedicineReminderNotificationProvider')
  }
  return ctx
}

function isPatientSession(): boolean {
  return authService.isAuthenticated() && authService.getCurrentUser()?.role === 'patient'
}

function buildModalState(n: ReminderNotificationItem): ModalState {
  const scheduled = new Date(n.scheduledFor)
  const timeLabel = Number.isNaN(scheduled.getTime())
    ? ''
    : scheduled.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return {
    id: n._id,
    medicineName: getMedicineReminderDisplayLabel(n),
    timeLabel,
    detail: (n.message || '').trim()
  }
}

export function MedicineReminderNotificationProvider({ children }: { children: ReactNode }) {
  const [dueNotifications, setDueNotifications] = useState<ReminderNotificationItem[]>([])
  const [reminderFeed, setReminderFeed] = useState<ReminderNotificationItem[]>([])
  const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(false)
  const [sessionIsPatient, setSessionIsPatient] = useState(false)
  const [modal, setModal] = useState<ModalState | null>(null)
  const modalQueueRef = useRef<ReminderNotificationItem[]>([])
  const shownIdsRef = useRef<Set<string>>(new Set())
  const permissionAskedRef = useRef(false)
  const lastNotificationsRef = useRef<ReminderNotificationItem[]>([])

  const unreadReminderCount = useMemo(
    () => reminderFeed.filter((n) => !n.isRead).length,
    [reminderFeed]
  )

  const advanceModal = useCallback(() => {
    setModal(() => {
      const next = modalQueueRef.current.shift()
      return next ? buildModalState(next) : null
    })
  }, [])

  const acknowledge = useCallback(
    async (id: string) => {
      await medicineReminderService.markReminderNotificationRead(id).catch(() => {})
      advanceModal()
    },
    [advanceModal]
  )

  const openReminderById = useCallback((id: string) => {
    const n = lastNotificationsRef.current.find((x) => x._id === id && !x.isRead)
    if (!n) return
    setModal((cur) => {
      if (cur?.id === id) return cur
      if (cur) {
        if (!modalQueueRef.current.some((x) => x._id === id)) {
          modalQueueRef.current.push(n)
        }
        return cur
      }
      return buildModalState(n)
    })
  }, [])

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined

    const tick = async () => {
      const patient = isPatientSession()
      setSessionIsPatient(patient)
      if (!patient) {
        setDueNotifications([])
        setReminderFeed([])
        lastNotificationsRef.current = []
        return
      }
      try {
        const { notifications } = await medicineReminderService.getMyReminderNotifications()
        const list = notifications || []
        lastNotificationsRef.current = list
        const sortedFeed = [...list].sort(
          (a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime()
        )
        setReminderFeed(sortedFeed.slice(0, 25))
        const now = Date.now()
        const due = list
          .filter((n) => isReminderNotificationDueNow(n, now))
          .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
        setDueNotifications(due)

        const incoming = due.filter((n) => !shownIdsRef.current.has(n._id))
        if (incoming.length === 0) return

        if (
          typeof Notification !== 'undefined' &&
          Notification.permission === 'default' &&
          !permissionAskedRef.current
        ) {
          permissionAskedRef.current = true
          void Notification.requestPermission()
        }

        for (const n of incoming) {
          shownIdsRef.current.add(n._id)
          modalQueueRef.current.push(n)
        }

        if (
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted' &&
          document.visibilityState !== 'visible'
        ) {
          for (const n of incoming) {
            try {
              const label = getMedicineReminderDisplayLabel(n)
              const st = buildModalState(n)
              new Notification('Did you take this medicine?', {
                body: st.timeLabel ? `${label} · ${st.timeLabel}` : label,
                tag: n._id
              })
            } catch {
              /* ignore */
            }
          }
        }

        setModal((current) => {
          if (current) return current
          const next = modalQueueRef.current.shift()
          return next ? buildModalState(next) : null
        })
      } catch {
        /* ignore */
      }
    }

    const schedulePoll = () => {
      if (intervalId) clearInterval(intervalId)
      const ms = document.visibilityState === 'visible' ? POLL_MS_VISIBLE : POLL_MS_HIDDEN
      intervalId = setInterval(tick, ms)
    }

    void tick()
    schedulePoll()

    const onVis = () => {
      void tick()
      schedulePoll()
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      document.removeEventListener('visibilitychange', onVis)
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  const uiValue = useMemo(
    () => ({
      dueNotifications,
      openReminderById,
      reminderFeed,
      unreadReminderCount,
      notificationsPanelOpen,
      setNotificationsPanelOpen,
      sessionIsPatient
    }),
    [
      dueNotifications,
      openReminderById,
      reminderFeed,
      unreadReminderCount,
      notificationsPanelOpen,
      sessionIsPatient
    ]
  )

  return (
    <ReminderUiContext.Provider value={uiValue}>
      {children}
      {modal && sessionIsPatient ? (
        <div className="medicine-reminder-modal-backdrop" role="presentation">
          <div
            className="medicine-reminder-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="medicine-reminder-modal-title"
          >
            <h2 id="medicine-reminder-modal-title" className="medicine-reminder-modal-heading">
              Did you take this medicine?
            </h2>
            <p className="medicine-reminder-modal-medicine">{modal.medicineName}</p>
            {modal.timeLabel ? (
              <p className="medicine-reminder-modal-time">Scheduled for {modal.timeLabel}</p>
            ) : null}
            {modal.detail ? (
              <p className="medicine-reminder-modal-detail">{modal.detail}</p>
            ) : null}
            <div className="medicine-reminder-modal-actions">
              <button
                type="button"
                className="medicine-reminder-modal-btn medicine-reminder-modal-btn-primary"
                onClick={() => void acknowledge(modal.id)}
              >
                Yes, I took it
              </button>
              <button
                type="button"
                className="medicine-reminder-modal-btn medicine-reminder-modal-btn-secondary"
                onClick={() => void acknowledge(modal.id)}
              >
                Not yet
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ReminderUiContext.Provider>
  )
}
