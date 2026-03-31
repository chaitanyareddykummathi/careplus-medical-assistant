import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import styles from './Dashboard.module.css';
import { getApiErrorMessage, getHealthProfile } from '../services/api';

const LAST_RESULT_KEY = 'careplus_last_symptom_result';

const cardsGridStyle = {
  display: 'grid',
  gap: '0.75rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  marginTop: '0.9rem',
};

const cardItemStyle = {
  background: 'var(--cp-surface-soft)',
  border: '1px solid var(--cp-border)',
  borderRadius: '12px',
  padding: '0.8rem',
};

const actionsRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.7rem',
  marginTop: '0.95rem',
};

const primaryButtonStyle = {
  background: 'var(--cp-primary)',
  border: 'none',
  borderRadius: '10px',
  color: '#fff',
  cursor: 'pointer',
  fontSize: '0.94rem',
  fontWeight: 700,
  padding: '0.65rem 0.95rem',
  textDecoration: 'none',
};

const secondaryButtonStyle = {
  background: 'transparent',
  border: '1px solid var(--cp-border)',
  borderRadius: '10px',
  color: 'var(--cp-text)',
  cursor: 'pointer',
  fontSize: '0.94rem',
  fontWeight: 700,
  padding: '0.65rem 0.95rem',
  textDecoration: 'none',
};

const resultCardStyle = {
  border: '1px solid var(--cp-border)',
  borderRadius: '12px',
  marginTop: '1rem',
  padding: '0.95rem',
};

const riskColorMap = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#22c55e',
};

function formatConditions(value) {
  if (Array.isArray(value) && value.length > 0) {
    return value.join(', ');
  }
  return 'Not provided';
}

function Dashboard({ user }) {
  const [profile, setProfile] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const riskColor = useMemo(() => {
    const level = String(lastResult?.risk_level || '').toUpperCase();
    return riskColorMap[level] || 'var(--cp-text)';
  }, [lastResult]);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [profileResponse] = await Promise.all([getHealthProfile()]);
        if (!isMounted) {
          return;
        }

        setProfile(profileResponse || null);

        const storedResult = localStorage.getItem(LAST_RESULT_KEY);
        if (storedResult) {
          try {
            setLastResult(JSON.parse(storedResult));
          } catch {
            setLastResult(null);
          }
        } else {
          setLastResult(null);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }
        console.error('[Dashboard] Failed to load dashboard data', error);
        setErrorMessage(getApiErrorMessage(error, 'Unable to load dashboard details.'));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className={styles.wrapper}>
      <div className="container">
        <div className={styles.card}>
          <h1 className={styles.title}>Patient Dashboard</h1>
          <p className={styles.subtitle}>
            {user?.name ? `Welcome, ${user.name}.` : 'Welcome.'} Manage your health profile and run
            AI-based symptom checks.
          </p>

          <div className={styles.metaRow}>
            <span>Email: {user?.email || 'Not available'}</span>
            <span>Role: {user?.role || 'patient'}</span>
          </div>

          <div style={actionsRowStyle}>
            <Link style={primaryButtonStyle} to="/health-profile">
              Update Health Profile
            </Link>
            <Link style={secondaryButtonStyle} to="/symptom-checker">
              Check Symptoms
            </Link>
          </div>

          {errorMessage ? <p className="alert alertError">{errorMessage}</p> : null}

          {isLoading ? (
            <p className={styles.subtitle}>Loading dashboard data...</p>
          ) : (
            <>
              <div style={resultCardStyle}>
                <h2 className={styles.sectionTitle}>Health Profile Summary</h2>
                {profile ? (
                  <div style={cardsGridStyle}>
                    <div style={cardItemStyle}>
                      <strong>Age / Gender</strong>
                      <p>
                        {profile.age ?? 'N/A'} / {profile.gender || 'N/A'}
                      </p>
                    </div>
                    <div style={cardItemStyle}>
                      <strong>Height / Weight</strong>
                      <p>
                        {profile.height_cm ?? 'N/A'} cm / {profile.weight_kg ?? 'N/A'} kg
                      </p>
                    </div>
                    <div style={cardItemStyle}>
                      <strong>BMI</strong>
                      <p>{profile.bmi ?? 'N/A'}</p>
                    </div>
                    <div style={cardItemStyle}>
                      <strong>Blood Pressure</strong>
                      <p>{profile.blood_pressure || 'Not provided'}</p>
                    </div>
                    <div style={cardItemStyle}>
                      <strong>Heart Rate</strong>
                      <p>{profile.heart_rate || 'Not provided'}</p>
                    </div>
                    <div style={cardItemStyle}>
                      <strong>Existing Conditions</strong>
                      <p>{formatConditions(profile.existing_conditions)}</p>
                    </div>
                  </div>
                ) : (
                  <p className={styles.subtitle} style={{ marginTop: '0.7rem' }}>
                    No health profile found yet. Add your profile to improve risk predictions.
                  </p>
                )}
              </div>

              <div style={resultCardStyle}>
                <h2 className={styles.sectionTitle}>Last Symptom Analysis</h2>
                {lastResult ? (
                  <>
                    <p style={{ color: riskColor, fontWeight: 700, marginBottom: '0.4rem' }}>
                      Risk Level: {lastResult.risk_level}
                    </p>
                    <p className={styles.subtitle} style={{ marginTop: 0 }}>
                      {lastResult.recommendation}
                    </p>
                  </>
                ) : (
                  <p className={styles.subtitle} style={{ marginTop: '0.7rem' }}>
                    No previous symptom analysis found.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default Dashboard;

