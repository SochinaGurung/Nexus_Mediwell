import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/user.model.js";
import Appointment from "../models/appointment.model.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../utils/emailService.js";

//  REGISTER FUNCTION
export async function register(req, res) {
    try {
        const { username, password, email, role } = req.body;

        const userRole = role || "patient";

        // Validate role
        const allowedRoles = ["patient", "doctor", "admin"];
        if (!allowedRoles.includes(userRole)) {
            return res.status(400).json({ message: "Invalid role. Allowed roles: patient, doctor, admin" });
        }
        
        // Checks if trying to register as doctor or admin
        if (userRole === "doctor" || userRole === "admin") {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return res.status(401).json({ 
                    message: "Authentication required. Only admin can register doctor/admin accounts. Please provide a valid admin token." 
                });
            }
            
            const token = authHeader.split(" ")[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                if (decoded.role !== "admin") {
                    return res.status(403).json({ 
                        message: "Only admin can register doctor/admin accounts." 
                    });
                }
                
            } catch (err) {
                return res.status(401).json({ 
                    message: "Invalid or expired token. Please provide a valid admin token." 
                });
            }
        }
        
        const existing = await User.findOne({ username });
        if (existing) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);

        // For email verification token
        const emailVerificationToken = crypto.randomBytes(32).toString("hex");
        const emailVerificationTokenExpiry = Date.now() + 86400000; // 24 hours from now

        const user = new User({ 
            username, 
            email, 
            password: hashedPassword, 
            role: userRole,
            emailVerificationToken,
            emailVerificationTokenExpiry,
            isEmailVerified: false
        });
        await user.save();

        // Send verification email
        console.log(`Sending verification email to: ${email}`);
        const emailResult = await sendVerificationEmail(email, emailVerificationToken, username);
        
        if (!emailResult.success) {
            console.error("Failed to send verification email:");
            console.error("Error:", emailResult.error);
            console.error("Details:", emailResult.details);
            console.error("User registered but email verification failed!");
            console.error("User will need to use /api/auth/resend-verification endpoint");
        } else {
            console.log("Verification email sent successfully!");
        }

        res.status(201).json({
            message: emailResult.success 
                ? 'User registered successfully. Please check your email to verify your account.'
                : 'User registered successfully, but email verification failed. Please use the resend verification endpoint.',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            emailSent: emailResult.success,
            ...(emailResult.success ? {} : { emailError: emailResult.error })
        });

    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

