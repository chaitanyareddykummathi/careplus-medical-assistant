import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import styles from './Dashboard.module.css';
import {
  getApiErrorMessage,
  getHealthProfile,
  saveHealthProfile,
} from '../services/api';

const bpRegex = /^\d{2,3}\/\d{2,3}$/;

const formCardStyle = {
  borderTop: '1px solid var(--cp-border)',
  marginTop: '1.2rem',
  paddingTop: '1.1rem',
};

const summaryGridStyle = {
  display: 'grid',
  gap: '0.75rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  marginTop: '1rem',
};

const summaryItemStyle = {
  background: 'var(--cp-surface-soft)',
  border: '1px solid var(--cp-border)',
  borderRadius: '12px',
  padding: '0.8rem',
};

const actionsRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.7rem',
  marginTop: '1rem',
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
};

const inputStyle = {
  border: '1px solid var(--cp-border)',
  borderRadius: '10px',
  color: 'var(--cp-text)',
  fontSize: '0.95rem',
  marginTop: '0.3rem',
  outline: 'none',
  padding: '0.65rem 0.75rem',
  width: '100%',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.9rem',
  fontWeight: 600,
  marginTop: '0.75rem',
};

const textareaStyle = {
  ...inputStyle,
  minHeight: '90px',
  resize: 'vertical',
};

const defaultForm = {
  age: '',
  bp: '',
  sugar: '',
  history: '',
};

function toHistoryString(historyValue) {
  if (Array.isArray(historyValue)) {
    return historyValue.join(', ');
  }

  if (typeof historyValue === 'string') {
    return historyValue;
  }

  return '';
}

function normalizeProfile(profile) {
  if (!profile || typeof profile !== 'object') {
    return null;
  }

  return {
    age: profile.age ?? '',
    bp: profile.bp ?? profile.blood_pressure ?? profile.bloodPressure ?? '',
    sugar: profile.sugar ?? profile.sugar_level ?? profile.sugarLevel ?? '',
    history: toHistoryString(profile.history ?? profile.medical_history ?? profile.medicalHistory),
  };
}

