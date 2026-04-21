import { useEffect, useState, useMemo, type ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { appointmentService } from '../../../services/appointmentService'
import './DashboardOverview.css'

type Period = 'weekly' | 'monthly'

type StatsState = {
  totalPatients: number
  totalDoctors: number
  totalAppointments: number
  totalRegisteredUsers?: number
  appointmentsWeekly?: { label: string; count: number }[]
  appointmentsMonthly?: { label: string; count: number }[]
  registrationsWeekly?: { label: string; count: number }[]
  registrationsMonthly?: { label: string; count: number }[]
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconStethoscope() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4.8 4.8a2 2 0 0 1 2.8 0l8.4 8.4a2 2 0 0 1 0 2.8l-1.4 1.4a2 2 0 0 1-2.8 0L3.4 9a2 2 0 0 1 0-2.8z" />
      <path d="M10.5 13.5L9 15" />
      <path d="M15 9l1.5-1.5" />
      <path d="M19.5 4.5L21 3" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconUserPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  )
}

function SimpleBarBlock({
  title,
  description,
  data,
  barColor,
  emptyMessage,
  panelIcon,
}: {
  title: string
  description: string
  data: { label: string; count: number }[]
  barColor: string
  emptyMessage: string
  panelIcon?: ReactNode
}) {
  return (
    <div className="dashboard-chart-panel">
      <div className="dashboard-chart-panel-head">
        <div className="dashboard-chart-panel-icon">
          {panelIcon ?? <IconCalendar />}
        </div>
        <h3 className="dashboard-chart-panel-title">{title}</h3>
      </div>
      <p className="dashboard-chart-panel-desc">{description}</p>
      <div className="dashboard-chart-panel-body">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8eef3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={60}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
              <Tooltip />
              <Bar dataKey="count" fill={barColor} radius={[6, 6, 0, 0]} name="Count" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="dashboard-chart-panel-empty">{emptyMessage}</p>
        )}
      </div>
    </div>
  )
}

export default function DashboardOverview() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<StatsState | null>(null)
  const [period, setPeriod] = useState<Period>('weekly')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError('')
        const res = await appointmentService.getDashboardStats()
        if (!cancelled) setStats(res.stats)
      } catch (e: unknown) {
        if (!cancelled) {
          setError((e as { message?: string })?.message || 'Failed to load dashboard')
          setStats(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const appointmentSeries = useMemo(() => {
    if (!stats) return []
    return period === 'weekly' ? stats.appointmentsWeekly ?? [] : stats.appointmentsMonthly ?? []
  }, [stats, period])

  const registrationSeries = useMemo(() => {
    if (!stats) return []
    return period === 'weekly' ? stats.registrationsWeekly ?? [] : stats.registrationsMonthly ?? []
  }, [stats, period])

  if (loading) {
    return <div className="dashboard-overview-loading">Loading dashboard…</div>
  }

  if (error || !stats) {
    return <div className="dashboard-overview-error">{error || 'No data available.'}</div>
  }

  const totalUsers = stats.totalRegisteredUsers ?? stats.totalPatients + stats.totalDoctors
  const periodLabel = period === 'weekly' ? 'Last 8 weeks' : 'Last 6 months'

  return (
    <div className="dashboard-overview">
      <div>
        <h1 className="dashboard-overview-title">Overview</h1>
        <p className="dashboard-overview-subtitle">
          Patients, doctors, appointments, and recent activity across Nexus Medwell.
        </p>
      </div>

      <div className="dashboard-stats-cards">
        <div className="dashboard-stat-card dashboard-stat-card-patients">
          <div className="dashboard-stat-icon">
            <IconUsers />
          </div>
          <div className="dashboard-stat-content">
            <span className="dashboard-stat-value">{stats.totalPatients}</span>
            <span className="dashboard-stat-label">Patients</span>
          </div>
        </div>
        <div className="dashboard-stat-card dashboard-stat-card-doctors">
          <div className="dashboard-stat-icon">
            <IconStethoscope />
          </div>
          <div className="dashboard-stat-content">
            <span className="dashboard-stat-value">{stats.totalDoctors}</span>
            <span className="dashboard-stat-label">Doctors</span>
          </div>
        </div>
        <div className="dashboard-stat-card dashboard-stat-card-users">
          <div className="dashboard-stat-icon">
            <IconUserPlus />
          </div>
          <div className="dashboard-stat-content">
            <span className="dashboard-stat-value">{totalUsers}</span>
            <span className="dashboard-stat-label">Portal users (patients + doctors)</span>
          </div>
        </div>
        <div className="dashboard-stat-card dashboard-stat-card-appointments">
          <div className="dashboard-stat-icon">
            <IconCalendar />
          </div>
          <div className="dashboard-stat-content">
            <span className="dashboard-stat-value">{stats.totalAppointments}</span>
            <span className="dashboard-stat-label">Appointments (all time)</span>
          </div>
        </div>
      </div>

      <section className="dashboard-chart-section">
        <div className="dashboard-chart-header">
          <div>
            <h2 className="dashboard-chart-title">Trends</h2>
            <p className="dashboard-chart-subtitle">
              Appointment volume and new patient and doctor sign-ups.
            </p>
          </div>
          <div className="dashboard-chart-toggle" role="group" aria-label="Chart period">
            <button
              type="button"
              className={period === 'weekly' ? 'active' : ''}
              onClick={() => setPeriod('weekly')}
            >
              Weekly
            </button>
            <button
              type="button"
              className={period === 'monthly' ? 'active' : ''}
              onClick={() => setPeriod('monthly')}
            >
              Monthly
            </button>
          </div>
        </div>

        <div className="dashboard-charts-grid">
          <SimpleBarBlock
            title="Appointments"
            description={`${periodLabel} — bookings by ${period === 'weekly' ? 'week' : 'month'}.`}
            data={appointmentSeries}
            barColor="#2C5F7C"
            emptyMessage="No appointment data in this range."
          />
          <SimpleBarBlock
            title="New registrations"
            description={`${periodLabel} — new patient and doctor accounts.`}
            data={registrationSeries}
            barColor="#1a7a6c"
            emptyMessage="No registration data in this range."
            panelIcon={<IconUserPlus />}
          />
        </div>
      </section>
    </div>
  )
}
