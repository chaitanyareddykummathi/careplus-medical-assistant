import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiLock, FiEye, FiEyeOff, FiCheckCircle } from 'react-icons/fi';

import { resetPassword, getApiErrorMessage } from '../services/api';
import styles from './Auth.module.css';

function getPasswordStrength(password) {
  let score = 0;
  if (!password) return score;

  if (password.length >= 8) score += 1; // Length
  if (/[A-Z]/.test(password)) score += 1; // Uppercase
  if (/[a-z]/.test(password)) score += 1; // Lowercase
  if (/[0-9]/.test(password)) score += 1; // Number
  if (/[^A-Za-z0-9]/.test(password)) score += 1; // Special Char

  return score;
}

const strengthTextMap = {
  0: 'Too Short',
  1: 'Weak',
  2: 'Fair',
  3: 'Good',
  4: 'Strong',
  5: 'Very Strong',
};

const strengthColorMap = {
  0: '#EF4444',
  1: '#EF4444',
  2: '#F59E0B',
  3: '#F59E0B',
  4: '#10B981',
  5: '#10B981',
};

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const strength = getPasswordStrength(form.password);

  useEffect(() => {
    if (!token) {
      setError('Password recovery token is missing. Please request a new link.');
    }
  }, [token]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Cannot reset password without a valid token.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Password and confirm password do not match.');
      return;
    }

    setLoading(true);

    try {
      const data = await resetPassword({
        token,
        password: form.password,
        confirm_password: form.confirmPassword,
      });
      setSuccess(data?.message || 'Password reset successfully.');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to reset password. The link may have expired.'));
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
          <h2 className={styles.visualTitle}>New Credentials</h2>
          <p className={styles.visualText}>
            Establish a strong, robust password. A secure account shield protects your health records and medical scheduling history.
          </p>

          <div className={styles.vitalsList}>
            <div className={styles.vitalCard}>
              <FiCheckCircle style={{ color: 'var(--cp-success)', flexShrink: 0 }} />
              <span>Uppercase, lowercase, and symbols verified</span>
            </div>
            <div className={styles.vitalCard}>
              <FiCheckCircle style={{ color: 'var(--cp-success)', flexShrink: 0 }} />
              <span>Real-time password strength audit</span>
            </div>
            <div className={styles.vitalCard}>
              <FiCheckCircle style={{ color: 'var(--cp-success)', flexShrink: 0 }} />
              <span>Direct database security encryption</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel: Reset Password form */}
      <div className={styles.formPanel}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={styles.glassCard}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <h1 className={styles.title} style={{ fontSize: '1.75rem' }}>Reset password</h1>
            <p className={styles.subtitle}>Choose your new password credentials below.</p>
          </div>

          {error ? <p className="alert alertError">{error}</p> : null}
          {success ? <p className="alert alertSuccess">{success}</p> : null}

          {!token ? (
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <Link to="/forgot-password" style={{ color: 'var(--cp-primary)', fontWeight: '700' }}>
                Request new recovery token
              </Link>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              {/* Password Input */}
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="password">
                  New Password
                </label>
                <div className={styles.inputWrapper}>
                  <FiLock className={styles.inputIcon} />
                  <input
                    autoComplete="new-password"
                    className={styles.input}
                    id="password"
                    name="password"
                    onChange={handleChange}
                    placeholder="Enter new password"
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    disabled={loading}
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.passwordToggle}
                  >
                    {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
                
                {/* Password Strength Meter */}
                {form.password && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--cp-subtext)', fontWeight: 600, marginBottom: '0.25rem' }}>
                      <span>Strength:</span>
                      <span style={{ color: strengthColorMap[strength] }}>
                        {strengthTextMap[strength]}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.2rem', height: '4px' }}>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          style={{
                            flex: 1,
                            backgroundColor: level <= strength ? strengthColorMap[strength] : 'var(--cp-border)',
                            borderRadius: '2px',
                            transition: 'all 0.3s'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Input */}
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <div className={styles.inputWrapper}>
                  <FiLock className={styles.inputIcon} />
                  <input
                    autoComplete="new-password"
                    className={styles.input}
                    id="confirmPassword"
                    name="confirmPassword"
                    onChange={handleChange}
                    placeholder="Repeat new password"
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    disabled={loading}
                  />
                </div>
              </div>

              <button className={styles.submitButton} disabled={loading} type="submit">
                {loading ? 'Updating password...' : 'Save New Password'}
              </button>
            </form>
          )}

          <p className={styles.helperText} style={{ marginTop: '2rem', textAlign: 'center' }}>
            Remembered your password? <Link to="/login" style={{ color: 'var(--cp-primary)', fontWeight: 700 }}>Sign in</Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}

export default ResetPassword;
