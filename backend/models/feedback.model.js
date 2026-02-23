import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const feedbackSchema = new Schema({
    // User  information
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    phoneNumber: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null 
    },
    
    // Status tracking
    status: {
        type: String,
        enum: ['new', 'read', 'replied', 'archived'],
        default: 'new'
    },
    
    adminResponse: {
        type: String,
        default: null
    },
    respondedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    respondedAt: {
        type: Date,
        default: null
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

feedbackSchema.pre('save', function() {
    this.updatedAt = Date.now();
});

const Feedback = model('Feedback', feedbackSchema);

export default Feedback;
