import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/user.model.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../utils/emailService.js";

//  REGISTER FUNCTION
export async function register(req, res) {
    try {
        const { username, email, password, role } = req.body;

        // Check if username or email exists
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ message: "Username or email already exists" });
        }

        // Default role to "patient" if not provided
        const userRole = role || "patient";

        // Allowed roles
        const allowedRoles = ["patient", "doctor", "admin"];
        if (!allowedRoles.includes(userRole)) {
            return res.status(400).json({ message: "Invalid role" });
        }

        // Only admin can create doctor/admin
        // If req.user is undefined (public registration), only allow "patient" role
        if ((userRole === "doctor" || userRole === "admin") && req.user?.role !== "admin") {
            return res.status(403).json({ message: "Only admin can create doctor or admin accounts" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate email verification token
        const emailVerificationToken = crypto.randomBytes(32).toString("hex");
        const emailVerificationTokenExpiry = Date.now() + 86400000; // 24 hours from now

        // Create user
        const user = new User({ 
            username, 
            email, 
            password: hashedPassword, 
            role: userRole,
            emailVerificationToken,
            emailVerificationTokenExpiry
        });
        await user.save();

        // Send verification email
        const emailResult = await sendVerificationEmail(email, emailVerificationToken, username);
        
        if (!emailResult.success) {
            console.error("❌ Failed to send verification email:", emailResult.error);
            if (emailResult.details) {
                console.error("   Error details:", emailResult.details);
            }
            // Still return success, but log the error
            // In production, you might want to handle this differently
        }

        res.status(201).json({
            message: "User registered successfully. Please check your email to verify your account.",
            user: { username, email, role: userRole },
            emailSent: emailResult.success
        });

    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
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

        // Check if email is verified
        if (!user.isEmailVerified) {
            return res.status(403).json({ 
                message: 'Please verify your email before logging in. Check your inbox for the verification link.' 
            });
        }

        // Creating JWT token 
        const token = jwt.sign(
            { userId: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );
       
        res.status(200).json({
            message: 'Login successfull',
            token: token,
            user: {
                id: user._id,
                username: user.username,
                role: user.role
            }
        });

    } catch (err) {
        console.log("Login error:", err)
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

//  FORGOT PASSWORD FUNCTION
export async function forgotPassword(req, res) {
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
                message: "If that email exists, a password reset link has been sent" 
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

        // Save reset token to user
        user.resetToken = resetToken;
        user.resetTokenExpiry = resetTokenExpiry;
        await user.save();

        // Send password reset email
        const emailResult = await sendPasswordResetEmail(email, resetToken);
        
        if (!emailResult.success) {
            console.error("Failed to send password reset email:", emailResult.error);
            // Still return success for security (don't reveal if email exists)
        }
        
        res.status(200).json({
            message: "If that email exists, a password reset link has been sent to your email"
        });

    } catch (err) {
        console.log("Forgot password error:", err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

//  RESET PASSWORD FUNCTION
export async function resetPassword(req, res) {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ message: "Please provide reset token and new password" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long" });
        }

        // Find user with valid reset token
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() } // Token not expired
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired reset token" });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password and clear reset token
        user.password = hashedPassword;
        user.resetToken = null;
        user.resetTokenExpiry = null;
        await user.save();

        res.status(200).json({
            message: "Password reset successfully. You can now login with your new password"
        });

    } catch (err) {
        console.log("Reset password error:", err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

//  VERIFY EMAIL FUNCTION
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

        // Check if already verified
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

//  RESEND VERIFICATION EMAIL FUNCTION
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

//  TEST EMAIL CONFIGURATION FUNCTION
export async function testEmailConfig(req, res) {
    try {
        const { testEmail } = req.body;

        if (!testEmail) {
            return res.status(400).json({ message: "Please provide a test email address" });
        }

        // Check if SMTP is configured
        const config = {
            SMTP_HOST: process.env.SMTP_HOST || 'not set',
            SMTP_PORT: process.env.SMTP_PORT || 'not set',
            SMTP_USER: process.env.SMTP_USER || 'not set',
            SMTP_PASS: process.env.SMTP_PASS ? '***configured***' : 'not set',
            FRONTEND_URL: process.env.FRONTEND_URL || 'not set'
        };

        // Try to send a test email
        const { sendVerificationEmail } = await import("../utils/emailService.js");
        const testToken = "test-token-123";
        const emailResult = await sendVerificationEmail(testEmail, testToken, "TestUser");

        res.status(200).json({
            message: emailResult.success 
                ? "Test email sent successfully! Check your inbox." 
                : "Failed to send test email. Check server console for details.",
            emailSent: emailResult.success,
            error: emailResult.error || null,
            config: config
        });

    } catch (err) {
        console.log("Test email error:", err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}