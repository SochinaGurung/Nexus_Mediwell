import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { authService } from '../../services/authService'
import './Login.css'

interface LoginFormData {
  username: string
  password: string
}

interface LoginResponse {
  message: string
  token: string
  user: {
    id: string
    username: string
    email: string
    role: 'patient' | 'doctor' | 'admin'
  }
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()

  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: '',
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  useEffect(()=>{
    const token=localStorage.getItem('token') || sessionStorage.getItem('token')
    const role=localStorage.getItem('role') || sessionStorage.getItem('token')
    

    if(token && role){
      if(role==='admin'){
        navigate('/admin/dashboard',{replace:true})
      }
      else if(role==='doctor'){
        navigate('/doctor/dashboard',{replace:true})
      }else{
        navigate('/patient/dashboard',{replace:true})
      }
    }
  },[navigate])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = (await authService.login(
        formData.username,
        formData.password
      )) as LoginResponse

      if (response.token) {

        const storage = rememberMe ? localStorage : sessionStorage

      // Store token
      storage.setItem('token', response.token)
      //Storing username for Home page
      storage.setItem('username', response.user.username)
      storage.setItem('role', response.user.role)


      const { role } = response.user
      
      // Checking if user is trying to book an appointment
      const selectedDoctorId = localStorage.getItem('selectedDoctorId')
      const fromBooking = location.state?.from === 'book-appointment'
      
      if (role === 'admin') {
        navigate('/admin/dashboard',{replace:true})
      } else if (role === 'doctor') {
        navigate('/doctor/dashboard',{replace:true})
      } else if (fromBooking && selectedDoctorId) {
        // Redirect to appointment booking page if coming from booking
        navigate('/appointments/book',{replace:true})
      } else {
        navigate('/patient/dashboard',{replace:true})
      }
    }

    } catch (err: unknown) {
      setError(
        (err as { message?: string })?.message ||
          'Login failed. Please check your credentials.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
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
          <p>Hospital Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}

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

          <div className="form-options">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>

            <Link to="/forgot-password" className="forgot-password">
              Forgot password?
            </Link>
          </div>

          <button type="submit" disabled={loading} className="login-button">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="signup-link">
            Don’t have an account? <Link to="/register">Sign up</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
