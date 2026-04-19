import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const hhmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const reminderSchema = new Schema(
  {
    suggestion: {
      type: Schema.Types.ObjectId,
      ref: 'MedicineSuggestion',
      default: null,
      index: true
    },
    doctor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    patient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    medicineName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    dosage: {
      type: String,
      trim: true,
      default: ''
    },
    instructions: {
      type: String,
      trim: true,
      default: ''
    },
    fromDate: {
      type: Date,
      required: true,
      index: true
    },
    toDate: {
      type: Date,
      required: true,
      index: true
    },
    times: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) =>
          Array.isArray(arr) &&
          arr.length > 0 &&
          arr.every((t) => hhmmRegex.test(t)),
        message: 'At least one HH:mm time is required'
      }
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    lastTriggeredAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

reminderSchema.path('toDate').validate(function validateDateRange(v) {
  return !this.fromDate || !v || v >= this.fromDate;
}, 'toDate must be greater than or equal to fromDate');

reminderSchema.index({ patient: 1, isActive: 1, fromDate: 1, toDate: 1 });

const Reminder = model('Reminder', reminderSchema);
export default Reminder;
