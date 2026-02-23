import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const departmentSchema = new Schema(
  {
    departmentName: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    description: {
      type: String,
      required: true,
      trim: true
    },

    departmentCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true
    },

    location: {
      floor: { type: String, required: true },
      room: { type: String }
    },

    headOfDepartment: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    image: {
      type: String,
      default: null
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Indexes
departmentSchema.index({ departmentName: 1 });
departmentSchema.index({ isActive: 1 });
departmentSchema.index({ headOfDepartment: 1 });

const Department = model('Department', departmentSchema);
export default Department;
