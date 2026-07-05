import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiEye, FiEyeOff, FiActivity, FiCheckCircle } from 'react-icons/fi';

import { getApiErrorMessage, googleLogin, loginUser } from '../services/api';
import { Spinner } from '../components/Loader';
import styles from './Auth.module.css';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Login({ onLoginSuccess }) {
  const googleEnabled = Boolean(process.env.REACT_APP_GOOGLE_CLIENT_ID);
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('careplus_remembered_email');
    if (savedEmail) {
      setForm((prev) => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCapsLock = (event) => {
    if (event.getModifierState) {
      setCapsLock(event.getModifierState('CapsLock'));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!emailRegex.test(form.email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!form.password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const session = await loginUser({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (rememberMe) {
        localStorage.setItem('careplus_remembered_email', form.email.trim());
      } else {
        localStorage.removeItem('careplus_remembered_email');
      }

      onLoginSuccess(session);
      navigate('/', { replace: true });
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to sign in. Please verify your credentials.'));
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
      onLoginSuccess(session);
      navigate('/', { replace: true });
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Google sign-in failed. Please try again.'));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in failed. Please try again.');
  };

  return (
    <section className={styles.splitWrapper}>
      {/* Left panel: Healthcare visual */}
      <div className={styles.visualPanel}>
        <div className={styles.visualGlow1} />
        <div className={styles.visualGlow2} />
        
        <div className={styles.visualContent}>
          <div className={styles.brandIcon}>+</div>
          <h2 className={styles.visualTitle}>CarePlus Assistant</h2>
          <p className={styles.visualText}>
            Join thousands of patients triaging symptoms, monitoring vitals, and reserving simulated doctor appointments.
          </p>

          {/* Vitals Mock list */}
          <div className={styles.vitalsList}>
            <div className={styles.vitalCard}>
              <FiCheckCircle style={{ color: 'var(--cp-success)', flexShrink: 0 }} />
              <span>AI-assisted symptom checker and risk assessments</span>
            </div>
            <div className={styles.vitalCard}>
              <FiCheckCircle style={{ color: 'var(--cp-success)', flexShrink: 0 }} />
              <span>India-wide simulated hospital discovery</span>
            </div>
            <div className={styles.vitalCard}>
              <FiCheckCircle style={{ color: 'var(--cp-success)', flexShrink: 0 }} />
              <span>Secure personal health metric tracking</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel: Login form */}
      <div className={styles.formPanel}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={styles.glassCard}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <h1 className={styles.title}>Welcome back</h1>
            <p className={styles.subtitle}>Sign in to continue your CarePlus journey.</p>
          </div>

          {error ? <p className="alert alertError" role="alert">{error}</p> : null}

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
                  onChange={handleChange}
                  onKeyDown={handleCapsLock}
                  onKeyUp={handleCapsLock}
                  placeholder="you@careplus.com"
                  required
                  type="email"
                  value={form.email}
                  disabled={loading || googleLoading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className={styles.inputGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className={styles.label} htmlFor="password" style={{ marginBottom: 0 }}>
                  Password
                </label>
                <Link to="/forgot-password" style={{ color: 'var(--cp-primary)', fontSize: '0.8rem', fontWeight: '700' }}>
                  Forgot Password?
                </Link>
              </div>
              <div className={styles.inputWrapper}>
                <LockIconComponent className={styles.inputIcon} />
                <input
                  autoComplete="current-password"
                  className={styles.input}
                  id="password"
                  name="password"
                  onChange={handleChange}
                  onKeyDown={handleCapsLock}
                  onKeyUp={handleCapsLock}
                  placeholder="Enter your password"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  disabled={loading || googleLoading}
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.passwordToggle}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
              {capsLock && (
                <p style={{ color: 'var(--cp-warning)', fontSize: '0.75rem', fontWeight: 600, marginTop: '0.35rem' }}>
                  ⚠️ Caps Lock is ON
                </p>
              )}
            </div>

            {/* Remember Me checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.2rem 0' }}>
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ cursor: 'pointer', width: '15px', height: '15px' }}
              />
              <label htmlFor="rememberMe" style={{ fontSize: '0.85rem', color: 'var(--cp-text)', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
                Remember Me
              </label>
            </div>

            <button className={styles.submitButton} disabled={loading || googleLoading} type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              {loading ? (
                <>
                  <Spinner size="1.2rem" color="#ffffff" />
                  <span>Signing in...</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {googleEnabled ? (
            <div className={styles.googleDivider}>
              <div className={styles.dividerLine} />
              <span className={styles.dividerText}>or sign in with</span>
              <div className={styles.dividerLine} />
            </div>
          ) : null}

          {googleEnabled ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '1rem', gap: '0.5rem' }}>
              <GoogleLogin onError={handleGoogleError} onSuccess={handleGoogleSuccess} />
              {googleLoading ? <p className={styles.helperText}>Signing in with Google...</p> : null}
            </div>
          ) : null}

          <p className={styles.helperText} style={{ marginTop: '2rem', textAlign: 'center' }}>
            New to CarePlus? <Link to="/register" style={{ color: 'var(--cp-primary)', fontWeight: 700 }}>Create an account</Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function LockIconComponent({ className }) {
  return <FiLock className={className} />;
}

export default Login;
