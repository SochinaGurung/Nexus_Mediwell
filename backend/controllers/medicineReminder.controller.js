import MedicineSuggestion from '../models/medicine.model.js';
import Reminder from '../models/reminder.model.js';
import ReminderNotification from '../models/reminderNotification.model.js';
import User from '../models/user.model.js';

const hhmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

function padHHMM(t) {
  const m = String(t).trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return String(t).trim();
  let h = parseInt(m[1], 10);
  let mm = parseInt(m[2], 10);
  if (Number.isNaN(h) || Number.isNaN(mm)) return String(t).trim();
  h = Math.max(0, Math.min(23, h));
  mm = Math.max(0, Math.min(59, mm));
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function normalizeTimes(times) {
  if (!Array.isArray(times)) return [];
  const cleaned = times
    .map((t) => (typeof t === 'string' ? padHHMM(t) : ''))
    .filter((t) => t.length > 0 && hhmmRegex.test(t));
  return [...new Set(cleaned)];
}

function isValidDate(value) {
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

function addDays(baseDate, days) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return d;
}

export async function createMedicineSuggestion(req, res) {
  try {
    const doctorId = req.user?.userId;
    const { patientId } = req.params;
    const {
      medicineName,
      dosage,
      instructions,
      timesPerDay = 1,
      mealTiming = 'anytime',
      durationDays,
      suggestedFromDate,
      suggestedToDate,
      suggestedTimes = [],
      appointmentId = null
    } = req.body;

    if (!doctorId) return res.status(401).json({ message: 'Authentication required' });
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    if (!medicineName || !medicineName.trim()) {
      return res.status(400).json({ message: 'medicineName is required' });
    }
    // Default 30 days when omitted (doctor UI only sends name + instructions)
    const duration = Math.max(1, Math.min(365, Number(durationDays) || 30));
    const from = isValidDate(suggestedFromDate) ? new Date(suggestedFromDate) : new Date();
    const to = isValidDate(suggestedToDate) ? new Date(suggestedToDate) : addDays(from, duration - 1);
    if (to < from) return res.status(400).json({ message: 'suggestedToDate must be >= suggestedFromDate' });

    const times = normalizeTimes(suggestedTimes);
    if (times.some((t) => !hhmmRegex.test(t))) {
      return res.status(400).json({ message: 'suggestedTimes must use HH:mm format' });
    }

    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const suggestion = await MedicineSuggestion.create({
      doctor: doctorId,
      patient: patientId,
      appointment: appointmentId || null,
      medicineName: medicineName.trim(),
      dosage: dosage || '',
      instructions: instructions || '',
      timesPerDay: Math.max(1, Math.min(12, Number(timesPerDay) || 1)),
      mealTiming: ['before_meal', 'after_meal', 'with_meal', 'anytime'].includes(mealTiming) ? mealTiming : 'anytime',
      durationDays: duration,
      suggestedFromDate: from,
      suggestedToDate: to,
      suggestedTimes: times
    });

    const populated = await MedicineSuggestion.findById(suggestion._id)
      .populate('doctor', 'username firstName lastName')
      .populate('patient', 'username firstName lastName');

    return res.status(201).json({
      message: 'Medicine suggestion created successfully',
      suggestion: populated
    });
  } catch (err) {
    console.error('createMedicineSuggestion error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

export async function getDoctorMedicineSuggestions(req, res) {
  try {
    const doctorId = req.user?.userId;
    const suggestions = await MedicineSuggestion.find({ doctor: doctorId })
      .populate('patient', 'username firstName lastName')
      .sort({ createdAt: -1 });
    return res.status(200).json({ message: 'Suggestions retrieved', suggestions });
  } catch (err) {
    console.error('getDoctorMedicineSuggestions error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

export async function getPatientMedicineSuggestions(req, res) {
  try {
    const patientId = req.user?.userId;
    const suggestions = await MedicineSuggestion.find({ patient: patientId })
      .populate('doctor', 'username firstName lastName specialization department')
      .sort({ createdAt: -1 });
    return res.status(200).json({ message: 'Suggestions retrieved', suggestions });
  } catch (err) {
    console.error('getPatientMedicineSuggestions error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

export async function respondToMedicineSuggestion(req, res) {
  try {
    const patientId = req.user?.userId;
    const { suggestionId } = req.params;
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "status must be 'accepted' or 'rejected'" });
    }

    const suggestion = await MedicineSuggestion.findById(suggestionId);
    if (!suggestion) return res.status(404).json({ message: 'Suggestion not found' });
    if (String(suggestion.patient) !== String(patientId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    suggestion.status = status;
    await suggestion.save();

    return res.status(200).json({ message: 'Suggestion updated', suggestion });
  } catch (err) {
    console.error('respondToMedicineSuggestion error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

export async function createReminder(req, res) {
  try {
    const patientId = req.user?.userId;
    const {
      suggestionId,
      fromDate,
      toDate,
      times = [],
      timezone = 'UTC',
      medicineName: bodyMedicineName,
      instructions: bodyInstructions
    } = req.body;

    if (!isValidDate(fromDate)) {
      return res.status(400).json({ message: 'Valid fromDate is required' });
    }

    const normalized = normalizeTimes(times);
    if (!normalized.length) return res.status(400).json({ message: 'At least one time is required' });
    if (normalized.some((t) => !hhmmRegex.test(t))) {
      return res.status(400).json({ message: 'times must use HH:mm format' });
    }

    const start = new Date(fromDate);

    // Patient self-service reminder (no doctor suggestion)
    if (!suggestionId) {
      if (!bodyMedicineName || !String(bodyMedicineName).trim()) {
        return res.status(400).json({ message: 'medicineName is required' });
      }
      if (!isValidDate(toDate)) {
        return res.status(400).json({ message: 'Valid toDate is required' });
      }
      const end = new Date(toDate);
      if (end < start) return res.status(400).json({ message: 'toDate must be >= fromDate' });

      const reminder = await Reminder.create({
        suggestion: null,
        doctor: null,
        patient: patientId,
        medicineName: String(bodyMedicineName).trim(),
        dosage: '',
        instructions: bodyInstructions != null ? String(bodyInstructions).trim() : '',
        fromDate: start,
        toDate: end,
        times: normalized,
        timezone,
        isActive: true
      });

      return res.status(201).json({ message: 'Reminder created successfully', reminder });
    }

    const suggestion = await MedicineSuggestion.findById(suggestionId);
    if (!suggestion) return res.status(404).json({ message: 'Suggestion not found' });
    if (String(suggestion.patient) !== String(patientId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (!['suggested', 'accepted'].includes(suggestion.status)) {
      return res.status(400).json({ message: 'Suggestion is not active for reminder creation' });
    }

    const end = isValidDate(toDate)
      ? new Date(toDate)
      : addDays(start, Math.max(1, Number(suggestion.durationDays || 30)) - 1);
    if (end < start) return res.status(400).json({ message: 'toDate must be >= fromDate' });

    suggestion.status = 'accepted';
    await suggestion.save();

    const reminder = await Reminder.create({
      suggestion: suggestion._id,
      doctor: suggestion.doctor,
      patient: suggestion.patient,
      medicineName: suggestion.medicineName,
      dosage: suggestion.dosage || '',
      instructions: suggestion.instructions || '',
      fromDate: start,
      toDate: end,
      times: normalized,
      timezone,
      isActive: true
    });

    return res.status(201).json({ message: 'Reminder created successfully', reminder });
  } catch (err) {
    console.error('createReminder error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

export async function getMyReminders(req, res) {
  try {
    const patientId = req.user?.userId;
    const reminders = await Reminder.find({ patient: patientId })
      .populate('doctor', 'username firstName lastName')
      .populate('suggestion')
      .sort({ createdAt: -1 });
    return res.status(200).json({ message: 'Reminders retrieved', reminders });
  } catch (err) {
    console.error('getMyReminders error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

export async function updateReminder(req, res) {
  try {
    const patientId = req.user?.userId;
    const { reminderId } = req.params;
    const { fromDate, toDate, times, timezone, isActive } = req.body;

    const reminder = await Reminder.findById(reminderId);
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    if (String(reminder.patient) !== String(patientId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (fromDate !== undefined) {
      if (!isValidDate(fromDate)) return res.status(400).json({ message: 'Invalid fromDate' });
      reminder.fromDate = new Date(fromDate);
    }
    if (toDate !== undefined) {
      if (!isValidDate(toDate)) return res.status(400).json({ message: 'Invalid toDate' });
      reminder.toDate = new Date(toDate);
    }
    if (reminder.toDate < reminder.fromDate) {
      return res.status(400).json({ message: 'toDate must be >= fromDate' });
    }
    if (times !== undefined) {
      const normalized = normalizeTimes(times);
      if (!normalized.length) return res.status(400).json({ message: 'At least one time is required' });
      if (normalized.some((t) => !hhmmRegex.test(t))) {
        return res.status(400).json({ message: 'times must use HH:mm format' });
      }
      reminder.times = normalized;
    }
    if (timezone !== undefined) reminder.timezone = timezone;
    if (isActive !== undefined) reminder.isActive = Boolean(isActive);

    await reminder.save();
    return res.status(200).json({ message: 'Reminder updated', reminder });
  } catch (err) {
    console.error('updateReminder error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

export async function deleteReminder(req, res) {
  try {
    const patientId = req.user?.userId;
    const { reminderId } = req.params;
    const reminder = await Reminder.findById(reminderId);
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    if (String(reminder.patient) !== String(patientId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await ReminderNotification.deleteMany({ reminder: reminderId });
    await Reminder.findByIdAndDelete(reminderId);
    return res.status(200).json({ message: 'Reminder deleted successfully' });
  } catch (err) {
    console.error('deleteReminder error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

export async function getMyReminderNotifications(req, res) {
  try {
    const patientId = req.user?.userId;
    const notifications = await ReminderNotification.find({ patient: patientId })
      .populate('reminder', 'medicineName dosage instructions times')
      .sort({ scheduledFor: -1, createdAt: -1 })
      .limit(200);
    return res.status(200).json({ message: 'Notifications retrieved', notifications });
  } catch (err) {
    console.error('getMyReminderNotifications error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

export async function markReminderNotificationRead(req, res) {
  try {
    const patientId = req.user?.userId;
    const { notificationId } = req.params;
    const notification = await ReminderNotification.findById(notificationId);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    if (String(notification.patient) !== String(patientId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    notification.isRead = true;
    await notification.save();
    return res.status(200).json({ message: 'Notification marked as read', notification });
  } catch (err) {
    console.error('markReminderNotificationRead error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}