//  LOGIN FUNCTION
export async function login(req, res) {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: "Please provide username and password" });
        }
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        //Comparing password with the hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect password' });
        }

        // Creating JWT token 
        const token = jwt.sign(
            { userId: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );
        res.status(200).json({
            message: 'Login successful',
            token: token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        console.log("Login error:", err)
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

//  LOGOUT FUNCTION
export async function logout(req, res) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ 
                message: "No token provided. You are already logged out." 
            });
        }

        const token = authHeader.split(" ")[1];
        
        try {
            // Verify token to ensure it's valid
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Get user info
            const user = await User.findById(decoded.userId);
        if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.status(200).json({
                message: 'Logout successful',
                user: {
                    id: user._id,
                    username: user.username
                }
            });
        } catch (err) {
            // Token is invalid or expired - user is effectively logged out
            return res.status(200).json({ 
                message: 'Logout successful. Token was already invalid.' 
            });
        }

    } catch (err) {
        console.log("Logout error:", err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// UPDATE PROFILE FUNCTION
export async function updateProfile(req, res) {
    try {
        // Verify user is logged in
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ 
                message: "Authentication required. Please login to update your profile." 
            });
        }

        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ 
                message: "Invalid or expired token. Please login again." 
            });
        }

        // for users so they can only update their own profile unless admin
        const userId = req.params.userId || decoded.userId;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if user is updating their own profile or is an admin
        // Convert both to strings for comparison
        if (userId.toString() !== decoded.userId.toString() && decoded.role !== "admin") {
            return res.status(403).json({ 
                message: "You can only update your own profile" 
            });
        }

        const {
            // Common fields
            firstName,
            lastName,
            phoneNumber,
            address,
            dateOfBirth,
            gender,
            profilePicture,
            // For patients
            emergencyContact,
            bloodGroup,
            allergies,
            insuranceInfo,
            medicalHistory,
            // For doctors
            specialization,
            licenseNumber,
            department,
            qualifications,
            yearsOfExperience,
            consultationFee,
            availability,
            bio,
            // For Admin
            position,
            // for updating update
            currentPassword,
            newPassword
        } = req.body;

        // Build update object
        const updateData = {};
        
        // for update 
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
        if (address !== undefined) updateData.address = address;
        if (dateOfBirth !== undefined) updateData.dateOfBirth = new Date(dateOfBirth);
        if (gender !== undefined) {
            const validGenders = ["male", "female", "other", "prefer not to say"];
            if (validGenders.includes(gender)) {
                updateData.gender = gender;
            }
        }
        if (profilePicture !== undefined) updateData.profilePicture = profilePicture;

        // Update role-specific fields
        if (user.role === "patient") {
            if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;
            if (bloodGroup !== undefined) {
                const validBloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
                if (validBloodGroups.includes(bloodGroup)) {
                    updateData.bloodGroup = bloodGroup;
                }
            }
            if (allergies !== undefined) {
                updateData.allergies = Array.isArray(allergies) ? allergies : [allergies];
            }
            if (insuranceInfo !== undefined) updateData.insuranceInfo = insuranceInfo;
            if (medicalHistory !== undefined) {
                updateData.medicalHistory = Array.isArray(medicalHistory) ? medicalHistory : [medicalHistory];
            }
        }

        if (user.role === "doctor") {
            if (specialization !== undefined) updateData.specialization = specialization;
            if (licenseNumber !== undefined) {
                // Checking if license number already exists (for another doctor)
                const existingLicense = await User.findOne({ 
                    licenseNumber, 
                    _id: { $ne: userId } 
                });
                if (existingLicense) {
                    return res.status(400).json({ message: "License number already exists" });
                }
                updateData.licenseNumber = licenseNumber;
            }
            if (department !== undefined) updateData.department = department;
            if (qualifications !== undefined) {
                updateData.qualifications = Array.isArray(qualifications) ? qualifications : [qualifications];
            }
            if (yearsOfExperience !== undefined) updateData.yearsOfExperience = yearsOfExperience;
            if (consultationFee !== undefined) updateData.consultationFee = consultationFee;
            if (availability !== undefined) updateData.availability = availability;
            if (bio !== undefined) {
                if (bio.length > 500) {
                    return res.status(400).json({ message: "Bio must be 500 characters or less" });
                }
                updateData.bio = bio;
            }
        }

        if (user.role === "admin") {
            if (position !== undefined) updateData.position = position;
        }

        // Handle password update
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ 
                    message: "Current password is required to change password" 
                });
            }

            // Verify current password
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: "Current password is incorrect" });
            }

            // Validate new password
            if (newPassword.length < 6) {
                return res.status(400).json({ 
                    message: "New password must be at least 6 characters long" 
                });
            }

            // Hash and update password
            updateData.password = await bcrypt.hash(newPassword, 10);
        }

        // Update the user using findByIdAndUpdate for reliable updates
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        );
        
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found after update' });
        }

        // Prepare response (exclude sensitive data) - use updatedUser to ensure latest data
        const userResponse = {
            id: updatedUser._id,
            username: updatedUser.username,
            email: updatedUser.email,
            role: updatedUser.role,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            phoneNumber: updatedUser.phoneNumber,
            address: updatedUser.address,
            dateOfBirth: updatedUser.dateOfBirth,
            gender: updatedUser.gender,
            profilePicture: updatedUser.profilePicture,
            ...(updatedUser.role === "patient" && {
                bloodGroup: updatedUser.bloodGroup,
                emergencyContact: updatedUser.emergencyContact,
                allergies: updatedUser.allergies,
                insuranceInfo: updatedUser.insuranceInfo
            }),
            ...(updatedUser.role === "doctor" && {
                specialization: updatedUser.specialization,
                department: updatedUser.department,
                licenseNumber: updatedUser.licenseNumber,
                consultationFee: updatedUser.consultationFee,
                bio: updatedUser.bio
            }),
            ...(updatedUser.role === "admin" && {
                position: updatedUser.position
            }),
            updatedAt: updatedUser.updatedAt
        };
        
        res.status(200).json({
            message: 'Profile updated successfully',
            user: userResponse
        });

    } catch (err) {
        console.log("Update profile error:", err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// GET PROFILE FUNCTION
export async function getProfile(req, res) {
    try {
        // Verify user is logged in
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ 
                message: "Authentication required. Please login to view your profile." 
            });
        }

        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ 
                message: "Invalid or expired token. Please login again." 
            });
        }

        // Get user ID from params or token
        const userId = req.params.userId || decoded.userId;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if user is viewing their own profile or is an admin
        if (userId.toString() !== decoded.userId.toString() && decoded.role !== "admin") {
            return res.status(403).json({ 
                message: "You can only view your own profile" 
            });
        }

        const userResponse = {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            address: user.address,
            dateOfBirth: user.dateOfBirth,
            gender: user.gender,
            profilePicture: user.profilePicture,
            ...(user.role === "patient" && {
                bloodGroup: user.bloodGroup,
                emergencyContact: user.emergencyContact,
                allergies: user.allergies,
                insuranceInfo: user.insuranceInfo,
                medicalHistory: user.medicalHistory
            }),
            ...(user.role === "doctor" && {
                specialization: user.specialization,
                department: user.department,
                licenseNumber: user.licenseNumber,
                qualifications: user.qualifications,
                yearsOfExperience: user.yearsOfExperience,
                consultationFee: user.consultationFee,
                availability: user.availability,
                bio: user.bio
            }),
            ...(user.role === "admin" && {
                position: user.position
            }),
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };

        res.status(200).json({
            message: 'Profile retrieved successfully',
            user: userResponse
        });

    } catch (err) {
        console.log("Get profile error:", err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// VERIFY EMAIL FUNCTION
export async function verifyEmail(req, res) {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ message: "Please provide verification token" });
        }

        // Find user with valid verification token
        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationTokenExpiry: { $gt: Date.now() } // Token not expired
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired verification token" });
        }

        // Check if email is already verified
        if (user.isEmailVerified) {
            return res.status(400).json({ message: "Email already verified" });
        }

        // Verify email
        user.isEmailVerified = true;
        user.emailVerificationToken = null;
        user.emailVerificationTokenExpiry = null;
        await user.save();

        res.status(200).json({
            message: "Email verified successfully! You can now login to your account."
        });

    } catch (err) {
        console.log("Verify email error:", err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// RESEND VERIFICATION EMAIL FUNCTION
export async function resendVerificationEmail(req, res) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Please provide your email address" });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal if email exists for security
            return res.status(200).json({ 
                message: "If that email exists and is not verified, a verification email has been sent" 
            });
        }

        // Check if already verified
        if (user.isEmailVerified) {
            return res.status(400).json({ message: "Email is already verified" });
        }

        // Generate new verification token
        const emailVerificationToken = crypto.randomBytes(32).toString("hex");
        const emailVerificationTokenExpiry = Date.now() + 86400000; // 24 hours from now

        // Update user with new token
        user.emailVerificationToken = emailVerificationToken;
        user.emailVerificationTokenExpiry = emailVerificationTokenExpiry;
        await user.save();

        // Send verification email
        const emailResult = await sendVerificationEmail(email, emailVerificationToken, user.username);
        
        if (!emailResult.success) {
            console.error("Failed to send verification email:", emailResult.error);
        }

        res.status(200).json({
            message: "Verification email sent. Please check your inbox.",
            emailSent: emailResult.success
        });

    } catch (err) {
        console.log("Resend verification email error:", err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// FORGOT PASSWORD FUNCTION - Send password reset email
export async function forgotPassword(req, res) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Please provide your email address" });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal if email exists for security (prevent email enumeration)
            return res.status(200).json({ 
                message: "If that email exists, a password reset link has been sent" 
            });
        }

        // Generate password reset token
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

        // Save reset token to user
        user.resetToken = resetToken;
        user.resetTokenExpiry = new Date(resetTokenExpiry);
        await user.save();

        // Send password reset email
        console.log(`Sending password reset email to: ${email}`);
        const emailResult = await sendPasswordResetEmail(email, resetToken);
        
        if (!emailResult.success) {
            console.error(" Failed to send password reset email:", emailResult.error);
            // Clear the token if email failed
            user.resetToken = null;
            user.resetTokenExpiry = null;
            await user.save();
            
            return res.status(500).json({
                message: "Failed to send password reset email. Please try again later.",
                error: emailResult.error
            });
        }

        console.log("Password reset email sent successfully!");

        res.status(200).json({
            message: "If that email exists, a password reset link has been sent. Please check your inbox.",
            emailSent: true
        });

    } catch (err) {
        console.log("Forgot password error:", err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// RESET PASSWORD FUNCTION - Reset password using token
export async function resetPassword(req, res) {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ 
                message: "Please provide reset token and new password" 
            });
        }

        // Validate password length
        if (newPassword.length < 6) {
            return res.status(400).json({ 
                message: "Password must be at least 6 characters long" 
            });
        }

        // Find user with valid reset token
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() } // Token not expired
        });

        if (!user) {
            return res.status(400).json({ 
                message: "Invalid or expired reset token. Please request a new password reset." 
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password and clear reset token
        user.password = hashedPassword;
        user.resetToken = null;
        user.resetTokenExpiry = null;
        await user.save();

        console.log(`Password reset successful for user: ${user.username}`);

        res.status(200).json({
            message: "Password reset successfully! You can now login with your new password."
        });

    } catch (err) {
        console.log("Reset password error:", err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// CHANGE PASSWORD FUNCTION - Change password when logged in
export async function changePassword(req, res) {
    try {
        // Verify user is logged in
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ 
                message: "Authentication required. Please login to change your password." 
            });
        }

        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ 
                message: "Invalid or expired token. Please login again." 
            });
        }

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                message: "Please provide both current password and new password" 
            });
        }

        // Validate new password length
        if (newPassword.length < 6) {
            return res.status(400).json({ 
                message: "New password must be at least 6 characters long" 
            });
        }

        // Find user
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }

        // Check if new password is same as current password
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({ 
                message: "New password must be different from your current password" 
            });
        }

        // Hash and update password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        console.log(`Password changed successfully for user: ${user.username}`);

        res.status(200).json({
            message: "Password changed successfully"
        });

    } catch (err) {
        console.log("Change password error:", err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// GET ALL USERS - Admin only
export async function getAllUsers(req, res) {
    try {
        // Verify admin is logged in
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ 
                message: "Authentication required. Please login as admin to view all users." 
            });
        }

        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ 
                message: "Invalid or expired token. Please login again." 
            });
        }

        // Check if user is admin
        if (decoded.role !== "admin") {
            return res.status(403).json({ 
                message: "Access denied. Only admins can view all users." 
            });
        }

        // Get query parameters for filtering and pagination
        const { 
            role, 
            isActive, 
            isEmailVerified,
            search,
            page = 1, 
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter object
        const filter = {};

        // Filter by role
        if (role && ["patient", "doctor", "admin"].includes(role)) {
            filter.role = role;
        }

        // Filter by isActive
        if (isActive !== undefined) {
            filter.isActive = isActive === 'true' || isActive === true;
        }

        // Filter by email verification status
        if (isEmailVerified !== undefined) {
            filter.isEmailVerified = isEmailVerified === 'true' || isEmailVerified === true;
        }

        // Search filter (username, email, firstName, lastName)
        if (search) {
            filter.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
        const skip = (pageNumber - 1) * limitNumber;

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Get total count for pagination
        const totalUsers = await User.countDocuments(filter);

        // Fetch users with pagination
        const users = await User.find(filter)
            .select('-password -emailVerificationToken -resetToken') // Exclude sensitive fields
            .sort(sort)
            .skip(skip)
            .limit(limitNumber);

        // Format user data
        const formattedUsers = users.map(user => ({
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            isEmailVerified: user.isEmailVerified,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            // Role-specific fields
            ...(user.role === 'patient' && {
                bloodGroup: user.bloodGroup,
                allergies: user.allergies
            }),
            ...(user.role === 'doctor' && {
                specialization: user.specialization,
                department: user.department,
                licenseNumber: user.licenseNumber,
                yearsOfExperience: user.yearsOfExperience,
                consultationFee: user.consultationFee
            }),
            ...(user.role === 'admin' && {
                position: user.position
            })
        }));

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalUsers / limitNumber);
        const hasNextPage = pageNumber < totalPages;
        const hasPrevPage = pageNumber > 1;

        console.log(` Admin ${decoded.username} retrieved ${users.length} users (page ${pageNumber}/${totalPages})`);

        res.status(200).json({
            message: "Users retrieved successfully",
            users: formattedUsers,
            pagination: {
                currentPage: pageNumber,
                totalPages: totalPages,
                totalUsers: totalUsers,
                usersPerPage: limitNumber,
                hasNextPage: hasNextPage,
                hasPrevPage: hasPrevPage
            },
            filters: {
                role: role || null,
                isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : null,
                isEmailVerified: isEmailVerified !== undefined ? (isEmailVerified === 'true' || isEmailVerified === true) : null,
                search: search || null
            }
        });

    } catch (err) {
        console.log("Get all users error:", err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// UPDATE MEDICAL RECORD - Patient only
export async function updateMedicalRecord(req, res) {
    try {
        // Verify user is logged in
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ 
                message: "Authentication required. Please login to update your medical record." 
            });
        }

        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ 
                message: "Invalid or expired token. Please login again." 
            });
        }

        // Get user
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if user is a patient
        if (user.role !== "patient") {
            return res.status(403).json({ 
                message: "Only patients can update medical records" 
            });
        }

        const {
            emergencyContact,
            bloodGroup,
            allergies,
            insuranceInfo,
            medicalHistory
        } = req.body;

        // Build update object for medical records only
        const updateData = {};

        // Update emergency contact
        if (emergencyContact !== undefined) {
            if (typeof emergencyContact === 'object' && emergencyContact !== null) {
                updateData.emergencyContact = {
                    name: emergencyContact.name || user.emergencyContact?.name || '',
                    relationship: emergencyContact.relationship || user.emergencyContact?.relationship || '',
                    phoneNumber: emergencyContact.phoneNumber || user.emergencyContact?.phoneNumber || '',
                    email: emergencyContact.email || user.emergencyContact?.email || ''
                };
            } else {
                updateData.emergencyContact = emergencyContact;
            }
        }

        // Update blood group
        if (bloodGroup !== undefined) {
            const validBloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
            if (validBloodGroups.includes(bloodGroup)) {
                updateData.bloodGroup = bloodGroup;
            } else {
                return res.status(400).json({ 
                    message: `Invalid blood group. Valid options: ${validBloodGroups.join(', ')}` 
                });
            }
        }

        // Update allergies
        if (allergies !== undefined) {
            if (Array.isArray(allergies)) {
                updateData.allergies = allergies;
            } else {
                return res.status(400).json({ 
                    message: "Allergies must be an array" 
                });
            }
        }

        // Update insurance info
        if (insuranceInfo !== undefined) {
            if (typeof insuranceInfo === 'object' && insuranceInfo !== null) {
                updateData.insuranceInfo = {
                    provider: insuranceInfo.provider || user.insuranceInfo?.provider || '',
                    policyNumber: insuranceInfo.policyNumber || user.insuranceInfo?.policyNumber || '',
                    groupNumber: insuranceInfo.groupNumber || user.insuranceInfo?.groupNumber || '',
                    expiryDate: insuranceInfo.expiryDate ? new Date(insuranceInfo.expiryDate) : user.insuranceInfo?.expiryDate || null
                };
            } else {
                updateData.insuranceInfo = insuranceInfo;
            }
        }

        // Update medical history
        if (medicalHistory !== undefined) {
            if (Array.isArray(medicalHistory)) {
                // Validate each medical history entry
                const validHistory = medicalHistory.map(entry => {
                    if (typeof entry === 'object' && entry !== null) {
                        return {
                            condition: entry.condition || '',
                            diagnosisDate: entry.diagnosisDate ? new Date(entry.diagnosisDate) : null,
                            notes: entry.notes || ''
                        };
                    }
                    return entry;
                });
                updateData.medicalHistory = validHistory;
            } else {
                return res.status(400).json({ 
                    message: "Medical history must be an array" 
                });
            }
        }

        // Update the user
        const updatedUser = await User.findByIdAndUpdate(
            decoded.userId,
            { $set: updateData },
            { new: true, runValidators: true }
        );
        
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found after update' });
        }

        console.log(`✅ Medical record updated for patient: ${updatedUser.username}`);

        res.status(200).json({
            message: 'Medical record updated successfully',
            medicalRecord: {
                emergencyContact: updatedUser.emergencyContact,
                bloodGroup: updatedUser.bloodGroup,
                allergies: updatedUser.allergies,
                insuranceInfo: updatedUser.insuranceInfo,
                medicalHistory: updatedUser.medicalHistory,
                updatedAt: updatedUser.updatedAt
            }
        });

    } catch (err) {
        console.log("Update medical record error:", err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// DELETE ACCOUNT - Users can delete their own account, admins can delete any account
export async function deleteAccount(req, res) {
    try {
        // Verify user is logged in
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ 
                message: "Authentication required. Please login to delete your account." 
            });
        }

        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ 
                message: "Invalid or expired token. Please login again." 
            });
        }

        // Get user ID from params (for admin) or token (for self-deletion)
        const userId = req.params.userId || decoded.userId;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if user is deleting their own account or is an admin
        if (userId.toString() !== decoded.userId.toString() && decoded.role !== "admin") {
            return res.status(403).json({ 
                message: "You can only delete your own account" 
            });
        }

        // Prevent admin from deleting themselves (safety check)
        if (userId.toString() === decoded.userId.toString() && decoded.role === "admin") {
            // Allow self-deletion but warn
            console.log(` Admin ${decoded.username} is deleting their own account`);
        }

        // Cancel all pending/confirmed appointments for this user
        const userAppointments = await Appointment.find({
            $or: [
                { patient: userId, status: { $in: ["pending", "confirmed"] } },
                { doctor: userId, status: { $in: ["pending", "confirmed"] } }
            ]
        });

        if (userAppointments.length > 0) {
            // Cancel all pending/confirmed appointments
            await Appointment.updateMany(
                {
                    $or: [
                        { patient: userId, status: { $in: ["pending", "confirmed"] } },
                        { doctor: userId, status: { $in: ["pending", "confirmed"] } }
                    ]
                },
                { $set: { status: "cancelled" } }
            );
            console.log(`✅ Cancelled ${userAppointments.length} appointment(s) for user ${user.username}`);
        }

        // Delete the user account
        await User.findByIdAndDelete(userId);

        console.log(` Account deleted: ${user.username} (${user.role})`);

        res.status(200).json({
            message: 'Account deleted successfully',
            deletedUser: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            cancelledAppointments: userAppointments.length
        });

    } catch (err) {
        console.log("Delete account error:", err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}