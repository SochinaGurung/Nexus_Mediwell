import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const userSchema= new Schema({
    username:{
        type: String,
        required:true,
        unique:true,
    },
    password: String,
    email:{
        type: String,
        required: true,
        unique: true, 
    },
    role: {
        type: String, 
        enum: ["patient", "doctor", "admin"],
        default: "patient"
    },
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
    }
});
const User=model('User', userSchema);

export default User;

