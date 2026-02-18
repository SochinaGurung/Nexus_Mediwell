import { Link } from 'react-router-dom'
import './Header.css'
import { useState } from 'react'

export default function Header() {
    const [servicesOpen, setServicesOpen] = useState(false)

  return (
    <header className="header">
      <div className="Logo">
        <Link to="/" className="logo-link">
          <div className="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#2C5F7C" />
              <path d="M2 17L12 22L22 17" stroke="#2C5F7C" strokeWidth="2" strokeLinecap="round" />
              <path d="M2 12L12 17L22 12" stroke="#2C5F7C" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="logo-text">Nexus Mediwell</span>
        </Link>
      </div>
      <div className="nav">
        <a href="#overview">Hospital Overview</a>
         <div
          className="dropdown"
          onMouseEnter={() => setServicesOpen(true)}
          onMouseLeave={() => setServicesOpen(false)}
        >
          <span className="dropdown-title">Services ▾</span>
          {servicesOpen && (
            <div className="dropdown-menu">
              <Link to="/services/emergency">Emergency Care</Link>
              <Link to="/services/diagnostics">Diagnostics</Link>
              <Link to="/services/surgery">Surgery</Link>
              <Link to="/services/pharmacy">Pharmacy</Link>
            </div>
          )}
        </div>
        <Link to="/departments">Departments</Link>
        <Link to="/doctors">Doctors</Link>
        <a href="#contact">Contact</a>
      </div>
      <div className="nav-actions">
        <Link to="/login">
          <button className="login-btn">Login</button>
        </Link>
        <Link to="/register">
          <button className="register-btn">Register</button>
        </Link>
      </div>
    </header>
  )
}


