import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import styles from './Dashboard.module.css';
import {
  getApiErrorMessage,
  getHealthProfile,
  saveHealthProfile,
  updateHealthProfile,
} from '../services/api';

const emptyForm = {
  age: '',
  gender: '',
  height_cm: '',
  weight_kg: '',
  blood_pressure: '',
  heart_rate: '',
  existing_conditions: '',
};

const bpRegex = /^\d{2,3}\/\d{2,3}$/;

const fieldStyle = {
  border: '1px solid var(--cp-border)',
  borderRadius: '10px',
  color: 'var(--cp-text)',
  fontSize: '0.95rem',
  marginTop: '0.35rem',
  outline: 'none',
  padding: '0.65rem 0.75rem',
  width: '100%',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.9rem',
  fontWeight: 600,
  marginTop: '0.8rem',
};

const actionsRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.7rem',
  marginTop: '1rem',
};

const submitButtonStyle = {
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
  textDecoration: 'none',
};

function toConditionString(existingConditions) {
  if (Array.isArray(existingConditions)) {
    return existingConditions.join(', ');
  }

  if (typeof existingConditions === 'string') {
    return existingConditions;
  }

  return '';
}

function mapProfileToForm(profile) {
  return {
    age: profile?.age ?? '',
    gender: profile?.gender ?? '',
    height_cm: profile?.height_cm ?? '',
    weight_kg: profile?.weight_kg ?? '',
    blood_pressure: profile?.blood_pressure ?? '',
    heart_rate: profile?.heart_rate ?? '',
    existing_conditions: toConditionString(profile?.existing_conditions),
  };
}

