import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';

import { getApiErrorMessage, googleLogin, loginUser } from '../services/api';
import styles from './Auth.module.css';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Login({ onLoginSuccess }) {
  const googleEnabled = Boolean(process.env.REACT_APP_GOOGLE_CLIENT_ID);
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
      onLoginSuccess(session);
      navigate('/dashboard', { replace: true });
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
      navigate('/dashboard', { replace: true });
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
    <section className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to continue with your CarePlus health journey.</p>

        {error ? <p className="alert alertError">{error}</p> : null}

        <form className={styles.form} onSubmit={handleSubmit}>
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
            autoComplete="current-password"
            className={styles.input}
            id="password"
            name="password"
            onChange={handleChange}
            placeholder="Enter your password"
            required
            type="password"
            value={form.password}
          />

          <button className={styles.submitButton} disabled={loading || googleLoading} type="submit">
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        {googleEnabled ? (
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <GoogleLogin onError={handleGoogleError} onSuccess={handleGoogleSuccess} />
            {googleLoading ? <p className={styles.helperText}>Signing in with Google...</p> : null}
          </div>
        ) : null}

        <p className={styles.helperText}>
          New to CarePlus? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </section>
  );
}

export default Login;
