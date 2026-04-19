import Feedback from '../models/feedback.model.js';
import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';


class FeedbackService {
    
    async submitFeedback(feedbackData, userId = null) {
        const { fullName, phoneNumber, email, message } = feedbackData;

        // Validation
        if (!fullName || !phoneNumber || !email || !message) {
            throw new Error('All fields are required: fullName, phoneNumber, email, message');
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Invalid email format');
        }

        // Create feedback
        const feedback = new Feedback({
            fullName: fullName.trim(),
            phoneNumber: phoneNumber.trim(),
            email: email.trim().toLowerCase(),
            message: message.trim(),
            userId: userId,
            status: 'new'
        });

        await feedback.save();

        console.log(`✅ Feedback submitted by ${fullName} (${email})`);

        return {
            id: feedback._id,
            fullName: feedback.fullName,
            email: feedback.email,
            createdAt: feedback.createdAt
        };
    }

    
    async getAllFeedback(filters = {}) {
        const { 
            status, 
            page = 1, 
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = filters;

        // Build filter
        const filter = {};
        if (status && ['new', 'read', 'replied', 'archived'].includes(status)) {
            filter.status = status;
        }

        let pageNumber = parseInt(String(page), 10);
        if (Number.isNaN(pageNumber) || pageNumber < 1) pageNumber = 1;

        let limitNumber = parseInt(String(limit), 10);
        if (Number.isNaN(limitNumber) || limitNumber < 1) limitNumber = 20;
        if (limitNumber > 100) limitNumber = 100;

        const skip = (pageNumber - 1) * limitNumber;

        const allowedSortFields = ["createdAt", "updatedAt", "status"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortDir = sortOrder === "asc" ? 1 : -1;

        const sort = {};
        sort[sortField] = sortDir;

        // Get total count
        const totalFeedback = await Feedback.countDocuments(filter);

        // Fetch feedback
        const feedbackList = await Feedback.find(filter)
            .populate('userId', 'username email')
            .populate('respondedBy', 'username email')
            .sort(sort)
            .skip(skip)
            .limit(limitNumber);

        const totalPages = Math.max(1, Math.ceil(totalFeedback / limitNumber));
        const hasNextPage = pageNumber < totalPages;
        const hasPrevPage = pageNumber > 1;

        return {
            feedback: feedbackList,
            pagination: {
                currentPage: pageNumber,
                totalPages: totalPages,
                totalFeedback: totalFeedback,
                feedbackPerPage: limitNumber,
                hasNextPage: hasNextPage,
                hasPrevPage: hasPrevPage
            },
            filters: {
                status: status || null
            }
        };
    }

    /**
     * Get feedback by ID
     */
    async getFeedbackById(id) {
        const feedback = await Feedback.findById(id)
            .populate('userId', 'username email')
            .populate('respondedBy', 'username email');

        if (!feedback) {
            throw new Error('Feedback not found');
        }

        return feedback;
    }

    /**
     * Update feedback status
     */
    async updateFeedbackStatus(id, updateData, adminUserId) {
        const { status, adminResponse } = updateData;

        const feedback = await Feedback.findById(id);
        if (!feedback) {
            throw new Error('Feedback not found');
        }

        // Update status
        if (status && ['new', 'read', 'replied', 'archived'].includes(status)) {
            feedback.status = status;
        }

        // Update admin response if provided
        if (adminResponse) {
            feedback.adminResponse = adminResponse.trim();
            feedback.respondedBy = adminUserId;
            feedback.respondedAt = new Date();
            feedback.status = 'replied';
        }

        await feedback.save();

        return feedback;
    }

    /**
     * Delete feedback
     */
    async deleteFeedback(id) {
        const feedback = await Feedback.findByIdAndDelete(id);

        if (!feedback) {
            throw new Error('Feedback not found');
        }

        return { message: 'Feedback deleted successfully' };
    }
}

export default new FeedbackService();
