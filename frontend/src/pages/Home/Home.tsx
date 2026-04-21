import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { departmentSuggestionService } from '../../services/departmentSuggestionService'
import './Home.css'
import hospital from "../../assets/hospitalbed.png";

type ChatBubble = {
  id: number
  role: 'user' | 'bot'
  text: string
}

type ParsedSuggestion = {
  department: string
  condition: string
  reason: string
  safetyNote?: string
}

const MIN_MS_BETWEEN_SYMPTOM_REQUESTS = 4000

function parseSuggestion(text: string): ParsedSuggestion | null {
  const department = text.match(/(?:^|\n)\s*(?:1[\).\-\s]*)?\s*Recommended Department\s*[:\-]\s*(.+)/i)?.[1]?.trim()
  const condition = text.match(/(?:^|\n)\s*(?:2[\).\-\s]*)?\s*Likely Condition\s*[:\-]\s*(.+)/i)?.[1]?.trim()
  const reason = text.match(/(?:^|\n)\s*(?:3[\).\-\s]*)?\s*Brief Reason\s*[:\-]\s*(.+)/i)?.[1]?.trim()
  const safetyNote = text.match(/For urgent or severe symptoms[^\n]*/i)?.[0]?.trim()

  if (!department || !condition || !reason) return null
  return { department, condition, reason, safetyNote }
}

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const lastSymptomRequestAt = useRef(0)
  const [messages, setMessages] = useState<ChatBubble[]>([
    {
      id: 1,
      role: 'bot',
      text: 'Describe your symptoms and I will suggest which department may be right for you. This is guidance only—not a diagnosis.',
    },
  ])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const now = Date.now()
    if (now - lastSymptomRequestAt.current < MIN_MS_BETWEEN_SYMPTOM_REQUESTS) {
      const waitSec = Math.ceil(
        (MIN_MS_BETWEEN_SYMPTOM_REQUESTS - (now - lastSymptomRequestAt.current)) / 1000
      )
      setMessages((m) => [
        ...m,
        {
          id: Date.now(),
          role: 'bot',
          text: `Please wait about ${waitSec}s between messages so we do not hit the AI rate limit.`,
        },
      ])
      return
    }
    lastSymptomRequestAt.current = now

    setInput('')
    setMessages((m) => [...m, { id: Date.now(), role: 'user', text }])
    setLoading(true)
    try {
      const res = await departmentSuggestionService.findBySymptoms(text)
      const topMatch = res.matches?.[0]
      const fallback =
        topMatch?.department || topMatch?.disease
          ? `Top similar record: **${topMatch?.disease || 'N/A'}** -> **${topMatch?.department || 'N/A'}**.`
          : 'I could not find a close historical match. Please consult a doctor for proper evaluation.'
      const botText =
        (typeof res.suggestion === 'string' && res.suggestion.trim()) ||
        fallback
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          role: 'bot',
          text: `${botText}\n\nFor urgent or severe symptoms, use emergency services.`,
        },
      ])
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { error?: string; detail?: string } } })?.response?.data
      const msg =
        data?.error ||
        'Something went wrong. Please try again in a moment.'
      const detail = data?.detail ? ` (${data.detail})` : ''
      setMessages((m) => [...m, { id: Date.now() + 2, role: 'bot', text: msg + detail }])
    } finally {
      setLoading(false)
    }
  }

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
      <section id="services" className="services">
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

      <button
        type="button"
        className="symptom-chatbot-fab"
        onClick={() => setChatOpen((v) => !v)}
        aria-expanded={chatOpen}
        aria-label={chatOpen ? 'Close symptom assistant' : 'Open symptom assistant'}
      >
        {chatOpen ? '✕' : '💬'}
      </button>

      {chatOpen ? (
        <div className="symptom-chatbot-panel" role="dialog" aria-labelledby="symptom-chatbot-title">
          <div className="symptom-chatbot-panel-header">
            <div>
              <h3 id="symptom-chatbot-title">Symptom assistant</h3>
              <p className="symptom-chatbot-sub">Department suggestion (AI-assisted)</p>
            </div>
            <button type="button" className="symptom-chatbot-close" onClick={() => setChatOpen(false)} aria-label="Close">
              ×
            </button>
          </div>
          <div className="symptom-chatbot-messages">
            {messages.map((b) => (
              <div key={b.id} className={`symptom-chatbot-bubble symptom-chatbot-bubble--${b.role}`}>
                {(() => {
                  if (b.role === 'bot') {
                    const parsed = parseSuggestion(b.text)
                    if (parsed) {
                      return (
                        <div className="symptom-suggestion-card">
                          <p><strong>Recommended Department:</strong> {parsed.department}</p>
                          <p><strong>Likely Condition:</strong> {parsed.condition}</p>
                          <p><strong>Brief Reason:</strong> {parsed.reason}</p>
                          {parsed.safetyNote ? <p className="symptom-suggestion-note">{parsed.safetyNote}</p> : null}
                        </div>
                      )
                    }
                  }
                  return b.text.split('**').map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>))
                })()}
              </div>
            ))}
            {loading ? <div className="symptom-chatbot-bubble symptom-chatbot-bubble--bot">Thinking…</div> : null}
          </div>
          <div className="symptom-chatbot-input-row">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. fever, sore throat, headache for 2 days"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void sendMessage()
                }
              }}
            />
            <button type="button" onClick={() => void sendMessage()} disabled={loading}>
              Send
            </button>
          </div>
        </div>
      ) : null}

      <Footer />
    </>
  )
}