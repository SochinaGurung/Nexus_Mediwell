import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authService } from '../../services/authService'
import './Register.css'

interface RegisterFormData {
  username: string
  email: string
  password: string
  confirmPassword: string
}

interface RegisterResponse {
  message: string
  user: {
    id: string
    username: string
    email: string
    role: 'patient' | 'doctor' | 'admin'
  }
  emailSent?: boolean
  emailError?: string
  emailWarning?: boolean
}

export default function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false)
  const [success, setSuccess] = useState<string>('')

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (error) setError('')
    if (success) setSuccess('')
  }

  const validateForm = (): boolean => {
    if (!formData.username.trim()) {
      setError('Username is required')
      return false
    }

    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters long')
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

    if (!formData.password) {
      setError('Password is required')
      return false
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
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
      const response = (await authService.register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: 'patient',
      })) as RegisterResponse

      try {
        const loginRes = await authService.login(
          formData.username.trim(),
          formData.password,
          true
        )
        if (loginRes.token) {
          navigate('/patient/dashboard', { replace: true })
          return
        }
      } catch {
        /* fall through: account exists but auto sign-in failed */
      }

      setSuccess(
        response.message ||
          'Account created. Please sign in to open your dashboard.'
      )
      navigate('/login', { replace: true })
    } catch (err: unknown) {
      const errorMessage =
        (err as { message?: string })?.message ||
        'Registration failed. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <div className="logo">
            <div className="logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#2C5F7C" />
                <path d="M2 17L12 22L22 17" stroke="#2C5F7C" strokeWidth="2" strokeLinecap="round" />
                <path d="M2 12L12 17L22 12" stroke="#2C5F7C" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="logo-text">Nexus Mediwell</span>
          </div>
          <p>Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          {error && (
            <div className={`error-message ${error.includes('Registration successful') ? 'warning-message' : ''}`}>
              {error}
            </div>
          )}
          {success && <div className="success-message">{success}</div>}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
              required
              minLength={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                minLength={6}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="password-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
                minLength={6}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button type="submit" className="register-button" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <div className="divider">
            <span>Or</span>
          </div>

          <p className="login-link">
            Already have an account? <Link to="/login">Sign in here</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
