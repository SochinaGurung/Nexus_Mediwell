import { useState, type FormEvent, type ChangeEvent } from 'react'
import { feedbackService } from '../../services/feedbackService'
import "./Footer.css";

interface FeedbackFormData {
  fullName: string
  phoneNumber: string
  email: string
  message: string
}

export default function Footer() {
  const [formData, setFormData] = useState<FeedbackFormData>({
    fullName: '',
    phoneNumber: '',
    email: '',
    message: ''
  })
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (error) setError('')
    if (success) setSuccess('')
  }

  const validateForm = (): boolean => {
    if (!formData.fullName.trim()) {
      setError('Full name is required')
      return false
    }
    if (!formData.phoneNumber.trim()) {
      setError('Phone number is required')
      return false
    }
    if (!formData.email.trim()) {
      setError('Email is required')
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address')
      return false
    }
    if (!formData.message.trim()) {
      setError('Message is required')
      return false
    }
    return true
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validateForm()) return

    setLoading(true)
    try {
      const response = await feedbackService.submitFeedback({
        fullName: formData.fullName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email.trim(),
        message: formData.message.trim()
      })
      
      setSuccess(response.message || 'Thank you for your feedback!')
      
      // Reset form
      setFormData({
        fullName: '',
        phoneNumber: '',
        email: '',
        message: ''
      })

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess('')
      }, 5000)
    } catch (err: unknown) {
      const errorMessage = (err as { message?: string })?.message || 'Failed to submit feedback. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <footer className="footer">
      <div className="footer-top">
        {/* LEFT */}
        <div className="footer-col">
          <div className="footer-logo">
            <div className="logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#2C5F7C" />
                <path d="M2 17L12 22L22 17" stroke="#2C5F7C" strokeWidth="2" strokeLinecap="round" />
                <path d="M2 12L12 17L22 12" stroke="#2C5F7C" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="logo-text">Nexus Mediwell</span>
          </div>

          <p>98629165942</p>
          <p>013725172</p>
          <p>P. O. Box 11796</p>
          <p>Bouddha, Kathmandu, Nepal</p>
          <p>info@nexusmediwell.com</p>

          <div className="social-icons">
            <span>F</span>
            <span>X</span>
            <span>In</span>
            
          </div>
        </div>

        {/* MIDDLE */}
        <div className="footer-col">
          <h4>QUICK LINKS</h4>
          <ul>
            <li>Health Packages</li>
            <li>Career</li>
            <li>Report Download</li>
            <li>Downloads</li>
          </ul>
        </div>

        {/* RIGHT */}
        <div className="footer-col form-col">
          <h4>FEEDBACK FORM</h4>

          <form onSubmit={handleSubmit}>
            {error && <div className="feedback-error">{error}</div>}
            {success && <div className="feedback-success">{success}</div>}

            <label htmlFor="fullName">Full Name <span>*</span></label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              placeholder="Full Name"
              value={formData.fullName}
              onChange={handleChange}
              required
            />

            <div className="two-inputs">
              <div>
                <label htmlFor="phoneNumber">Phone Number <span>*</span></label>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  placeholder="Phone Number"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="email">Email <span>*</span></label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <label htmlFor="message">Message <span>*</span></label>
            <textarea
              id="message"
              name="message"
              placeholder="Enter your message here..."
              value={formData.message}
              onChange={handleChange}
              required
            />

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        </div>
      </div>

      {/* BOTTOM */}
      <div className="footer-bottom">
        <p>
          Privacy Policy &nbsp; | &nbsp; Terms and Conditions
        </p>
        <p>
          ©2026 Nexus Mediwell Pvt. Ltd. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
