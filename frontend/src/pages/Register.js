import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { getApiErrorMessage, registerUser } from '../services/api';
import styles from './Auth.module.css';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
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
    };
    console.log('[Auth][Register] Request payload', {
      ...requestPayload,
      password: `***len:${requestPayload.password.length}`,
    });

    try {
      const response = await registerUser(requestPayload);
      console.log('[Auth][Register] Response', response);

      setSuccess(response?.message || 'Account created successfully. Redirecting to login...');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1200);
    } catch (apiError) {
      console.error('[Auth][Register] Error', apiError?.response?.data || apiError);
      setError(getApiErrorMessage(apiError, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.subtitle}>Start your AI-assisted medical triage journey with CarePlus.</p>

        {error ? <p className="alert alertError">{error}</p> : null}
        {success ? <p className="alert alertSuccess">{success}</p> : null}

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label} htmlFor="name">
            Name
          </label>
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

          <label className={styles.label} htmlFor="email">
            Email
          </label>
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

          <label className={styles.label} htmlFor="password">
            Password
          </label>
          <input
            autoComplete="new-password"
            className={styles.input}
            id="password"
            name="password"
            onChange={handleChange}
            placeholder="At least 8 characters"
            required
            type="password"
            value={form.password}
          />

          <label className={styles.label} htmlFor="confirmPassword">
            Confirm Password
          </label>
          <input
            autoComplete="new-password"
            className={styles.input}
            id="confirmPassword"
            name="confirmPassword"
            onChange={handleChange}
            placeholder="Repeat your password"
            required
            type="password"
            value={form.confirmPassword}
          />

          <button className={styles.submitButton} disabled={loading} type="submit">
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className={styles.helperText}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </section>
  );
}

export default Register;