function parseConditions(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function calculateBmi(weightKg, heightCm) {
  const weight = Number(weightKg);
  const height = Number(heightCm);
  if (!Number.isFinite(weight) || !Number.isFinite(height) || height <= 0) {
    return null;
  }

  const heightM = height / 100;
  const bmi = weight / (heightM * heightM);
  return Number.isFinite(bmi) ? bmi.toFixed(2) : null;
}

function HealthProfile() {
  const [form, setForm] = useState(emptyForm);
  const [profile, setProfile] = useState(null);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const bmiDisplay = useMemo(() => {
    if (profile?.bmi) {
      return Number(profile.bmi).toFixed(2);
    }
    return calculateBmi(form.weight_kg, form.height_cm);
  }, [form.height_cm, form.weight_kg, profile]);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const existingProfile = await getHealthProfile();
        if (!isMounted) {
          return;
        }

        if (existingProfile) {
          setProfile(existingProfile);
          setHasExistingProfile(true);
          setForm(mapProfileToForm(existingProfile));
        } else {
          setProfile(null);
          setHasExistingProfile(false);
          setForm(emptyForm);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error('[HealthProfile] Failed to load profile', error);
        setErrorMessage(
          getApiErrorMessage(error, 'Unable to load your health profile. Please try again.')
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const age = Number(form.age);
    const heightCm = Number(form.height_cm);
    const weightKg = Number(form.weight_kg);
    const heartRate = form.heart_rate === '' ? null : Number(form.heart_rate);
    const bloodPressure = String(form.blood_pressure || '').trim();

    if (!Number.isFinite(age) || age < 0 || age > 120) {
      return 'Age must be between 0 and 120.';
    }

    if (!form.gender.trim()) {
      return 'Gender is required.';
    }

    if (!Number.isFinite(heightCm) || heightCm <= 0) {
      return 'Height must be greater than 0 cm.';
    }

    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      return 'Weight must be greater than 0 kg.';
    }

    if (bloodPressure && !bpRegex.test(bloodPressure)) {
      return 'Blood pressure must be in format like 120/80.';
    }

    if (heartRate !== null && (!Number.isFinite(heartRate) || heartRate <= 0)) {
      return 'Heart rate must be a positive number.';
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const validationMessage = validateForm();
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    const payload = {
      age: Number(form.age),
      gender: form.gender.trim(),
      height_cm: Number(form.height_cm),
      weight_kg: Number(form.weight_kg),
      blood_pressure: String(form.blood_pressure || '').trim() || null,
      heart_rate:
        form.heart_rate === '' || form.heart_rate === null ? null : Number(form.heart_rate),
      existing_conditions: parseConditions(form.existing_conditions),
    };

    setIsSubmitting(true);
    try {
      const savedProfile = hasExistingProfile
        ? await updateHealthProfile(payload)
        : await saveHealthProfile(payload);

      setProfile(savedProfile);
      setHasExistingProfile(true);
      setForm(mapProfileToForm(savedProfile));
      setSuccessMessage('Health profile saved successfully.');
    } catch (error) {
      console.error('[HealthProfile] Failed to save profile', error);
      setErrorMessage(
        getApiErrorMessage(error, 'Unable to save health profile. Please try again.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={styles.wrapper}>
      <div className="container">
        <div className={styles.card}>
          <h1 className={styles.title}>Health Profile</h1>
          <p className={styles.subtitle}>
            Keep your core health metrics up to date for better symptom risk assessment.
          </p>

          {errorMessage ? <p className="alert alertError">{errorMessage}</p> : null}
          {successMessage ? <p className="alert alertSuccess">{successMessage}</p> : null}

          {isLoading ? (
            <p className={styles.subtitle}>Loading health profile...</p>
          ) : (
            <>
              <div className={styles.metaRow}>
                <span>Status: {hasExistingProfile ? 'Profile available' : 'Profile not created yet'}</span>
                <span>Calculated BMI: {bmiDisplay || 'N/A'}</span>
              </div>

              <form onSubmit={handleSubmit}>
                <label htmlFor="age" style={labelStyle}>
                  Age
                </label>
                <input
                  id="age"
                  max="120"
                  min="0"
                  name="age"
                  onChange={handleChange}
                  required
                  style={fieldStyle}
                  type="number"
                  value={form.age}
                />

                <label htmlFor="gender" style={labelStyle}>
                  Gender
                </label>
                <input
                  id="gender"
                  name="gender"
                  onChange={handleChange}
                  placeholder="male / female / other"
                  required
                  style={fieldStyle}
                  type="text"
                  value={form.gender}
                />

                <label htmlFor="height_cm" style={labelStyle}>
                  Height (cm)
                </label>
                <input
                  id="height_cm"
                  min="1"
                  name="height_cm"
                  onChange={handleChange}
                  required
                  step="0.1"
                  style={fieldStyle}
                  type="number"
                  value={form.height_cm}
                />

                <label htmlFor="weight_kg" style={labelStyle}>
                  Weight (kg)
                </label>
                <input
                  id="weight_kg"
                  min="1"
                  name="weight_kg"
                  onChange={handleChange}
                  required
                  step="0.1"
                  style={fieldStyle}
                  type="number"
                  value={form.weight_kg}
                />

                <label htmlFor="blood_pressure" style={labelStyle}>
                  Blood Pressure (e.g. 120/80)
                </label>
                <input
                  id="blood_pressure"
                  name="blood_pressure"
                  onChange={handleChange}
                  pattern="\d{2,3}/\d{2,3}"
                  placeholder="120/80"
                  style={fieldStyle}
                  type="text"
                  value={form.blood_pressure}
                />

                <label htmlFor="heart_rate" style={labelStyle}>
                  Heart Rate (bpm)
                </label>
                <input
                  id="heart_rate"
                  min="1"
                  name="heart_rate"
                  onChange={handleChange}
                  style={fieldStyle}
                  type="number"
                  value={form.heart_rate}
                />

                <label htmlFor="existing_conditions" style={labelStyle}>
                  Existing Conditions (comma-separated)
                </label>
                <textarea
                  id="existing_conditions"
                  name="existing_conditions"
                  onChange={handleChange}
                  placeholder="Diabetes, Hypertension"
                  style={{ ...fieldStyle, minHeight: '95px', resize: 'vertical' }}
                  value={form.existing_conditions}
                />

                <div style={actionsRowStyle}>
                  <button disabled={isSubmitting} style={submitButtonStyle} type="submit">
                    {isSubmitting ? 'Saving...' : hasExistingProfile ? 'Update Profile' : 'Create Profile'}
                  </button>
                  <Link style={secondaryButtonStyle} to="/dashboard">
                    Back to Dashboard
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default HealthProfile;

