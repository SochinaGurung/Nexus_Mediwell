import feedbackService from '../services/feedback.service.js';
import jwt from 'jsonwebtoken';

// SUBMIT FEEDBACK - Public endpoint (no auth required)
export async function submitFeedback(req, res) {
    try {
        // Optional: Check if user is logged in and link feedback to user
        let userId = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                userId = decoded.userId;
            } catch (err) {
                // Token invalid or expired - continue as anonymous feedback
                userId = null;
            }
        }

        const feedback = await feedbackService.submitFeedback(req.body, userId);

        res.status(201).json({
            message: 'Thank you for your feedback! We will get back to you soon.',
            feedback: feedback
        });

    } catch (err) {
        console.error('Submit feedback error:', err);
        const statusCode = err.message.includes('required') || 
                          err.message.includes('Invalid email') ? 400 : 500;
        res.status(statusCode).json({ 
            message: err.message || 'Server error'
        });
    }
}

// GET ALL FEEDBACK - Admin only (middleware handles auth)
export async function getAllFeedback(req, res) {
    try {
        const result = await feedbackService.getAllFeedback(req.query);
        
        res.status(200).json({
            message: 'Feedback retrieved successfully',
            ...result
        });

    } catch (err) {
        console.error('Get all feedback error:', err);
        res.status(500).json({ 
            message: 'Server error', 
            error: err.message 
        });
    }
}

// GET SINGLE FEEDBACK - Admin only
export async function getFeedbackById(req, res) {
    try {
        const { id } = req.params;
        const feedback = await feedbackService.getFeedbackById(id);

        res.status(200).json({
            message: 'Feedback retrieved successfully',
            feedback: feedback
        });

    } catch (err) {
        console.error('Get feedback by ID error:', err);
        const statusCode = err.message === 'Feedback not found' ? 404 : 500;
        res.status(statusCode).json({ 
            message: err.message || 'Server error'
        });
    }
}

// UPDATE FEEDBACK STATUS - Admin only (middleware handles auth)
export async function updateFeedbackStatus(req, res) {
    try {
        const { id } = req.params;
        const feedback = await feedbackService.updateFeedbackStatus(
            id,
            req.body,
            req.user.userId
        );

        res.status(200).json({
            message: 'Feedback updated successfully',
            feedback: feedback
        });

    } catch (err) {
        console.error('Update feedback status error:', err);
        const statusCode = err.message === 'Feedback not found' ? 404 : 500;
        res.status(statusCode).json({ 
            message: err.message || 'Server error'
        });
    }
}

// DELETE FEEDBACK - Admin only (middleware handles auth)
export async function deleteFeedback(req, res) {
    try {
        const { id } = req.params;
        await feedbackService.deleteFeedback(id);

        res.status(200).json({
            message: 'Feedback deleted successfully'
        });

    } catch (err) {
        console.error('Delete feedback error:', err);
        const statusCode = err.message === 'Feedback not found' ? 404 : 500;
        res.status(statusCode).json({ 
            message: err.message || 'Server error'
        });
    }
}
