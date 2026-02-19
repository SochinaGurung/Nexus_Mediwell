import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import './Home.css'
import hospital from "../../assets/hospitalbed.png";

export default function Home() {
  return (
    <>
      <Header />
      <section className="hero">
        <div className="hero-text">
          <span className="badge">TRUSTED MEDICAL CARE</span>

          <h1>
            Caring for Your <br />
            Health, Every Step of <br />
            the Way
          </h1>

          <p>
            Experience world-class healthcare with our expert team and
            state-of-the-art facilities. Your wellness is our primary mission.
          </p>

          <div className="hero-buttons">
            <Link to="/login">
              <button className="primary-btn">Book Appointment</button>
            </Link>
            <a href="#services">
              <button className="secondary-btn">Our Services</button>
            </a>
          </div>
        </div>

        <div className="hospital-image">
            <img src={hospital} alt="Hospital" />
        </div>
      </section>

      {/* SERVICES */}
      <section className="services">
        <div className="services-header">
          <div>
            <span className="section-tag">OUR DEPARTMENTS</span>
            <h2>Professional Services</h2>
          </div>

          <p>
            Comprehensive medical solutions tailored to your unique health needs
            with 24/7 support.
          </p>
        </div>

        <div className="service-cards">
          <div className="service-card">
            <div className="icon">✱</div>
            <h3>Emergency</h3>
            <p>
              Fast and critical care response teams available 24/7 for all
              emergencies.
            </p>
          </div>

          <div className="service-card">
            <div className="icon">⚕</div>
            <h3>Pharmacy</h3>
            <p>
              Fully stocked pharmacy with certified medicines and professional
              guidance.
            </p>
          </div>

          <div className="service-card">
            <div className="icon">🧪</div>
            <h3>Laboratory</h3>
            <p>
              Advanced diagnostic testing with high precision and fast digital
              results.
            </p>
          </div>

          <div className="service-card">
            <div className="icon">💬</div>
            <h3>Telemedicine</h3>
            <p>
              Virtual consultations with leading specialists from the comfort
              of your home.
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </>
  )
}