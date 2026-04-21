import Appointment from './models/appointment.model.js'
import { sendAppointmentDayBeforeReminderEmail } from './utils/emailService.js'

function utcStartOfCalendarDay(d) {
  const x = new Date(d)
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()))
}


export function isAppointmentDateTomorrowUtc(appointmentDate, now = new Date()) {
  const aptDay = utcStartOfCalendarDay(appointmentDate).getTime()
  const todayStart = utcStartOfCalendarDay(now).getTime()
  const tomorrowStart = todayStart + 24 * 60 * 60 * 1000
  return aptDay === tomorrowStart
}

function getTomorrowUtcBounds(now = new Date()) {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const d = now.getUTCDate()
  const start = new Date(Date.UTC(y, m, d + 1))
  const end = new Date(Date.UTC(y, m, d + 2))
  return { start, end }
}

function msUntilNextUtcHour(hourUtc) {
  const now = new Date()
  let next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourUtc, 0, 0, 0))
  if (next <= now) {
    next = new Date(next.getTime() + 24 * 60 * 60 * 1000)
  }
  return next.getTime() - now.getTime()
}

async function sendOneDayBeforeReminder(appointment) {
  const patient = appointment.patient
  const doctor = appointment.doctor
  if (!patient?.email) return { success: false, error: 'No patient email' }

  const patientName =
    `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.username
  const doctorName = `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || doctor.username

  const appointmentDateStr = appointment.appointmentDate.toISOString().split('T')[0]
  const result = await sendAppointmentDayBeforeReminderEmail(patient.email, {
    patientName,
    doctorName,
    appointmentDate: appointmentDateStr,
    appointmentTime: appointment.appointmentTime,
    reason: appointment.reason || ''
  })

  if (result.success) {
    await Appointment.updateOne(
      { _id: appointment._id },
      { dayBeforeReminderSentAt: new Date() }
    )
  }
  return result
}

export async function processAppointmentDayBeforeReminders(now = new Date()) {
  const { start, end } = getTomorrowUtcBounds(now)
  const appointments = await Appointment.find({
    appointmentDate: { $gte: start, $lt: end },
    status: { $in: ['pending', 'confirmed'] },
    dayBeforeReminderSentAt: null
  })
    .populate('patient', 'username email firstName lastName')
    .populate('doctor', 'username email firstName lastName')

  for (const apt of appointments) {
    try {
      const r = await sendOneDayBeforeReminder(apt)
      if (!r.success) {
        console.error(
          `Day-before reminder failed for appointment ${apt._id}:`,
          r.error || 'unknown'
        )
      }
    } catch (e) {
      console.error(`Day-before reminder error for appointment ${apt._id}:`, e.message)
    }
  }
}


export async function maybeSendDayBeforeReminderImmediately(appointmentId) {
  const appointment = await Appointment.findById(appointmentId)
    .populate('patient', 'username email firstName lastName')
    .populate('doctor', 'username email firstName lastName')

  if (!appointment) return
  if (!['pending', 'confirmed'].includes(appointment.status)) return
  if (appointment.dayBeforeReminderSentAt) return
  if (!isAppointmentDateTomorrowUtc(appointment.appointmentDate)) return

  try {
    const r = await sendOneDayBeforeReminder(appointment)
    if (!r.success) {
      console.error(
        `Immediate day-before reminder failed for appointment ${appointmentId}:`,
        r.error
      )
    }
  } catch (e) {
    console.error(`Immediate day-before reminder error for appointment ${appointmentId}:`, e.message)
  }
}

export function startAppointmentDayBeforeReminderScheduler() {
  const hourUtc = parseInt(process.env.APPOINTMENT_REMINDER_EMAIL_HOUR_UTC || '8', 10)
  const safeHour = Number.isFinite(hourUtc) ? Math.min(23, Math.max(0, hourUtc)) : 8

  function scheduleNext() {
    const delay = msUntilNextUtcHour(safeHour)
    setTimeout(async () => {
      await processAppointmentDayBeforeReminders().catch((e) =>
        console.error('Appointment day-before reminder job error:', e)
      )
      scheduleNext()
    }, delay)
  }

  const firstDelay = msUntilNextUtcHour(safeHour)
  console.log(
    `Appointment day-before email scheduler: next run in ${Math.round(firstDelay / 60000)} min (UTC hour ${safeHour})`
  )
  scheduleNext()
}
