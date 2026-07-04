import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiSearch,
  FiActivity,
  FiCalendar,
  FiShield,
  FiAlertCircle,
  FiArrowRight,
  FiChevronDown,
  FiStar,
  FiTrendingUp,
  FiMap,
  FiLock
} from 'react-icons/fi';
import FeatureCard from '../components/FeatureCard';
import Badge from '../components/Badge';
import styles from './Landing.module.css';

const stats = [
  { value: '150+', label: 'Verified Doctors' },
  { value: '25+', label: 'Partner Hospitals' },
  { value: '10K+', label: 'Happy Patients' },
  { value: '99.8%', label: 'Accuracy Rate' },
];

const features = [
  {
    title: 'Hospital Search',
    description: 'Find verified hospitals across India based on location, specialty, pricing, and amenities.',
    icon: FiSearch,
    color: 'primary',
  },
  {
    title: 'AI Symptom Checker',
    description: 'Get immediate clinical triage suggestions and guidance on risk levels and home care.',
    icon: FiActivity,
    color: 'accent',
  },
  {
    title: 'Doctor Booking',
    description: 'Schedule simulated in-person or teleconsultation visits with top specialists.',
    icon: FiCalendar,
    color: 'success',
  },
  {
    title: 'Secure Medical Profile',
    description: 'Keep your blood pressure, heart rate, allergies, and health history structured.',
    icon: FiShield,
    color: 'warning',
  },
  {
    title: '24/7 Emergency Support',
    description: 'Instant triage alerts and directions to emergency departments for critical cases.',
    icon: FiAlertCircle,
    color: 'danger',
  },
];

const steps = [
  {
    num: '01',
    title: 'Describe Symptoms',
    desc: 'Input your concerns naturally in plain English (e.g. "fever and throat pain for 2 days").',
  },
  {
    num: '02',
    title: 'AI Analysis',
    desc: 'Our engine structures your symptoms, assesses risk levels, and identifies possible conditions.',
  },
  {
    num: '03',
    title: 'Match Specialist',
    desc: 'We map your triage summary to recommended departments (like Cardiology, ENT, or Pediatrics).',
  },
  {
    num: '04',
    title: 'Book Appointment',
    desc: 'Select a nearby partner hospital, select an available doctor, and reserve your slot instantly.',
  },
];

const testimonials = [
  {
    quote: "The symptom checker accurately flagged my throat issue and directed me to a nearby ENT clinic. Booking was seamless!",
    author: "Amit Sharma",
    role: "Verified Patient, Delhi",
    rating: 5,
  },
  {
    quote: "As a demo for a medical app, the integration of AI-assisted triage with real hospital slots is extremely polished.",
    author: "Dr. Sandeep Nair",
    role: "Advisory Consultant, Bengaluru",
    rating: 5,
  },
  {
    quote: "Excellent UI/UX. The split-screen profile, emergency markers, and responsive layouts feel highly professional.",
    author: "Ritu Goel",
    role: "Healthcare Product Designer, Mumbai",
    rating: 5,
  },
];

const faqs = [
  {
    q: 'How accurate is the CarePlus AI Symptom Checker?',
    a: 'CarePlus uses deterministic NLP modeling to extract symptoms and cross-reference them with typical clinical categories. It is designed to act as a triage support system and always suggests speaking with a qualified doctor for actual medical diagnosis.',
  },
  {
    q: 'Are the hospitals and doctor bookings real?',
    a: 'The clinics, doctors, and slots are simulated to provide a fully functioning end-to-end patient workflow demonstration, storing the reservations in the backend database.',
  },
  {
    q: 'How does the triage risk level work?',
    a: 'The system categorizes risk into High, Medium, or Low. High-risk symptoms display warning badges and direct you to emergency services immediately, while lower-risk issues suggest primary care and home-care advice.',
  },
  {
    q: 'Can I update my health profile later?',
    a: 'Yes, your age, weight, height, heart rate, blood pressure, and existing allergies can be edited at any time via the Health Profile tab. This data dynamically updates your BMI and symptom risk scoring context.',
  },
];

