import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const reminderNotificationSchema = new Schema(
  {
    reminder: {
      type: Schema.Types.ObjectId,
      ref: 'Reminder',
      required: true,
      index: true
    },
    patient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    scheduledFor: {
      type: Date,
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    channel: {
      type: String,
      enum: ['in_app'],
      default: 'in_app'
    },
    status: {
      type: String,
      enum: ['sent', 'failed'],
      default: 'sent'
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    errorMessage: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

reminderNotificationSchema.index(
  { reminder: 1, scheduledFor: 1, channel: 1 },
  { unique: true }
);

const ReminderNotification = model('ReminderNotification', reminderNotificationSchema);
export default ReminderNotification;
