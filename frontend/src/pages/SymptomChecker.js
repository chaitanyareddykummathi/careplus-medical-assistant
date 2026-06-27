import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { analyzeSymptoms, getApiErrorMessage } from '../services/api';
import styles from './CarePages.module.css';

const LAST_RESULT_KEY = 'careplus_last_symptom_result';
const riskColorMap = {
  HIGH: '#dc2626',
  MEDIUM: '#d97706',
  LOW: '#15803d',
};

function ListBlock({ title, items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div>
      <h3 className={styles.cardTitle}>{title}</h3>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={typeof item === 'string' ? item : JSON.stringify(item)}>{String(item)}</li>
        ))}
      </ul>
    </div>
  );
}

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
      localStorage.setItem(LAST_RESULT_KEY, JSON.stringify({ ...analysis, analyzed_at: new Date().toISOString() }));
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not analyze symptoms right now. Please try again.'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <section className={styles.page}>
      <div className="container">
        <p className={styles.eyebrow}>AI symptom checker</p>
        <h1 className={styles.title}>Describe symptoms in plain language</h1>
        <p className={styles.subtitle}>
          CarePlus will structure the response into risk, confidence, possible conditions, recommended specialist,
          home care, warning signs and hospital options.
        </p>

        <div className={`${styles.twoColumn} ${styles.section}`}>
          <form className={`${styles.card} ${styles.formGrid}`} onSubmit={handleSubmit}>
            {errorMessage ? <p className="alert alertError">{errorMessage}</p> : null}
            <label className={styles.label}>
              Symptoms
              <textarea
                className={styles.textarea}
                onChange={(event) => setText(event.target.value)}
                placeholder="Example: I have fever, headache and body pain for 2 days."
                value={text}
              />
            </label>
            <button className={styles.button} disabled={isAnalyzing} type="submit">
              {isAnalyzing ? 'Analyzing...' : 'Analyze Symptoms'}
            </button>
          </form>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Chatbot Response</h2>
            {!result ? <p className={styles.muted}>Your structured medical triage summary will appear here.</p> : null}
            {result ? (
              <div className={styles.formGrid}>
                <div className={styles.card} style={{ borderColor: riskColor, boxShadow: 'none' }}>
                  <p className={styles.eyebrow}>Analysis Summary</p>
                  <p className={styles.muted}>{result.analysis_summary || result.recommendation}</p>
                  <div className={styles.metaRow}>
                    <span className={styles.pill} style={{ color: riskColor }}>
                      Risk Level: {result.risk_level}
                    </span>
                    <span className={styles.pill}>Confidence: {Math.round(Number(result.confidence || 0) * 100)}%</span>
                    <span className={styles.pill}>Urgency: {result.urgency}</span>
                  </div>
                </div>

                <ListBlock title="Symptoms Detected" items={result.extracted_symptoms} />
                <ListBlock title="Possible Conditions" items={result.possible_conditions} />

                <div>
                  <h3 className={styles.cardTitle}>Condition Explanation</h3>
                  <p className={styles.muted}>{result.condition_explanation}</p>
                </div>

                <div className={styles.metaRow}>
                  <span className={styles.pill}>Specialist: {result.recommended_specialist}</span>
                  <span className={styles.pill}>Department: {result.recommended_department}</span>
                </div>

                <ListBlock title="Home Care Advice" items={result.home_care_advice} />
                <ListBlock title="Lifestyle Advice" items={result.lifestyle_advice} />
                <ListBlock title="Warning Signs" items={result.warning_signs} />
                <ListBlock title="Emergency Symptoms" items={result.emergency_symptoms} />
                <ListBlock title="Recommended Medical Tests" items={result.recommended_tests} />

                <div>
                  <h3 className={styles.cardTitle}>When To Visit Hospital</h3>
                  <p className={styles.muted}>{result.when_to_visit_hospital}</p>
                </div>

                {Array.isArray(result.nearby_hospitals) && result.nearby_hospitals.length > 0 ? (
                  <div>
                    <h3 className={styles.cardTitle}>Nearby Hospitals</h3>
                    <div className={styles.metaRow}>
                      {result.nearby_hospitals.map((hospital) => (
                        <span className={styles.pill} key={hospital.id}>
                          {hospital.name} · {hospital.city}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <Link className={styles.button} to="/appointments">
                  Book Appointment
                </Link>
                <p className={styles.muted}>{result.medical_disclaimer}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default SymptomChecker;
