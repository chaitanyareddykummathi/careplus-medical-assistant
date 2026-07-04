import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiCheckCircle } from 'react-icons/fi';

import { getApiErrorMessage, loginUser, registerUser } from '../services/api';
import styles from './Auth.module.css';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Register({ onRegisterSuccess }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      username: form.email.split('@')[0], // Optional username derived from email
    };

    try {
      const response = await registerUser(requestPayload);
      const session = await loginUser({
        email: requestPayload.email,
        password: requestPayload.password,
      });

      onRegisterSuccess(session);
      setSuccess(response?.message || 'Account created successfully. Opening home page...');
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 500);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Registration failed. Please try again.'));
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
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h1 className={styles.title} style={{ fontSize: '1.8rem' }}>Create account</h1>
            <p className={styles.subtitle}>Start your AI-assisted triage journey with CarePlus.</p>
          </div>

          {error ? <p className="alert alertError">{error}</p> : null}
          {success ? <p className="alert alertSuccess">{success}</p> : null}

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
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
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

            <button className={styles.submitButton} disabled={loading} type="submit">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className={styles.helperText} style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--cp-primary)', fontWeight: 700 }}>Sign in</Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}

export default Register;