function Landing() {
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className={styles.page}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroGrid}>
            <motion.div
              className={styles.heroCopy}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className={styles.kicker}>
                <span className={styles.kickerDot} />
                <span>AI-Powered Patient Triage</span>
              </div>
              <h1 className={styles.heroTitle}>
                Your Intelligent Healthcare Companion
              </h1>
              <p className={styles.heroSubtitle}>
                Describe symptoms, understand urgency, discover India's top clinics, and coordinate doctor consultations within a singular premium workspace.
              </p>
              <div className={styles.ctaRow}>
                <Link className="btn btn-primary" to="/symptom-checker">
                  Check Symptoms <FiArrowRight />
                </Link>
                <Link className="btn btn-secondary" to="/hospitals">
                  Find Hospitals
                </Link>
              </div>

              {/* Statistics Grid */}
              <div className={styles.statsGrid}>
                {stats.map((stat, i) => (
                  <div className={styles.statItem} key={i}>
                    <strong className={styles.statVal}>{stat.value}</strong>
                    <span className={styles.statLabel}>{stat.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Premium Interactive Illustration */}
            <motion.div
              className={styles.heroVisual}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {/* Main SVG/Card Mockup */}
              <div className={styles.mockupContainer}>
                {/* Floating Widget 1 */}
                <motion.div
                  className={`${styles.floatingWidget} ${styles.widgetTriage}`}
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                >
                  <div className={styles.widgetIcon} style={{ background: 'var(--cp-danger-light)', color: 'var(--cp-danger)' }}>
                    <FiAlertCircle />
                  </div>
                  <div>
                    <strong>Symptom Triage</strong>
                    <span>Risk Level: High</span>
                  </div>
                </motion.div>

                {/* Floating Widget 2 */}
                <motion.div
                  className={`${styles.floatingWidget} ${styles.widgetVitals}`}
                  animate={{ y: [0, 8, 0] }}
                  transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 0.5 }}
                >
                  <div className={styles.widgetIcon} style={{ background: 'var(--cp-success-light)', color: 'var(--cp-success)' }}>
                    <FiTrendingUp />
                  </div>
                  <div>
                    <strong>Normal Vitals</strong>
                    <span>BP 120/80 · Pulse 72</span>
                  </div>
                </motion.div>

                {/* Simulated Hospital UI */}
                <div className={styles.mockupHeader}>
                  <span className={styles.mockupDot} />
                  <span className={styles.mockupDot} />
                  <span className={styles.mockupDot} />
                </div>
                <div className={styles.mockupBody}>
                  <div className={styles.mockupRow}>
                    <div className={styles.mockupAvatar} />
                    <div className={styles.mockupLines}>
                      <div className={styles.lineLong} />
                      <div className={styles.lineShort} />
                    </div>
                  </div>
                  <div className={styles.mockupPulse}>
                    <svg viewBox="0 0 100 30" className={styles.pulseSvg}>
                      <path
                        d="M0,15 L30,15 L35,5 L40,25 L45,15 L50,15 L53,10 L56,20 L59,15 L100,15"
                        fill="none"
                        stroke="var(--cp-primary)"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                  <div className={styles.mockupFooter}>
                    <span>Analyzing...</span>
                    <Badge variant="teal">AI Check Active</Badge>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section className={styles.sectionFeatures}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <Badge variant="teal" style={{ marginBottom: '1rem' }}>Key Modules</Badge>
            <h2 className={styles.sectionTitle}>Everything You Need to Navigate Care</h2>
            <p className={styles.sectionSubtitle}>
              Connect clinical understanding to actionable steps. Compare, book, and preserve health continuity.
            </p>
          </div>

          <div className={styles.featuresGrid}>
            {features.map((feature) => (
              <FeatureCard
                key={feature.title}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
                color={feature.color}
              />
            ))}
          </div>
        </div>
      </section>

      {/* How it Works timeline */}
      <section className={styles.sectionHow}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <Badge variant="primary" style={{ marginBottom: '1rem' }}>Patient Journey</Badge>
            <h2 className={styles.sectionTitle}>How CarePlus Simplifies Triaging</h2>
          </div>

          <div className={styles.howTimeline}>
            {steps.map((step, idx) => (
              <motion.div
                className={styles.timelineItem}
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <span className={styles.timelineNum}>{step.num}</span>
                <h3 className={styles.timelineTitle}>{step.title}</h3>
                <p className={styles.timelineDesc}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className={styles.sectionTestimonials}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <Badge variant="teal" style={{ marginBottom: '1rem' }}>User Feedback</Badge>
            <h2 className={styles.sectionTitle}>What Patients Say About CarePlus</h2>
          </div>

          <div className={styles.testimonialsGrid}>
            {testimonials.map((t, idx) => (
              <div className={styles.testimonialCard} key={idx}>
                <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '1rem', color: '#F59E0B' }}>
                  {[...Array(t.rating)].map((_, i) => (
                    <FiStar key={i} fill="#F59E0B" size={16} />
                  ))}
                </div>
                <p className={styles.testimonialQuote}>"{t.quote}"</p>
                <div>
                  <strong className={styles.testimonialAuthor}>{t.author}</strong>
                  <span className={styles.testimonialRole}>{t.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partner Hospitals */}
      <section className={styles.sectionPartners}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--cp-subtext)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Simulated Hospital Partners in Major Indian Cities
            </span>
          </div>
          <div className={styles.partnersWrap}>
            <span>Apollo Hospitals</span>
            <span>Fortis Healthcare</span>
            <span>Narayana Health City</span>
            <span>Max Healthcare</span>
            <span>Medanta Medicity</span>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className={styles.sectionFaq}>
        <div className="container">
          <div className={styles.faqLayout}>
            <div className={styles.faqCopy}>
              <Badge variant="primary" style={{ marginBottom: '1rem' }}>Support Hub</Badge>
              <h2 className={styles.sectionTitle} style={{ textAlign: 'left' }}>Frequently Asked Questions</h2>
              <p style={{ color: 'var(--cp-subtext)', lineHeight: '1.6', marginTop: '1rem' }}>
                Need help understanding our clinical flows or Simulated database entries? Review our guide or contact support.
              </p>
            </div>

            <div className={styles.faqAccordion}>
              {faqs.map((faq, idx) => (
                <div
                  className={`${styles.faqItem} ${activeFaq === idx ? styles.faqActive : ''}`}
                  key={idx}
                  onClick={() => toggleFaq(idx)}
                >
                  <div className={styles.faqHeader}>
                    <span>{faq.q}</span>
                    <FiChevronDown className={styles.faqChevron} />
                  </div>
                  <div className={styles.faqAnswer}>
                    <p>{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Landing;
