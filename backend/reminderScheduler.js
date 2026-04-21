import Reminder from './models/reminder.model.js'
import ReminderNotification from './models/reminderNotification.model.js'

function padSlot(hourMinute) {
  const m = String(hourMinute).trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return hourMinute;
  const h = Math.max(0, Math.min(23, parseInt(m[1], 10)));
  const mm = Math.max(0, Math.min(59, parseInt(m[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function getHHmmForTimeZone(date, timeZone) {
  try {
    const dtf = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    const parts = dtf.formatToParts(date)
    let hour = ''
    let minute = ''
    for (const p of parts) {
      if (p.type === 'hour') hour = p.value
      if (p.type === 'minute') minute = p.value
    }
    return `${hour}:${minute}`
  } catch {
    // Fallback if timezone is invalid/missing
    const hh = String(date.getUTCHours()).padStart(2, '0')
    const mm = String(date.getUTCMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }
}

function roundToMinute(d) {
  const x = new Date(d)
  x.setSeconds(0, 0)
  return x
}

function buildNotification(reminder, scheduledFor) {
  const name = (reminder.medicineName || 'your medicine').trim()
  const title = 'Did you take this medicine?'
  const instructions = reminder.instructions?.trim()
  const dosage = reminder.dosage?.trim()
  const lines = [
    name && name !== 'your medicine' ? `Medicine: ${name}` : null,
    dosage ? `Dosage: ${dosage}` : null,
    instructions || null
  ].filter(Boolean)
  const message = lines.length ? lines.join('\n') : 'Remember to take your medicine as prescribed.'
  return { title, message, scheduledFor }
}

let isRunning = false

export async function processReminderTick(now = new Date()) {
  if (isRunning) return
  isRunning = true

  try {
    const nowRounded = roundToMinute(now)

    const reminders = await Reminder.find({
      isActive: true,
      fromDate: { $lte: nowRounded },
      toDate: { $gte: nowRounded }
    }).lean()

    if (!reminders.length) return

    const scheduledFor = nowRounded // rounded to the minute so the unique index prevents duplicates
    const notificationsCreatedByReminderId = []

    // Create notifications for all reminders that match HH:mm in their configured timezone
    for (const reminder of reminders) {
      const timeInTz = padSlot(getHHmmForTimeZone(nowRounded, reminder.timezone || 'UTC'))
      const patientSlots = (reminder.times || []).map((x) => padSlot(x))
      if (!patientSlots.includes(timeInTz)) continue

      const { title, message } = buildNotification(reminder, scheduledFor)

      try {
        await ReminderNotification.create({
          reminder: reminder._id,
          patient: reminder.patient,
          scheduledFor,
          title,
          message,
          channel: 'in_app',
          status: 'sent'
        })
        notificationsCreatedByReminderId.push(reminder._id)
      } catch (err) {
        // Duplicate key means the notification was already created for this minute
        if (err?.code === 11000) continue
        console.error('ReminderNotification create error:', err)
      }
    }

    if (notificationsCreatedByReminderId.length) {
      await Reminder.updateMany(
        { _id: { $in: notificationsCreatedByReminderId } },
        { $max: { lastTriggeredAt: scheduledFor } }
      )
    }
  } finally {
    isRunning = false
  }
}

function scheduleNextAlignedMinute() {
  const mod = Date.now() % 60_000
  // On minute boundary (mod === 0), fire immediately; otherwise wait until next boundary.
  const delay = mod === 0 ? 0 : 60_000 - mod
  setTimeout(() => {
    processReminderTick().catch((e) => console.error('Reminder scheduler tick error:', e))
    scheduleNextAlignedMinute()
  }, delay)
}

export function startReminderScheduler() {
  // Fire on each wall-clock minute (UTC on server) so reminder slots match patient local HH:mm.
  processReminderTick().catch((e) => console.error('Reminder scheduler initial tick error:', e))
  scheduleNextAlignedMinute()
}

