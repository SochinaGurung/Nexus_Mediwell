import type { ReminderNotificationItem } from '../services/medicineReminderService'

export function getMedicineReminderDisplayLabel(n: ReminderNotificationItem): string {
  const r = n.reminder
  if (r && typeof r === 'object' && 'medicineName' in r && r.medicineName) {
    return r.medicineName
  }
  const t = n.title || ''
  if (/did you take this medicine/i.test(t)) {
    const firstLine = (n.message || '').split('\n')[0] || ''
    const m = firstLine.match(/^Medicine:\s*(.+)$/i)
    if (m) return m[1].trim()
  }
  return t.replace(/^Time to take\s+/i, '').trim() || 'your medicine'
}
