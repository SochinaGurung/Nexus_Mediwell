import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import './AddDoctorForm.css'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

function defaultAvailability(): Record<string, { available: boolean; startTime: string; endTime: string }> {
  return Object.fromEntries(
    DAYS.map((d) => [d, { available: false, startTime: '', endTime: '' }])
  ) as Record<string, { available: boolean; startTime: string; endTime: string }>;
}

interface AddDoctorFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  specialty: string;
  department: string;
  qualifications: string;
  experience: string;
  licenseNumber: string;
  /** Whole rupees, e.g. 1500 */
  consultationFee: string;
  availability: Record<string, { available: boolean; startTime: string; endTime: string }>;
}


interface RegisterResponse {
  message: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: 'doctor';
    specialty?: string;
    department?: string;
  };
  emailSent?: boolean;
  emailError?: string;
  emailWarning?: boolean;
}

export default function AddDoctorForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<AddDoctorFormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    specialty: '',
    department: '',
    qualifications:'',
    experience:'',
    licenseNumber:'',
    consultationFee: '',
    availability: defaultAvailability(),
  });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const updateAvailability = (path: string, value: unknown) => {
    setFormData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const parts = path.split('.');
      let cur: Record<string, unknown> = next.availability;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (!(key in cur)) cur[key] = {};
        cur = cur[key] as Record<string, unknown>;
      }
      cur[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const validateForm = (): boolean => {
    if (!formData.username.trim()) return setErrorAndReturn('Username is required');
    if (formData.username.length < 3) return setErrorAndReturn('Username must be at least 3 characters');
    if (!formData.email.trim()) return setErrorAndReturn('Email is required');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return setErrorAndReturn('Enter a valid email');
    if (!formData.password) return setErrorAndReturn('Password is required');
    if (formData.password.length < 6) return setErrorAndReturn('Password must be at least 6 characters');
    if (formData.password !== formData.confirmPassword) return setErrorAndReturn('Passwords do not match');
    if (!formData.specialty.trim()) return setErrorAndReturn('Specialty is required');
    if (!formData.department.trim()) return setErrorAndReturn('Department is required');
    const feeRaw = formData.consultationFee.trim();
    if (!feeRaw) return setErrorAndReturn('Consultation fee (Rs.) is required');
    const fee = parseFloat(feeRaw);
    if (Number.isNaN(fee) || fee < 0) {
      return setErrorAndReturn('Enter a valid consultation fee in Rs. (0 or greater)');
    }
    return true;
  };

  const setErrorAndReturn = (message: string) => {
    setError(message);
    return false;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    setLoading(true);
    try {
      // Get admin token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in as admin to add doctors');
        setLoading(false);
        return;
      }

      const availabilityPayload: Record<string, { available: boolean; startTime?: string; endTime?: string }> = {};
      DAYS.forEach((d) => {
        const day = formData.availability[d];
        availabilityPayload[d] = {
          available: !!day?.available,
          startTime: day?.startTime?.trim() || undefined,
          endTime: day?.endTime?.trim() || undefined,
        };
      });

      const response = (await authService.register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: 'doctor', // only doctor
        specialty: formData.specialty,
        department: formData.department,
        qualifications: formData.qualifications,
        yearsOfExperience: formData.experience ? parseInt(formData.experience, 10) : undefined,
        licenseNumber: formData.licenseNumber,
        consultationFee: parseFloat(formData.consultationFee.trim()) || 0,
        availability: availabilityPayload,
      })) as RegisterResponse;

      // Registration successful - email was validated before user creation
      setSuccess(response.message || 'Doctor added successfully!');
      setTimeout(() => navigate('/admin/dashboard'), 2000); // go back to admin dashboard
    } catch (err: unknown) {
      const errorMessage = (err as { message?: string })?.message || 'Registration failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
          <p>Add a new doctor</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          {error && (
            <div className={`error-message ${error.includes('successfully') ? 'warning-message' : ''}`}>
              {error}
            </div>
          )}
          {success && <div className="success-message">{success}</div>}

          <div className="form-group">
            <label htmlFor="username">Doctors Name</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter doctors name"
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
              placeholder="Enter email"
              required
            />
          </div>

          

          <div className="form-group">
            <label htmlFor="specialty">Specialty</label>
            <input
              type="text"
              id="specialty"
              name="specialty"
              value={formData.specialty}
              onChange={handleChange}
              placeholder="Enter specialty (e.g., Cardiology)"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="department">Department</label>
            <input
              type="text"
              id="department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="Enter department (e.g., Surgery)"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="qualifications">Qualifications</label>
              <input
                type="text"
                id="qualifications"
                name="qualifications"
                value={formData.qualifications}
                onChange={handleChange}
                placeholder="e.g., MBBS, MD"
                required
              />
          </div>
          <div className="form-group">
            <label htmlFor="experience">Years of Experience</label>
            <input
              type="number"
              id="experience"
              name="experience"
              value={formData.experience}
              onChange={handleChange}
              placeholder="e.g., 5"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="licenseNumber">Medical License Number</label>
            <input
              type="text"
              id="licenseNumber"
              name="licenseNumber"
              value={formData.licenseNumber}
              onChange={handleChange}
              placeholder="Enter license number"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="consultationFee">Consultation fee (Rs.)</label>
            <input
              type="number"
              id="consultationFee"
              name="consultationFee"
              value={formData.consultationFee}
              onChange={handleChange}
              placeholder="e.g., 1500"
              min={0}
              step={1}
              inputMode="decimal"
              required
            />
            <p className="form-hint-inline">Fee per consultation in Nepalese Rupees (Rs.).</p>
          </div>

          <div className="form-group availability-section">
            <label className="availability-section-label">Availability</label>
            <p className="availability-hint">Set available days and time slots for this doctor.</p>
            <div className="availability-edit-grid">
              {DAYS.map((day) => {
                const d = formData.availability[day] || { available: false, startTime: '', endTime: '' };
                return (
                  <div key={day} className="availability-edit-row">
                    <label className="availability-day-label">
                      <input
                        type="checkbox"
                        checked={!!d.available}
                        onChange={(e) => updateAvailability(`${day}.available`, e.target.checked)}
                      />
                      <span>{day.charAt(0).toUpperCase() + day.slice(1)}</span>
                    </label>
                    <input
                      type="time"
                      value={d.startTime ?? ''}
                      onChange={(e) => updateAvailability(`${day}.startTime`, e.target.value)}
                      disabled={!d.available}
                    />
                    <span className="availability-sep">–</span>
                    <input
                      type="time"
                      value={d.endTime ?? ''}
                      onChange={(e) => updateAvailability(`${day}.endTime`, e.target.value)}
                      disabled={!d.available}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="form-group password-wrapper">
            <label htmlFor="password">Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
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

          <div className="form-group password-wrapper">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm password"
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

          <button type="submit" className="register-button" disabled={loading}>
            {loading ? 'Adding doctor...' : 'Add Doctor'}
          </button>
        </form>
      </div>
    </div>
  );
}
