import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const hhmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const medicineSuggestionSchema = new Schema(
  {
    doctor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    patient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    appointment: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null
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
    suggestedFromDate: {
      type: Date,
      required: true
    },
    suggestedToDate: {
      type: Date,
      required: true
    },
    suggestedTimes: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.every((t) => hhmmRegex.test(t)),
        message: 'All times must use HH:mm format'
      }
    },
    status: {
      type: String,
      enum: ['suggested', 'accepted', 'rejected', 'cancelled'],
      default: 'suggested',
      index: true
    }
  },
  { timestamps: true }
);

medicineSuggestionSchema.path('suggestedToDate').validate(function validateDateRange(v) {
  return !this.suggestedFromDate || !v || v >= this.suggestedFromDate;
}, 'suggestedToDate must be greater than or equal to suggestedFromDate');

medicineSuggestionSchema.index({ doctor: 1, patient: 1, createdAt: -1 });

const MedicineSuggestion = model('MedicineSuggestion', medicineSuggestionSchema);
export default MedicineSuggestion;
