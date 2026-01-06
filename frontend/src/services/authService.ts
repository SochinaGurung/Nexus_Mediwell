import api from './api'

interface User {
  id: string
  username: string
  email: string
  role: 'patient' | 'doctor' | 'admin'
}

interface LoginResponse {
  message: string
  token: string
  user: User
}

interface RegisterResponse {
  message: string
  user: User
  emailSent?: boolean
  emailError?: string
}

interface ApiError {
  message: string
  [key: string]: unknown
}

export const authService = {
  // Login user
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await api.post<LoginResponse>('/auth/login', {
        username,
        password,
      })

      if (response.data.token) {
        // Store token and user data
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
      }

      return response.data
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: ApiError } }
      throw apiError.response?.data || { message: 'Login failed' }
    }
  },

  // Register user
  async register(userData: {
    username: string
    email: string
    password: string
    role?: 'patient' | 'doctor' | 'admin'
  }): Promise<RegisterResponse> {
    try {
      const response = await api.post<RegisterResponse>(
        '/auth/register',
        userData
      )
      return response.data
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: ApiError } }
      throw apiError.response?.data || { message: 'Registration failed' }
    }
  },

  // Logout user
  async logout(): Promise<void> {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        await api.post('/auth/logout')
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  },

  // Get current user from localStorage
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user')
    return userStr ? (JSON.parse(userStr) as User) : null
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token')
  },

  // Get token
  getToken(): string | null {
    return localStorage.getItem('token')
  },
}

