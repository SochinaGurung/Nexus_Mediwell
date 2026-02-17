import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const userSchema = new Schema({
    // Authentication fields
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    role: {
        type: String,
        enum: ["patient", "doctor", "admin"],
        default: "patient"
    },
    
    // Common profile fields (for all roles)
    firstName: {
        type: String,
        trim: true
    },
    lastName: {
        type: String,
        trim: true
    },
    phoneNumber: {
        type: String,
        trim: true
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: {
            type: String,
            default: "Nepal"
        }
    },
    dateOfBirth: {
        type: Date
    },
    gender: {
        type: String,
        enum: ["male", "female", "other", "prefer not to say"]
    },
    profilePicture: {
        type: String, 
        default: null
    },
    
    // Patient-specific fields
    emergencyContact: {
        name: String,
        relationship: String,
        phoneNumber: String,
        email: String
    },
    bloodGroup: {
        type: String,
        enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    },
    medicalHistory: [{
        condition: String,
        diagnosisDate: Date,
        notes: String
    }],
    allergies: [{
        type: String
    }],
    insuranceInfo: {
        provider: String,
        policyNumber: String,
        groupNumber: String,
        expiryDate: Date
    },
    
    // Doctor-specific fields
    specialization: {
        type: String,
        trim: true
    },
    licenseNumber: {
        type: String,
        unique: true,
        sparse: true // Allows multiple null values
    },
    department: {
        type: String,
        trim: true
    },
    qualifications: [{
        degree: String,
        institution: String,
        year: Number
    }],
    yearsOfExperience: {
        type: Number,
        default: 0
    },
    consultationFee: {
        type: Number,
        default: 0,
        required: function () {
            return this.role === 'doctor';
        }
    },
    availability: {
        monday: { available: { type: Boolean, default: false }, startTime: String, endTime: String },
        tuesday: { available: { type: Boolean, default: false }, startTime: String, endTime: String },
        wednesday: { available: { type: Boolean, default: false }, startTime: String, endTime: String },
        thursday: { available: { type: Boolean, default: false }, startTime: String, endTime: String },
        friday: { available: { type: Boolean, default: false }, startTime: String, endTime: String },
        saturday: { available: { type: Boolean, default: false }, startTime: String, endTime: String },
        sunday: { available: { type: Boolean, default: false }, startTime: String, endTime: String }
    },
    bio: {
        type: String,
        maxlength: 500
    },
    
    // Admin-specific fields
    position: {
        type: String,
        trim: true
    },
    
    // Email verification fields
    resetToken: {
        type: String,
        default: null
    },
    resetTokenExpiry: {
        type: Date,
        default: null
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: {
        type: String,
        default: null
    },
    emailVerificationTokenExpiry: {
        type: Date,
        default: null
    },
    
    // Account status
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update 
userSchema.pre('save', function() {
    this.updatedAt = Date.now();
});

const User = model('User', userSchema);

export default User;

