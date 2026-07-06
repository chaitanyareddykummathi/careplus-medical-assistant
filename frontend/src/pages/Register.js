import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiCheckCircle } from 'react-icons/fi';

import { getApiErrorMessage, loginUser, registerUser, googleLogin } from '../services/api';
import { Spinner } from '../components/Loader';
import styles from './Auth.module.css';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getPasswordStrength(password) {
  let score = 0;
  if (!password) return score;

  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

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

function Register({ onRegisterSuccess }) {
  const googleEnabled = Boolean(process.env.REACT_APP_GOOGLE_CLIENT_ID);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [verificationDetails, setVerificationDetails] = useState(null);

  const strength = getPasswordStrength(form.password);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (form.name.trim().length < 2) {
      return 'Name must be at least 2 characters.';
    }
    if (!emailRegex.test(form.email)) {
      return 'Please enter a valid email address.';
    }
    if (form.password.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    if (form.password !== form.confirmPassword) {
      return 'Password and confirm password do not match.';
    }
    if (!agreeTerms) {
      return 'You must agree to the Terms & Conditions.';
    }
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    const requestPayload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      confirmPassword: form.confirmPassword,
      username: form.email.split('@')[0],
    };

    try {
      const response = await registerUser(requestPayload);
      setRegistered(true);
      setSuccess(response?.message || 'Registration successful. Please verify your email.');
      if (response?.verification_token) {
        setVerificationDetails({
          token: response.verification_token,
          url: response.verification_url
        });
      }
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    const token = credentialResponse?.credential;
    if (!token) {
      setError('Google sign-in token was not received. Please try again.');
      return;
    }

    setError('');
    setGoogleLoading(true);

    try {
      const session = await googleLogin({ token });
      onRegisterSuccess(session);
      navigate('/', { replace: true });
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Google sign-in failed. Please try again.'));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google registration failed. Please try again.');
  };

  return (
    <section className={styles.splitWrapper}>
      {/* Left panel: Healthcare visual */}
      <div className={styles.visualPanel}>
        <div className={styles.visualGlow1} />
        <div className={styles.visualGlow2} />
        
        <div className={styles.visualContent}>
          <div className={styles.brandIcon}>+</div>
          <h2 className={styles.visualTitle}>Create CarePlus Account</h2>
          <p className={styles.visualText}>
            Begin your journey with your virtual AI medical diagnostic checker and indian-wide health platform today.
          </p>

          <div className={styles.vitalsList}>
            <div className={styles.vitalCard}>
              <FiCheckCircle style={{ color: 'var(--cp-success)', flexShrink: 0 }} />
              <span>AI triage engine risk level categorization</span>
            </div>
            <div className={styles.vitalCard}>
              <FiCheckCircle style={{ color: 'var(--cp-success)', flexShrink: 0 }} />
              <span>India-wide simulated hospital discovery</span>
            </div>
            <div className={styles.vitalCard}>
              <FiCheckCircle style={{ color: 'var(--cp-success)', flexShrink: 0 }} />
              <span>Personal health history & allergy registry</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel: Register form */}
      <div className={styles.formPanel} style={{ padding: '2rem 1.5rem' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={styles.glassCard}
          style={{ maxWidth: '460px' }}
        >
          {registered ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <FiCheckCircle size={54} style={{ color: 'var(--cp-success)', marginBottom: '1.25rem' }} />
              <h1 className={styles.title} style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>Verify your email</h1>
              <p className={styles.subtitle} style={{ marginBottom: '1.5rem', lineHeight: '1.5', color: 'var(--cp-text)' }}>
                {success || 'A verification link has been sent to your email address. Please check your email to activate your account.'}
              </p>
              
              <Link to="/login" className={styles.submitButton} style={{ width: '100%', textDecoration: 'none' }}>
                Go to Sign In
              </Link>

              {/* Dev Helper Block */}
              {verificationDetails && (
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  background: 'var(--cp-bg)',
                  border: '1px dashed var(--cp-primary)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  wordBreak: 'break-all',
                  textAlign: 'left'
                }}>
                  <strong style={{ color: 'var(--cp-primary)', display: 'block', marginBottom: '0.4rem' }}>
                    Development Mode Helper:
                  </strong>
                  <p style={{ margin: '0 0 0.5rem 0', color: 'var(--cp-text)' }}>
                    Click below to simulate clicking the verification email link:
                  </p>
                  <Link to={`/verify-email?token=${verificationDetails.token}`} style={{
                    color: 'var(--cp-primary)',
                    fontWeight: '700',
                    textDecoration: 'underline'
                  }}>
                    Simulate Email Link Click
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h1 className={styles.title} style={{ fontSize: '1.8rem' }}>Create account</h1>
                <p className={styles.subtitle}>Start your AI-assisted triage journey with CarePlus.</p>
              </div>

              {error ? <p className="alert alertError" role="alert">{error}</p> : null}
              {success ? <p className="alert alertSuccess" role="alert">{success}</p> : null}

              <form className={styles.form} onSubmit={handleSubmit}>
                {/* Name Input */}
                <div className={styles.inputGroup}>
                  <label className={styles.label} htmlFor="name">
                    Full Name
                  </label>
                  <div className={styles.inputWrapper}>
                    <FiUser className={styles.inputIcon} />
                    <input
                      autoComplete="name"
                      className={styles.input}
                      id="name"
                      name="name"
                      onChange={handleChange}
                      placeholder="Your full name"
                      required
                      type="text"
                      value={form.name}
                      disabled={loading || googleLoading}
                    />
                  </div>
                </div>

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
                      onChange={handleChange}
                      placeholder="you@careplus.com"
                      required
                      type="email"
                      value={form.email}
                      disabled={loading || googleLoading}
                    />
                  </div>
                </div>

                {/* Password & Confirm Input */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className={styles.inputGroup}>
                  <div>
                    <label className={styles.label} htmlFor="password">
                      Password
                    </label>
                    <div className={styles.inputWrapper}>
                      <FiLock className={styles.inputIcon} />
                      <input
                        autoComplete="new-password"
                        className={styles.input}
                        id="password"
                        name="password"
                        onChange={handleChange}
                        placeholder="Min 8 chars"
                        required
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        disabled={loading || googleLoading}
                      />
                    </div>
                  </div>

                  <div>
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
                        placeholder="Repeat password"
                        required
                        type={showPassword ? 'text' : 'password'}
                        value={form.confirmPassword}
                        disabled={loading || googleLoading}
                      />
                    </div>
                  </div>
                </div>

                {/* Password Strength meter */}
                {form.password && (
                  <div style={{ marginTop: '-0.5rem', marginBottom: '0.25rem' }}>
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

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--cp-subtext)',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    {showPassword ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                    <span>{showPassword ? 'Hide Passwords' : 'Show Passwords'}</span>
                  </button>
                </div>

                {/* Terms & Conditions Checkbox */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', margin: '0.2rem 0' }}>
                  <input
                    type="checkbox"
                    id="agreeTerms"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    style={{ cursor: 'pointer', marginTop: '0.2rem', width: '15px', height: '15px' }}
                    disabled={loading || googleLoading}
                  />
                  <label htmlFor="agreeTerms" style={{ fontSize: '0.825rem', color: 'var(--cp-text)', fontWeight: 600, cursor: 'pointer', userSelect: 'none', lineHeight: '1.4' }}>
                    I agree to the <span style={{ color: 'var(--cp-primary)', textDecoration: 'underline' }}>Terms & Conditions</span> and <span style={{ color: 'var(--cp-primary)', textDecoration: 'underline' }}>Privacy Policy</span>.
                  </label>
                </div>

                <button className={styles.submitButton} disabled={loading || googleLoading} type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  {loading ? (
                    <>
                      <Spinner size="1.2rem" color="#ffffff" />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              {googleEnabled ? (
                <div className={styles.googleDivider}>
                  <div className={styles.dividerLine} />
                  <span className={styles.dividerText}>or register with</span>
                  <div className={styles.dividerLine} />
                </div>
              ) : null}

              {googleEnabled ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '1rem', gap: '0.5rem' }}>
                  <GoogleLogin onError={handleGoogleError} onSuccess={handleGoogleSuccess} />
                  {googleLoading ? <p className={styles.helperText}>Registering with Google...</p> : null}
                </div>
              ) : null}

              <p className={styles.helperText} style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                Already have an account? <Link to="/login" style={{ color: 'var(--cp-primary)', fontWeight: 700 }}>Sign in</Link>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}

export default Register;
