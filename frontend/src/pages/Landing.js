import React from 'react';
import { Link } from 'react-router-dom';

import styles from './Landing.module.css';

const categories = [
  'General Physician',
  'Cardiology',
  'Neurology',
  'Dermatology',
  'Pulmonology',
  'Orthopedics',
  'Pediatrics',
  'Mental Health',
];

const features = [
  ['AI Symptom Checker', 'Structured symptom extraction, risk level, confidence and safety guidance.'],
  ['Hospital Recommendation', 'Relevant simulated hospitals based on specialty, department and triage context.'],
  ['Appointment Booking', 'Choose hospital, doctor, date and time with booking history and cancellation.'],
  ['Health Profile', 'Preserve existing patient profile workflow for personalized analysis context.'],
];

function Landing() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.kicker}>Healthcare guidance for everyday decisions</p>
              <h1 className={styles.heroTitle}>CarePlus</h1>
              <p className={styles.heroSubtitle}>
                Analyze symptoms, understand urgency, find the right specialist and book a simulated appointment in one
                clean medical workflow.
              </p>
              <div className={styles.ctaRow}>
                <Link className={styles.primaryButton} to="/symptom-checker">
                  Start Symptom Check
                </Link>
                <Link className={styles.secondaryButton} to="/hospitals">
                  View Hospitals
                </Link>
              </div>
            </div>
            <div className={styles.heroVisual} aria-label="Medical assistant illustration">
              <div className={styles.doctorBadge}>AI Triage</div>
              <div className={styles.vitalsPanel}>
                <span>Risk</span>
                <strong>Low to High</strong>
              </div>
              <div className={styles.medicalCross}>+</div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className="container">
          <div className={styles.stats}>
            <div><strong>30+</strong><span>Specialties</span></div>
            <div><strong>5</strong><span>Indian cities</span></div>
            <div><strong>24x7</strong><span>Emergency mapping</span></div>
            <div><strong>100%</strong><span>Simulated booking</span></div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className="container">
          <p className={styles.kicker}>Why CarePlus</p>
          <h2 className={styles.sectionTitle}>Professional healthcare flow for a final-year project</h2>
          <div className={styles.grid}>
            {features.map(([title, description]) => (
              <article className={styles.card} key={title}>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className="container">
          <p className={styles.kicker}>Healthcare categories</p>
          <div className={styles.categoryWrap}>
            {categories.map((category) => (
              <span className={styles.category} key={category}>
                {category}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className="container">
          <div className={styles.howItWorks}>
            {['Describe symptoms', 'Review structured guidance', 'Choose hospital', 'Book appointment'].map(
              (step, index) => (
                <div key={step}>
                  <span>{index + 1}</span>
                  <strong>{step}</strong>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className="container">
          <div className={styles.testimonials}>
            {[
              'The flow from symptoms to appointment feels clear and realistic.',
              'The structured analysis is easy to present in a project demo.',
              'Hospital cards and booking history make the app feel complete.',
            ].map((quote) => (
              <blockquote key={quote}>{quote}</blockquote>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Landing;
