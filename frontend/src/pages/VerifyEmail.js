import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiArrowLeft, FiCheckCircle, FiAlertTriangle, FiClock } from 'react-icons/fi';

import { verifyEmail, resendVerification, getApiErrorMessage } from '../services/api';
import { Spinner } from '../components/Loader';
import styles from './Auth.module.css';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // States for manual token input or resending verification email
  const [email, setEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [resendError, setResendError] = useState('');

  useEffect(() => {
    async function performVerification() {
      if (!token) return;
      
      setLoading(true);
      setError('');
      setSuccess('');
      
      try {
        const response = await verifyEmail({ token });
        setSuccess(response?.message || 'Email verified successfully! You can now sign in.');
      } catch (err) {
        setError(getApiErrorMessage(err, 'Verification failed. The token may be invalid or expired.'));
      } finally {
        setLoading(false);
      }
    }
    
    performVerification();
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    setResendError('');
    setResendSuccess('');

    const trimmedEmail = email.trim();
    if (!emailRegex.test(trimmedEmail)) {
      setResendError('Please enter a valid email address.');
      return;
    }

    setResendLoading(true);
    try {
      const response = await resendVerification(trimmedEmail);
      setResendSuccess(response?.message || 'A new verification link has been sent if the email is registered.');
      setEmail('');
    } catch (err) {
      setResendError(getApiErrorMessage(err, 'Failed to resend verification email.'));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <section className={styles.splitWrapper}>
      {/* Left panel: Healthcare visual */}
      <div className={styles.visualPanel}>
        <div className={styles.visualGlow1} />
        <div className={styles.visualGlow2} />
        
        <div className={styles.visualContent}>
          <div className={styles.brandIcon}>+</div>
          <h2 className={styles.visualTitle}>Email Verification</h2>
          <p className={styles.visualText}>
            Activate your secure CarePlus Medical workspace. Verification ensures the privacy and security of your personal health metrics.
          </p>

          <div className={styles.vitalsList}>
            <div className={styles.vitalCard}>
              <FiCheckCircle style={{ color: 'var(--cp-success)', flexShrink: 0 }} />
              <span>Verify account email authenticity</span>
            </div>
            <div className={styles.vitalCard}>
              <FiClock style={{ color: 'var(--cp-success)', flexShrink: 0 }} />
              <span>Links valid for 24 hours</span>
            </div>
            <div className={styles.vitalCard}>
              <FiMail style={{ color: 'var(--cp-success)', flexShrink: 0 }} />
              <span>One-click account activation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel: Verification Form/Status */}
      <div className={styles.formPanel}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={styles.glassCard}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Link to="/login" style={{ color: 'var(--cp-subtext)', display: 'flex', alignItems: 'center' }}>
              <FiArrowLeft size={18} />
            </Link>
            <span style={{ fontSize: '0.85rem', color: 'var(--cp-subtext)', fontWeight: 600 }}>Back to Login</span>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <h1 className={styles.title} style={{ fontSize: '1.75rem' }}>Account Activation</h1>
            <p className={styles.subtitle}>Verifying and activating your CarePlus patient account.</p>
          </div>

          {token ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <Spinner size="2.5rem" />
                  <p style={{ color: 'var(--cp-text)', fontWeight: 500 }}>Activating your account...</p>
                </div>
              ) : success ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <FiCheckCircle size={54} style={{ color: 'var(--cp-success)' }} />
                  <p className="alert alertSuccess" style={{ width: '100%' }}>{success}</p>
                  <Link to="/login" className={styles.submitButton} style={{ width: '100%', textDecoration: 'none' }}>
                    Proceed to Login
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <FiAlertTriangle size={54} style={{ color: 'var(--cp-danger)' }} />
                  <p className="alert alertError" style={{ width: '100%' }}>{error}</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--cp-subtext)', margin: '0.5rem 0 1rem 0' }}>
                    The link may have expired or is invalid. You can request a new verification link below.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <FiMail size={54} style={{ color: 'var(--cp-primary)', marginBottom: '1rem' }} />
              <p style={{ color: 'var(--cp-text)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                Please check your inbox for a verification email containing your activation link. If you didn't receive it, request a new link below.
              </p>
            </div>
          )}

          {/* Resend Verification Section */}
          {(!token || (!loading && error)) && (
            <div style={{
              marginTop: '1.5rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--cp-border)'
            }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--cp-text)', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '0.75rem' }}>
                Resend Activation Link
              </h3>
              
              {resendError ? <p className="alert alertError">{resendError}</p> : null}
              {resendSuccess ? <p className="alert alertSuccess">{resendSuccess}</p> : null}

              <form onSubmit={handleResend} className={styles.form}>
                <div className={styles.inputGroup}>
                  <label className={styles.label} htmlFor="resend-email">
                    Registered Email
                  </label>
                  <div className={styles.inputWrapper}>
                    <FiMail className={styles.inputIcon} />
                    <input
                      autoComplete="email"
                      className={styles.input}
                      id="resend-email"
                      name="email"
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@careplus.com"
                      required
                      type="email"
                      value={email}
                      disabled={resendLoading}
                    />
                  </div>
                </div>

                <button className={styles.submitButton} disabled={resendLoading} type="submit">
                  {resendLoading ? 'Sending link...' : 'Send Verification Link'}
                </button>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

export default VerifyEmail;
