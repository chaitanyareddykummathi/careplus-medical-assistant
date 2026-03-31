import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import styles from './Dashboard.module.css';
import { analyzeSymptoms, getApiErrorMessage } from '../services/api';

const LAST_RESULT_KEY = 'careplus_last_symptom_result';

const textareaStyle = {
  border: '1px solid var(--cp-border)',
  borderRadius: '12px',
  color: 'var(--cp-text)',
  fontSize: '0.98rem',
  marginTop: '0.35rem',
  minHeight: '180px',
  outline: 'none',
  padding: '0.8rem',
  resize: 'vertical',
  width: '100%',
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
  textDecoration: 'none',
};

const resultCardStyle = {
  border: '1px solid var(--cp-border)',
  borderRadius: '12px',
  marginTop: '1rem',
  padding: '0.9rem',
};

const riskColorMap = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#22c55e',
};

function SymptomChecker() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const riskColor = useMemo(() => {
    const level = String(result?.risk_level || '').toUpperCase();
    return riskColorMap[level] || 'var(--cp-text)';
  }, [result]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    if (!text.trim()) {
      setErrorMessage('Please enter symptoms before analysis.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysis = await analyzeSymptoms({ text: text.trim() });
      setResult(analysis);

      localStorage.setItem(
        LAST_RESULT_KEY,
        JSON.stringify({
          ...analysis,
          analyzed_at: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error('[SymptomChecker] Failed to analyze symptoms', error);
      setErrorMessage(
        getApiErrorMessage(error, 'Could not analyze symptoms right now. Please try again.')
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <section className={styles.wrapper}>
      <div className="container">
        <div className={styles.card}>
          <h1 className={styles.title}>Symptom Checker</h1>
          <p className={styles.subtitle}>
            Describe symptoms in plain text and receive a structured AI-assisted risk response.
          </p>

          {errorMessage ? <p className="alert alertError">{errorMessage}</p> : null}

          <form onSubmit={handleSubmit}>
            <label htmlFor="symptom-text" style={{ display: 'block', fontWeight: 600 }}>
              Symptoms
            </label>
            <textarea
              id="symptom-text"
              onChange={(event) => setText(event.target.value)}
              placeholder="Example: I have fever, headache and body pain for 2 days."
              style={textareaStyle}
              value={text}
            />

            <div style={actionsRowStyle}>
              <button disabled={isAnalyzing} style={primaryButtonStyle} type="submit">
                {isAnalyzing ? 'Analyzing...' : 'Analyze Symptoms'}
              </button>
              <Link style={secondaryButtonStyle} to="/dashboard">
                Back to Dashboard
              </Link>
            </div>
          </form>

          {result ? (
            <div style={resultCardStyle}>
              <h2 className={styles.sectionTitle}>Analysis Result</h2>
              <p style={{ color: riskColor, fontWeight: 700, marginBottom: '0.4rem' }}>
                Risk Level: {result.risk_level}
              </p>
              <p className={styles.subtitle} style={{ marginTop: 0 }}>
                Confidence: {Math.round(Number(result.confidence || 0) * 100)}%
              </p>

              <h3 style={{ marginBottom: '0.35rem' }}>Extracted Symptoms</h3>
              {Array.isArray(result.extracted_symptoms) && result.extracted_symptoms.length > 0 ? (
                <ul className={styles.list}>
                  {result.extracted_symptoms.map((symptom) => (
                    <li key={symptom}>{symptom}</li>
                  ))}
                </ul>
              ) : (
                <p className={styles.subtitle}>No symptoms were extracted.</p>
              )}

              <h3 style={{ marginBottom: '0.35rem', marginTop: '0.9rem' }}>Possible Conditions</h3>
              {Array.isArray(result.possible_conditions) && result.possible_conditions.length > 0 ? (
                <ul className={styles.list}>
                  {result.possible_conditions.map((condition) => (
                    <li key={condition}>{condition}</li>
                  ))}
                </ul>
              ) : (
                <p className={styles.subtitle}>No condition mapping available.</p>
              )}

              <h3 style={{ marginBottom: '0.35rem', marginTop: '0.9rem' }}>Recommendation</h3>
              <p className={styles.subtitle} style={{ marginTop: 0 }}>
                {result.recommendation}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default SymptomChecker;

