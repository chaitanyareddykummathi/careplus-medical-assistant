import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiUser,
  FiMail,
  FiActivity,
  FiHeart,
  FiAlertTriangle,
  FiInfo,
  FiArrowLeft,
  FiSave
} from 'react-icons/fi';

import {
  getApiErrorMessage,
  getHealthProfile,
  saveHealthProfile,
  updateHealthProfile,
} from '../services/api';
import Badge from '../components/Badge';
import { Spinner } from '../components/Loader';
import styles from './Dashboard.module.css';

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

  const bmiCategory = useMemo(() => {
    const bmiVal = Number(bmiDisplay);
    if (!bmiVal) return { label: 'Awaiting Metrics', variant: 'secondary' };
    if (bmiVal < 18.5) return { label: 'Underweight', variant: 'warning' };
    if (bmiVal <= 25) return { label: 'Normal Weight', variant: 'success' };
    return { label: 'Overweight', variant: 'danger' };
  }, [bmiDisplay]);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const existingProfile = await getHealthProfile();
        if (!isMounted) return;

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
        if (!isMounted) return;
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
        {/* Header toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h1 className={styles.title}>Medical Profile</h1>
            <p className={styles.subtitle}>Maintain your core metrics to support accurate triage evaluation.</p>
          </div>
          <Link className="btn btn-secondary" to="/dashboard">
            <FiArrowLeft /> Dashboard
          </Link>
        </div>

        {errorMessage ? <p className="alert alertError"><FiAlertTriangle /> {errorMessage}</p> : null}
        {successMessage ? <p className="alert alertSuccess"><FiInfo /> {successMessage}</p> : null}

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Spinner size="3rem" />
          </div>
        ) : (
          <div className={styles.dashboardGrid}>
            {/* Left side: Avatar and clinical status card */}
            <div className={styles.leftCol}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={styles.card}
                style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}
              >
                <div
                  style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--cp-primary-light)',
                    color: 'var(--cp-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-sm)',
                    border: '4px solid var(--cp-white)',
                  }}
                >
                  <FiUser size={44} />
                </div>
                
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 700, margin: 0 }}>
                    Patient Diagnostics
                  </h2>
                  <span style={{ fontSize: '0.85rem', color: 'var(--cp-subtext)' }}>
                    Status: {hasExistingProfile ? 'Clinical profile loaded' : 'Profile incomplete'}
                  </span>
                </div>

                <div
                  style={{
                    width: '100%',
                    borderTop: '1px solid var(--cp-border)',
                    paddingTop: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.8rem',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--cp-subtext)', fontWeight: 500 }}>Current BMI:</span>
                    <strong style={{ fontSize: '1rem', color: 'var(--cp-text)', fontFamily: 'var(--font-display)' }}>
                      {bmiDisplay || 'N/A'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--cp-subtext)', fontWeight: 500 }}>Category:</span>
                    <Badge variant={bmiCategory.variant}>
                      {bmiCategory.label}
                    </Badge>
                  </div>
                </div>
              </motion.div>

              {/* Tips card */}
              <div className={styles.card} style={{ background: 'var(--cp-primary-light)', borderColor: 'rgba(37,99,235,0.1)' }}>
                <h4 style={{ color: 'var(--cp-primary)', fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.5rem 0', fontFamily: 'var(--font-display)' }}>
                  Why maintain vitals?
                </h4>
                <p style={{ color: 'var(--cp-primary)', opacity: 0.85, fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                  CarePlus integrates height, weight, and history to formulate conditional assessments during symptom checker execution. Up-to-date vitals yield higher confidence predictions.
                </p>
              </div>
            </div>

            {/* Right side: Detailed forms with floating labels */}
            <div className={styles.rightCol}>
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.card}
              >
                <h3 className={styles.cardTitle}>Vitals & Medical Metrics</h3>
                
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div>
                      <label htmlFor="age" className="form-label">
                        Age (Years)
                      </label>
                      <input
                        id="age"
                        max="120"
                        min="0"
                        name="age"
                        onChange={handleChange}
                        required
                        className="form-input"
                        type="number"
                        placeholder="e.g. 28"
                        value={form.age}
                      />
                    </div>
                    <div>
                      <label htmlFor="gender" className="form-label">
                        Gender
                      </label>
                      <select
                        id="gender"
                        name="gender"
                        onChange={handleChange}
                        required
                        className="form-input"
                        value={form.gender}
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div>
                      <label htmlFor="height_cm" className="form-label">
                        Height (cm)
                      </label>
                      <input
                        id="height_cm"
                        min="1"
                        name="height_cm"
                        onChange={handleChange}
                        required
                        step="0.1"
                        className="form-input"
                        type="number"
                        placeholder="e.g. 175"
                        value={form.height_cm}
                      />
                    </div>
                    <div>
                      <label htmlFor="weight_kg" className="form-label">
                        Weight (kg)
                      </label>
                      <input
                        id="weight_kg"
                        min="1"
                        name="weight_kg"
                        onChange={handleChange}
                        required
                        step="0.1"
                        className="form-input"
                        type="number"
                        placeholder="e.g. 70"
                        value={form.weight_kg}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div>
                      <label htmlFor="blood_pressure" className="form-label">
                        Blood Pressure (Systolic/Diastolic)
                      </label>
                      <input
                        id="blood_pressure"
                        name="blood_pressure"
                        onChange={handleChange}
                        pattern="\d{2,3}/\d{2,3}"
                        placeholder="e.g. 120/80"
                        className="form-input"
                        type="text"
                        value={form.blood_pressure}
                      />
                    </div>
                    <div>
                      <label htmlFor="heart_rate" className="form-label">
                        Heart Rate (bpm)
                      </label>
                      <input
                        id="heart_rate"
                        min="1"
                        name="heart_rate"
                        onChange={handleChange}
                        className="form-input"
                        type="number"
                        placeholder="e.g. 72"
                        value={form.heart_rate}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="existing_conditions" className="form-label">
                      Existing Conditions / Allergies (Comma-separated)
                    </label>
                    <textarea
                      id="existing_conditions"
                      name="existing_conditions"
                      onChange={handleChange}
                      placeholder="e.g. Hypertension, Diabetes, Penicillin Allergy"
                      className="form-input"
                      style={{ minHeight: '95px', resize: 'vertical' }}
                      value={form.existing_conditions}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button
                      disabled={isSubmitting}
                      className="btn btn-primary"
                      type="submit"
                      style={{ flex: 1 }}
                    >
                      <FiSave /> {isSubmitting ? 'Saving Metrics...' : hasExistingProfile ? 'Update Health Metrics' : 'Create Health Profile'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default HealthProfile;
