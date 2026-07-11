import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';

import { forgotPassword, getApiErrorMessage } from '../services/api';
import styles from './Auth.module.css';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const trimmedEmail = email.trim();
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const data = await forgotPassword(trimmedEmail);
      setSuccess(data?.message || 'If an account exists for this email, a password reset link has been sent.');
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to generate password recovery link.'));
    } finally {
      setLoading(false);
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
          <h2 className={styles.visualTitle}>Password Recovery</h2>
          <p className={styles.visualText}>
            Restore access to your secure CarePlus Medical workspace. Simply provide your registered email, and we'll issue a recovery link.
          </p>

          <div className={styles.vitalsList}>
            <div className={styles.vitalCard}>
              <FiCheckCircle style={{ color: 'var(--cp-success)', flexShrink: 0 }} />
              <span>Token-based secure confirmation</span>
            </div>
            <div className={styles.vitalCard}>
              <FiCheckCircle style={{ color: 'var(--cp-success)', flexShrink: 0 }} />
              <span>One-hour token expiry protection</span>
            </div>
            <div className={styles.vitalCard}>
              <FiCheckCircle style={{ color: 'var(--cp-success)', flexShrink: 0 }} />
              <span>Brute force and lockout protection</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel: Forgot Password form */}
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
            <h1 className={styles.title} style={{ fontSize: '1.75rem' }}>Forgot password</h1>
            <p className={styles.subtitle}>No worries! Enter email to receive a recovery token.</p>
          </div>

          {error ? <p className="alert alertError">{error}</p> : null}
          {success ? <p className="alert alertSuccess">{success}</p> : null}

          <form className={styles.form} onSubmit={handleSubmit}>
            {/* Email Input */}
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="email">
                Email Address
              </label>
              <div className={styles.inputWrapper}>
                <FiMail className={styles.inputIcon} />
                <input
                  autoComplete="email"
                  className={styles.input}
                  id="email"
                  name="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@careplus.com"
                  required
                  type="email"
                  value={email}
                  disabled={loading}
                />
              </div>
            </div>

            <button className={styles.submitButton} disabled={loading} type="submit">
              {loading ? 'Generating link...' : 'Send Recovery Token'}
            </button>
          </form>


        </motion.div>
      </div>
    </section>
  );
}

export default ForgotPassword;