function Dashboard({ user }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const hasProfile = useMemo(() => Boolean(profile), [profile]);

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      setIsLoadingProfile(true);
      setErrorMessage('');

      try {
        const response = await getHealthProfile();
        if (!isActive) {
          return;
        }

        const normalized = normalizeProfile(response);
        setProfile(normalized);
        setForm(normalized || defaultForm);
        setIsEditing(false);
      } catch (error) {
        if (!isActive) {
          return;
        }
        setErrorMessage(
          getApiErrorMessage(error, 'Unable to load your health profile. Please try again.')
        );
      } finally {
        if (isActive) {
          setIsLoadingProfile(false);
        }
      }
    }

    loadProfile();

    return () => {
      isActive = false;
    };
  }, []);

  const handleStartAnalysis = () => {
    navigate('/symptoms');
  };

  const handleEditProfile = () => {
    setIsEditing(true);
    setSuccessMessage('');
    setErrorMessage('');
    setForm(profile || defaultForm);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSuccessMessage('');
    setErrorMessage('');
    setForm(profile || defaultForm);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const ageNumber = Number(form.age);
    const sugarNumber = Number(form.sugar);
    const bpValue = String(form.bp || '').trim();

    if (!Number.isFinite(ageNumber) || ageNumber < 1 || ageNumber > 120) {
      return 'Age must be between 1 and 120.';
    }

    if (!bpRegex.test(bpValue)) {
      return 'BP must be in format like 120/80.';
    }

    if (!Number.isFinite(sugarNumber) || sugarNumber <= 0) {
      return 'Sugar must be a positive number.';
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    const payload = {
      age: Number(form.age),
      bp: String(form.bp).trim(),
      sugar: Number(form.sugar),
      history: String(form.history || '').trim(),
    };

    setIsSavingProfile(true);

    try {
      const saved = await saveHealthProfile(payload);
      const normalized = normalizeProfile(saved) || payload;
      setProfile(normalized);
      setForm(normalized);
      setIsEditing(false);
      setSuccessMessage('Health profile saved successfully.');
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, 'Unable to save health profile. Please try again.')
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <section className={styles.wrapper}>
      <div className="container">
        <div className={styles.card}>
          <h1 className={styles.title}>Patient Dashboard</h1>
          <p className={styles.subtitle}>
            {user?.name ? `Welcome, ${user.name}.` : 'Welcome.'} Continue your care flow with
            secure, AI-assisted triage.
          </p>

          <div className={styles.metaRow}>
            <span>Email: {user?.email || 'Not available'}</span>
            <span>Role: {user?.role || 'patient'}</span>
          </div>

          {isLoadingProfile ? (
            <p className={styles.subtitle}>Loading your health profile...</p>
          ) : (
            <>
              {errorMessage ? <p className="alert alertError">{errorMessage}</p> : null}
              {successMessage ? <p className="alert alertSuccess">{successMessage}</p> : null}

              {hasProfile && !isEditing ? (
                <>
                  <h2 className={styles.sectionTitle}>Health Profile Summary</h2>
                  <div style={summaryGridStyle}>
                    <div style={summaryItemStyle}>
                      <strong>Age</strong>
                      <p>{profile.age}</p>
                    </div>
                    <div style={summaryItemStyle}>
                      <strong>Blood Pressure</strong>
                      <p>{profile.bp}</p>
                    </div>
                    <div style={summaryItemStyle}>
                      <strong>Sugar</strong>
                      <p>{profile.sugar}</p>
                    </div>
                    <div style={summaryItemStyle}>
                      <strong>History</strong>
                      <p>{profile.history || 'No prior history added.'}</p>
                    </div>
                  </div>

                  <div style={actionsRowStyle}>
                    <button onClick={handleEditProfile} style={secondaryButtonStyle} type="button">
                      Edit Profile
                    </button>
                    <button
                      onClick={handleStartAnalysis}
                      style={primaryButtonStyle}
                      type="button"
                    >
                      Start Symptom Analysis
                    </button>
                  </div>
                </>
              ) : (
                <div style={formCardStyle}>
                  {!hasProfile ? (
                    <p className={styles.subtitle}>
                      Please complete your health profile before analysis.
                    </p>
                  ) : null}

                  <h2 className={styles.sectionTitle}>
                    {hasProfile ? 'Update Health Profile' : 'Create Health Profile'}
                  </h2>

                  <form onSubmit={handleSubmit}>
                    <label htmlFor="age" style={labelStyle}>
                      Age
                    </label>
                    <input
                      id="age"
                      max="120"
                      min="1"
                      name="age"
                      onChange={handleInputChange}
                      required
                      style={inputStyle}
                      type="number"
                      value={form.age}
                    />

                    <label htmlFor="bp" style={labelStyle}>
                      BP (e.g. 120/80)
                    </label>
                    <input
                      id="bp"
                      name="bp"
                      onChange={handleInputChange}
                      pattern="\d{2,3}/\d{2,3}"
                      placeholder="120/80"
                      required
                      style={inputStyle}
                      type="text"
                      value={form.bp}
                    />

                    <label htmlFor="sugar" style={labelStyle}>
                      Sugar
                    </label>
                    <input
                      id="sugar"
                      min="0.01"
                      name="sugar"
                      onChange={handleInputChange}
                      required
                      step="0.01"
                      style={inputStyle}
                      type="number"
                      value={form.sugar}
                    />

                    <label htmlFor="history" style={labelStyle}>
                      History (text or comma-separated)
                    </label>
                    <textarea
                      id="history"
                      name="history"
                      onChange={handleInputChange}
                      placeholder="Diabetes, Hypertension"
                      style={textareaStyle}
                      value={form.history}
                    />

                    <div style={actionsRowStyle}>
                      <button disabled={isSavingProfile} style={primaryButtonStyle} type="submit">
                        {isSavingProfile ? 'Saving profile...' : hasProfile ? 'Update Profile' : 'Save Profile'}
                      </button>

                      {hasProfile ? (
                        <button
                          disabled={isSavingProfile}
                          onClick={handleCancelEdit}
                          style={secondaryButtonStyle}
                          type="button"
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default Dashboard;
