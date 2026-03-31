import React from 'react';
import { Link } from 'react-router-dom';

import FeatureCard from '../components/FeatureCard';
import styles from './Landing.module.css';

const features = [
  {
    badge: 'AI',
    title: 'Symptom Checker',
    description:
      'Describe your symptoms in natural language and receive an intelligent preliminary assessment in seconds.',
  },
  {
    badge: 'Risk',
    title: 'Risk & Severity Detection',
    description:
      'Identify potential urgency levels early so users can prioritize action and avoid delays in care.',
  },
  {
    badge: 'Specialist',
    title: 'Specialist Recommendation',
    description:
      'Map symptoms to the right care path and specialist type with transparent recommendation signals.',
  },
  {
    badge: 'Booking',
    title: 'Appointment Booking',
    description:
      'Move from assessment to care in one flow by booking follow-up appointments directly in-platform.',
  },
];

function Landing() {
  return (
    <div className={styles.page}>
      <section className={styles.heroSection}>
        <div className="container">
          <div className={styles.heroLayout}>
            <div>
              <p className={styles.kicker}>Digital triage for modern healthcare delivery</p>
              <h1 className={styles.heroTitle}>AI-Powered Medical Assistant</h1>
              <p className={styles.heroSubtitle}>
                Analyze symptoms, assess risk, and connect with the right doctor instantly.
              </p>
              <div className={styles.ctaRow}>
                <Link className={styles.primaryButton} to="/register">
                  Get Started
                </Link>
                <Link className={styles.secondaryButton} to="/login">
                  Login
                </Link>
              </div>
            </div>

            <aside className={styles.heroPanel}>
              <h2>Care flow after sign-in</h2>
              <ol className={styles.flowList}>
                <li>Complete your health profile for personalized context</li>
                <li>Enter symptoms in plain language</li>
                <li>Receive AI analysis with severity and specialist matching</li>
                <li>Book an appointment with the recommended doctor</li>
              </ol>
            </aside>
          </div>
        </div>
      </section>

      <section className={styles.featureSection} id="features">
        <div className="container">
          <h2 className={styles.sectionTitle}>Core Platform Features</h2>
          <p className={styles.sectionSubtitle}>
            Built to support safer, faster, and more connected patient journeys.
          </p>

          <div className={styles.grid}>
            {features.map((feature) => (
              <FeatureCard
                key={feature.title}
                badge={feature.badge}
                description={feature.description}
                title={feature.title}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Landing;
