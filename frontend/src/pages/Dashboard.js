import React, { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiUser,
  FiActivity,
  FiHeart,
  FiCalendar,
  FiPlusCircle,
  FiShield,
  FiArrowRight,
  FiAlertCircle,
  FiThermometer,
  FiClock
} from 'react-icons/fi';
import { getApiErrorMessage, getHealthProfile, getAppointments } from '../services/api';
import Badge from '../components/Badge';
import { Spinner } from '../components/Loader';
import styles from './Dashboard.module.css';

const LAST_RESULT_KEY = 'careplus_last_symptom_result';
const riskColorMap = {
  HIGH: '#EF4444',
  MEDIUM: '#F59E0B',
  LOW: '#10B981',
};

// Helper functions for appointments validation & countdown
function getTodayValue() {
  const today = new Date();
  const timezoneOffset = today.getTimezoneOffset() * 60000;
  return new Date(today.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function parseTimeSlot(slot) {
  const match = /^(\d{1,2}):(\d{2})\s?(AM|PM)$/i.exec(String(slot).trim());
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return { hours, minutes };
}

function isPastAppointment(appointmentDate, timeSlot) {
  if (!appointmentDate) return false;

  const todayValue = getTodayValue();
  if (appointmentDate < todayValue) return true;
  if (appointmentDate > todayValue) return false;

  const parsed = parseTimeSlot(timeSlot);
  if (!parsed) return false;

  const now = new Date();
  const selected = new Date();
  selected.setHours(parsed.hours, parsed.minutes, 0, 0);
  return selected <= now;
}

function getCountdown(appointmentDate, timeSlot) {
  if (!appointmentDate || !timeSlot) return '';
  const parsed = parseTimeSlot(timeSlot);
  if (!parsed) return '';

  const now = new Date();
  const aptTime = new Date(appointmentDate);
  aptTime.setHours(parsed.hours, parsed.minutes, 0, 0);

  const diffMs = aptTime - now;
  if (diffMs <= 0) return 'Passed';

  const diffSecs = Math.floor(diffMs / 1000);
  const days = Math.floor(diffSecs / 86400);
  const hours = Math.floor((diffSecs % 86400) / 3600);
  const mins = Math.floor((diffSecs % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);

  return parts.length > 0 ? parts.join(' ') : 'Less than a minute';
}

const quickActions = [
  {
    title: 'Check Symptoms',
    desc: 'Describe symptoms to get immediate AI-based triage advice.',
    path: '/symptom-checker',
    icon: FiActivity,
    color: 'accent',
  },
  {
    title: 'Book Doctor',
    desc: 'Schedule a consultation at a simulated clinic.',
    path: '/appointments',
    icon: FiCalendar,
    color: 'primary',
  },
  {
    title: 'Nearby Hospitals',
    desc: 'Browse medical institutions across major cities.',
    path: '/hospitals',
    icon: FiPlusCircle,
    color: 'success',
  },
];

function formatConditions(value) {
  if (Array.isArray(value) && value.length > 0) {
    return value.join(', ');
  }
  return 'None reported';
}

function Dashboard({ user }) {
  const [profile, setProfile] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const riskColor = useMemo(() => {
    const level = String(lastResult?.risk_level || '').toUpperCase();
    return riskColorMap[level] || 'var(--cp-text)';
  }, [lastResult]);

  // Dynamically calculate health score based on profile metrics
  const healthScore = useMemo(() => {
    if (!profile) return 65; // Base default score
    let score = 75;
    
    // BP check
    if (profile.blood_pressure) {
      const parts = profile.blood_pressure.split('/');
      const sys = Number(parts[0]);
      const dia = Number(parts[1]);
      if (sys && dia) {
        if (sys > 130 || dia > 85) score -= 10;
        else if (sys <= 120 && dia <= 80) score += 10;
      }
    }
    
    // Heart rate check
    if (profile.heart_rate) {
      const hr = Number(profile.heart_rate);
      if (hr < 60 || hr > 100) score -= 5;
      else score += 5;
    }

    // Conditions check
    if (profile.existing_conditions && profile.existing_conditions.length > 0) {
      score -= Math.min(profile.existing_conditions.length * 8, 25);
    }

    // BMI check
    const bmi = Number(profile.bmi);
    if (bmi) {
      if (bmi < 18.5 || bmi > 25.0) score -= 5;
      else score += 5;
    }

    return Math.max(10, Math.min(100, score));
  }, [profile]);

  const categorizedAppointments = useMemo(() => {
    return appointments.map((apt) => {
      const isPast = isPastAppointment(apt.appointment_date, apt.time_slot);
      let status = apt.status;
      if (isPast && (status === 'upcoming' || status === 'rescheduled')) {
        status = 'completed';
      }
      return { ...apt, status };
    });
  }, [appointments]);

  const upcomingAppointments = useMemo(() => {
    return categorizedAppointments.filter((apt) => apt.status === 'upcoming' || apt.status === 'rescheduled');
  }, [categorizedAppointments]);

  const completedAppointments = useMemo(() => {
    return categorizedAppointments.filter((apt) => apt.status === 'completed');
  }, [categorizedAppointments]);

  const cancelledAppointments = useMemo(() => {
    return categorizedAppointments.filter((apt) => apt.status === 'cancelled');
  }, [categorizedAppointments]);

  // Find next upcoming appointment
  const nextAppointment = useMemo(() => {
    if (upcomingAppointments.length === 0) return null;
    const sorted = [...upcomingAppointments].sort((a, b) => {
      const dateA = a.appointment_date + ' ' + a.time_slot;
      const dateB = b.appointment_date + ' ' + b.time_slot;
      return dateA.localeCompare(dateB);
    });
    return sorted[0];
  }, [upcomingAppointments]);

  const [countdownText, setCountdownText] = useState('');

  useEffect(() => {
    if (!nextAppointment) {
      setCountdownText('');
      return;
    }

    const updateCountdown = () => {
      const cd = getCountdown(nextAppointment.appointment_date, nextAppointment.time_slot);
      setCountdownText(cd === 'Passed' ? 'Happening now' : cd);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [nextAppointment]);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [profileResponse, appointmentResponse] = await Promise.all([getHealthProfile(), getAppointments()]);
        if (!isMounted) return;

        setProfile(profileResponse || null);
        setAppointments(appointmentResponse || []);

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
        if (!isMounted) return;
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

  const getHealthScoreColor = (score) => {
    if (score >= 85) return 'var(--cp-success)';
    if (score >= 60) return 'var(--cp-warning)';
    return 'var(--cp-danger)';
  };

  return (
    <section className={styles.wrapper}>
      <div className="container">
        {/* Welcome Row */}
        <div className={styles.welcomeRow}>
          <div>
            <h1 className={styles.title}>
              Good day, {user?.name || 'Patient'}
            </h1>
            <p className={styles.subtitle}>
              Monitor your vitals, check symptoms, and book medical appointments instantly.
            </p>
            <div className={styles.metaRow}>
              <span>Email: <strong>{user?.email || 'N/A'}</strong></span>
              <span>·</span>
              <span>Role: <strong style={{ textTransform: 'capitalize' }}>{user?.role || 'patient'}</strong></span>
            </div>
          </div>
          
          <RouterLink to="/profile" className={styles.avatarCard}>
            <div className={styles.avatarCircle}>
              <FiUser size={24} />
            </div>
            <div>
              <strong>View Profile</strong>
              <span>Update metrics</span>
            </div>
          </RouterLink>
        </div>

        {errorMessage ? <p className="alert alertError"><FiAlertCircle /> {errorMessage}</p> : null}

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Spinner size="3rem" />
          </div>
        ) : (
          <div className={styles.dashboardGrid}>
            {/* Left side: Health score + quick actions */}
            <div className={styles.leftCol}>
              {/* Health score speedometer widget */}
              <motion.div
                className={styles.card}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h3 className={styles.cardTitle}>Vitals Score</h3>
                <div className={styles.scoreContainer}>
                  <div className={styles.gaugeWrapper}>
                    {/* SVG Gauge */}
                    <svg viewBox="0 0 100 50" className={styles.gaugeSvg}>
                      <path
                        d="M 10 50 A 40 40 0 0 1 90 50"
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                      <motion.path
                        d="M 10 50 A 40 40 0 0 1 90 50"
                        fill="none"
                        stroke={getHealthScoreColor(healthScore)}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray="126"
                        initial={{ strokeDashoffset: 126 }}
                        animate={{ strokeDashoffset: 126 - (126 * healthScore) / 100 }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                    </svg>
                    <div className={styles.scoreText}>
                      <span className={styles.scoreNum}>{healthScore}</span>
                      <span className={styles.scoreMax}>/100</span>
                    </div>
                  </div>
                  <div className={styles.scoreRating}>
                    <strong>
                      {healthScore >= 85 ? 'Excellent Health Metrics' : healthScore >= 60 ? 'Optimal Condition' : 'Needs Review'}
                    </strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--cp-subtext)', textAlign: 'center', display: 'block', marginTop: '0.25rem' }}>
                      Based on weight, height, existing conditions, and bp.
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Quick Actions */}
              <div className={styles.actionsGrid}>
                {quickActions.map((action, idx) => {
                  const Icon = action.icon;
                  const getAccentColor = () => {
                    if (action.color === 'accent') return 'var(--cp-accent)';
                    if (action.color === 'success') return 'var(--cp-success)';
                    return 'var(--cp-primary)';
                  };

                  return (
                    <motion.div
                      key={idx}
                      whileHover={{ y: -4, boxShadow: 'var(--shadow-hover)' }}
                      className={styles.actionCard}
                    >
                      <RouterLink to={action.path} className={styles.actionLink}>
                        <div
                          className={styles.actionIcon}
                          style={{
                            background: action.color === 'accent' ? 'var(--cp-accent-light)' : action.color === 'success' ? 'var(--cp-success-light)' : 'var(--cp-primary-light)',
                            color: getAccentColor()
                          }}
                        >
                          <Icon size={20} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{action.title}</h4>
                          <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: 'var(--cp-subtext)', lineHeight: '1.4' }}>{action.desc}</p>
                        </div>
                        <FiArrowRight className={styles.actionArrow} size={16} />
                      </RouterLink>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Right side: Vitals details + Last symptom analysis */}
            <div className={styles.rightCol}>
              {/* Health Profile summary details */}
              <motion.div
                className={styles.card}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 className={styles.cardTitle} style={{ marginBottom: 0 }}>Patient Vitals</h3>
                  <RouterLink className="btn btn-secondary" to="/health-profile" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}>
                    Edit Profile
                  </RouterLink>
                </div>

                {profile ? (
                  <div className={styles.vitalsGrid}>
                    <div className={styles.vitalItem}>
                      <span className={styles.vitalLabel}>Age</span>
                      <strong className={styles.vitalVal}>{profile.age ?? 'N/A'} yrs</strong>
                    </div>
                    <div className={styles.vitalItem}>
                      <span className={styles.vitalLabel}>Gender</span>
                      <strong className={styles.vitalVal} style={{ textTransform: 'capitalize' }}>{profile.gender || 'N/A'}</strong>
                    </div>
                    <div className={styles.vitalItem}>
                      <span className={styles.vitalLabel}>Height / Weight</span>
                      <strong className={styles.vitalVal}>{profile.height_cm ?? 'N/A'} cm / {profile.weight_kg ?? 'N/A'} kg</strong>
                    </div>
                    <div className={styles.vitalItem}>
                      <span className={styles.vitalLabel}>Blood Pressure</span>
                      <strong className={styles.vitalVal}>{profile.blood_pressure || 'Not provided'}</strong>
                    </div>
                    <div className={styles.vitalItem}>
                      <span className={styles.vitalLabel}>Heart Rate</span>
                      <strong className={styles.vitalVal}>{profile.heart_rate ? `${profile.heart_rate} bpm` : 'Not provided'}</strong>
                    </div>
                    <div className={styles.vitalItem}>
                      <span className={styles.vitalLabel}>BMI Score</span>
                      <strong className={styles.vitalVal}>
                        {profile.bmi ?? 'N/A'}{' '}
                        {profile.bmi && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: profile.bmi > 25 ? 'var(--cp-danger)' : 'var(--cp-success)' }}>
                            ({profile.bmi > 25 ? 'Overweight' : profile.bmi < 18.5 ? 'Underweight' : 'Normal'})
                          </span>
                        )}
                      </strong>
                    </div>
                    <div className={styles.vitalItem} style={{ gridColumn: 'span 2' }}>
                      <span className={styles.vitalLabel}>Existing Conditions</span>
                      <strong className={styles.vitalVal}>{formatConditions(profile.existing_conditions)}</strong>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--cp-subtext)' }}>
                    <p style={{ marginBottom: '1rem' }}>No health profile metrics found yet.</p>
                    <RouterLink className="btn btn-primary" to="/health-profile">
                      Create Health Profile
                    </RouterLink>
                  </div>
                )}
              </motion.div>

              {/* Last Symptom Analysis */}
              <motion.div
                className={styles.card}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <h3 className={styles.cardTitle}>Last Symptom Analysis</h3>
                {lastResult ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Badge style={{ color: riskColor, borderColor: riskColor, background: `${riskColor}10` }}>
                        Risk Level: {lastResult.risk_level}
                      </Badge>
                      <span style={{ fontSize: '0.85rem', color: 'var(--cp-subtext)' }}>
                        Confidence: {Math.round(Number(lastResult.confidence || 0) * 100)}%
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--cp-text)', lineHeight: '1.5' }}>
                      {lastResult.analysis_summary || lastResult.recommendation}
                    </p>
                    
                    {lastResult.recommended_specialist && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'var(--cp-primary-light)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', width: 'fit-content' }}>
                        <FiThermometer size={14} style={{ color: 'var(--cp-primary)' }} />
                        <span style={{ fontSize: '0.85rem', color: 'var(--cp-primary)', fontWeight: 600 }}>
                          Recommended Specialist: {lastResult.recommended_specialist}
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <RouterLink className="btn btn-primary" to="/appointments" style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem' }}>
                        Book Consultant
                      </RouterLink>
                      <RouterLink className="btn btn-secondary" to="/symptom-checker" style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem' }}>
                        Re-evaluate Symptoms
                      </RouterLink>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--cp-subtext)' }}>
                    <p style={{ marginBottom: '1rem' }}>No recent AI-triage symptom log available.</p>
                    <RouterLink className="btn btn-primary" to="/symptom-checker">
                      Evaluate Symptoms
                    </RouterLink>
                  </div>
                )}
              </motion.div>

              {/* Smart Appointments Hub Card */}
              <motion.div
                className={styles.card}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 className={styles.cardTitle} style={{ marginBottom: 0 }}>Appointments Hub</h3>
                  <RouterLink className="btn btn-secondary" to="/appointments" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}>
                    Book New
                  </RouterLink>
                </div>

                {/* Next Appointment Countdown */}
                {nextAppointment ? (
                  <div
                    style={{
                      background: 'var(--cp-primary-light)',
                      border: '1px solid rgba(37, 99, 235, 0.15)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      marginBottom: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'var(--cp-primary)',
                        color: 'var(--cp-white)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FiClock size={20} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--cp-primary)', fontWeight: 600, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Next Consultation Countdown
                      </span>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--cp-text)', display: 'block', marginTop: '0.1rem' }}>
                        {nextAppointment.doctor_name} in <span style={{ color: 'var(--cp-primary)' }}>{countdownText || 'Calculating...'}</span>
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--cp-subtext)' }}>
                        {nextAppointment.appointment_date} · {nextAppointment.time_slot} ({nextAppointment.hospital_name})
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: 'var(--cp-bg)', border: '1px solid var(--cp-border)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--cp-subtext)', textAlign: 'center' }}>
                    No upcoming consultations scheduled.
                  </div>
                )}

                {/* Categorized Counters */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: 'var(--cp-bg)', border: '1px solid var(--cp-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--cp-subtext)', display: 'block', fontWeight: 500 }}>Upcoming</span>
                    <strong style={{ fontSize: '1.4rem', color: 'var(--cp-success)', fontFamily: 'var(--font-display)', display: 'block', marginTop: '0.2rem' }}>
                      {upcomingAppointments.length}
                    </strong>
                  </div>
                  <div style={{ background: 'var(--cp-bg)', border: '1px solid var(--cp-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--cp-subtext)', display: 'block', fontWeight: 500 }}>Completed</span>
                    <strong style={{ fontSize: '1.4rem', color: 'var(--cp-primary)', fontFamily: 'var(--font-display)', display: 'block', marginTop: '0.2rem' }}>
                      {completedAppointments.length}
                    </strong>
                  </div>
                  <div style={{ background: 'var(--cp-bg)', border: '1px solid var(--cp-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--cp-subtext)', display: 'block', fontWeight: 500 }}>Cancelled</span>
                    <strong style={{ fontSize: '1.4rem', color: 'var(--cp-danger)', fontFamily: 'var(--font-display)', display: 'block', marginTop: '0.2rem' }}>
                      {cancelledAppointments.length}
                    </strong>
                  </div>
                </div>

                {/* Recent Appointment History */}
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.75rem 0', color: 'var(--cp-text)' }}>
                  Recent Booking History
                </h4>
                {categorizedAppointments.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--cp-subtext)', fontStyle: 'italic' }}>
                    No previous appointments found.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                    {categorizedAppointments.slice(0, 4).map((apt, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.6rem 0.75rem',
                          background: 'var(--cp-bg)',
                          border: '1px solid var(--cp-border)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8rem',
                        }}
                      >
                        <div>
                          <strong style={{ color: 'var(--cp-text)' }}>{apt.doctor_name}</strong>
                          <span style={{ color: 'var(--cp-subtext)', display: 'block', fontSize: '0.75rem' }}>
                            {apt.appointment_date} · {apt.time_slot}
                          </span>
                        </div>
                        <Badge variant={apt.status === 'completed' ? 'teal' : apt.status === 'cancelled' ? 'danger' : 'success'}>
                          {apt.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default Dashboard;
