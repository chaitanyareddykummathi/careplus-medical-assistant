import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSend,
  FiMic,
  FiActivity,
  FiCheckCircle,
  FiInfo,
  FiAlertTriangle,
  FiMapPin,
  FiCalendar,
  FiUser
} from 'react-icons/fi';

import { analyzeSymptoms, getApiErrorMessage } from '../services/api';
import Badge from '../components/Badge';
import { Spinner } from '../components/Loader';
import styles from './CarePages.module.css';

const LAST_RESULT_KEY = 'careplus_last_symptom_result';
const riskColorMap = {
  HIGH: '#EF4444',
  MEDIUM: '#F59E0B',
  LOW: '#10B981',
};

const exampleSuggestions = [
  'I have fever and headache for 2 days',
  'Chest pain radiating to my left arm',
  'Severe cough, cold and sore throat',
  'Stomach pain and nausea after eating',
];

function SuggestionChips({ onSelect, disabled }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.8rem' }}>
      {exampleSuggestions.map((symptom) => (
        <button
          key={symptom}
          type="button"
          onClick={() => onSelect(symptom)}
          disabled={disabled}
          style={{
            background: 'var(--cp-white)',
            border: '1px solid var(--cp-border)',
            borderRadius: 'var(--radius-full)',
            padding: '0.45rem 1rem',
            fontSize: '0.8rem',
            fontWeight: '600',
            color: 'var(--cp-subtext)',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.borderColor = 'var(--cp-primary)';
              e.currentTarget.style.color = 'var(--cp-primary)';
              e.currentTarget.style.backgroundColor = 'var(--cp-primary-light)';
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              e.currentTarget.style.borderColor = 'var(--cp-border)';
              e.currentTarget.style.color = 'var(--cp-subtext)';
              e.currentTarget.style.backgroundColor = 'var(--cp-white)';
            }
          }}
        >
          {symptom}
        </button>
      ))}
    </div>
  );
}

function ListBlock({ title, items, icon: Icon, color = 'var(--cp-text)' }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div style={{ marginTop: '0.8rem' }}>
      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem', color }}>
        {Icon && <Icon size={14} />}
        <span>{title}</span>
      </h4>
      <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {items.map((item) => (
          <li
            key={typeof item === 'string' ? item : JSON.stringify(item)}
            style={{
              background: 'var(--cp-bg)',
              border: '1px solid var(--cp-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.35rem 0.65rem',
              fontSize: '0.8rem',
              color: 'var(--cp-text)',
              fontWeight: 500,
            }}
          >
            {String(item)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SymptomChecker() {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      type: 'text',
      content: 'Hello! I am your CarePlus AI Medical Assistant. Please describe your symptoms naturally (e.g. "I have mild fever and sore throat for 3 days"), and I will conduct a structured triage analysis.'
    }
  ]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [voiceActive, setVoiceActive] = useState(false);
  const chatEndRef = useRef(null);

  const activeAnalysisResult = useMemo(() => {
    const analysisMsgs = messages.filter(m => m.sender === 'bot' && m.type === 'analysis');
    if (analysisMsgs.length > 0) {
      return analysisMsgs[analysisMsgs.length - 1].content;
    }
    return null;
  }, [messages]);

  const riskColor = useMemo(() => {
    if (!activeAnalysisResult) return 'var(--cp-text)';
    const level = String(activeAnalysisResult.risk_level || '').toUpperCase();
    return riskColorMap[level] || 'var(--cp-text)';
  }, [activeAnalysisResult]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAnalyzing]);

  const handleAnalyze = async (inputText) => {
    const cleanText = inputText.trim();
    if (!cleanText) return;

    setErrorMessage('');
    
    // 1. Add User message
    const userMsgId = 'user-' + Date.now();
    setMessages((prev) => [...prev, { id: userMsgId, sender: 'user', type: 'text', content: cleanText }]);
    setText('');
    setIsAnalyzing(true);

    try {
      // 2. Call backend api
      const result = await analyzeSymptoms({ text: cleanText });
      
      // 3. Save to localstorage
      localStorage.setItem(
        LAST_RESULT_KEY,
        JSON.stringify({ ...result, analyzed_at: new Date().toISOString() })
      );

      // 4. Add Bot analysis message
      const botMsgId = 'bot-' + Date.now();
      setMessages((prev) => [
        ...prev,
        { id: botMsgId, sender: 'bot', type: 'analysis', content: result }
      ]);
    } catch (error) {
      const errMsg = getApiErrorMessage(error, 'Could not complete clinical analysis. Please try again.');
      setErrorMessage(errMsg);
      setMessages((prev) => [
        ...prev,
        { id: 'bot-err-' + Date.now(), sender: 'bot', type: 'text', content: `Error: ${errMsg}` }
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleAnalyze(text);
  };

  const handleVoiceClick = () => {
    setVoiceActive(!voiceActive);
    if (!voiceActive) {
      setText('Analyzing simulated voice input...');
      setTimeout(() => {
        setText('I have high fever and severe cough since yesterday');
        setVoiceActive(false);
      }, 1500);
    }
  };

  return (
    <section className={styles.page}>
      <div className="container">
        {/* Header Title Section */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Badge variant="teal" style={{ marginBottom: '0.8rem' }}>Triage Engine</Badge>
          <h1 className={styles.title}>AI Medical Triage Assistant</h1>
          <p className={styles.subtitle}>
            State your health symptoms naturally. We will structure the data to analyze risk levels, possible conditions, and department specializations.
          </p>
        </div>

        <div className={styles.checkerLayout}>
          {/* Main AI Chat Interface */}
          <div className={styles.chatCard}>
            <div className={styles.chatHeader}>
              <div className={styles.avatarCircle}>
                <FiActivity size={18} />
              </div>
              <div>
                <strong>CarePlus AI Bot</strong>
                <span className={styles.pulseIndicator}>Active Triage</span>
              </div>
            </div>

            {/* Chat Messages Log */}
            <div className={styles.chatLog}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.chatRow} ${msg.sender === 'user' ? styles.rowUser : styles.rowBot}`}
                >
                  <div className={styles.bubble}>
                    {msg.type === 'text' ? (
                      <p style={{ margin: 0, fontSize: '0.925rem', lineHeight: '1.5' }}>{msg.content}</p>
                    ) : (
                      // Structured Analysis Bubble inside chat
                      <div className={styles.analysisBubble}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--cp-border)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--cp-primary)' }}>Structured Triage Response</span>
                          <Badge variant={msg.content.risk_level?.toUpperCase() === 'HIGH' ? 'danger' : msg.content.risk_level?.toUpperCase() === 'MEDIUM' ? 'warning' : 'success'}>
                            {msg.content.risk_level} Risk
                          </Badge>
                        </div>
                        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', lineHeight: '1.5', fontWeight: 500 }}>
                          {msg.content.analysis_summary || msg.content.recommendation}
                        </p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--cp-subtext)', marginBottom: '0.5rem' }}>
                          <div>Confidence: <strong>{Math.round(Number(msg.content.confidence || 0) * 100)}%</strong></div>
                          <div>Urgency: <strong>{msg.content.urgency}</strong></div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--cp-border)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--cp-subtext)', display: 'block' }}>Suggested Specialist</span>
                          <strong style={{ fontSize: '0.875rem', color: 'var(--cp-text)' }}>
                            {msg.content.recommended_specialist} ({msg.content.recommended_department})
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isAnalyzing && (
                <div className={`${styles.chatRow} ${styles.rowBot}`}>
                  <div className={styles.bubble} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.2rem' }}>
                    <Spinner size="1.2rem" />
                    <span style={{ fontSize: '0.85rem', color: 'var(--cp-subtext)' }}>Analyzing symptoms...</span>
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSubmit} className={styles.chatInputRow}>
              <button
                type="button"
                onClick={handleVoiceClick}
                className={`${styles.iconBtn} ${voiceActive ? styles.voicePulse : ''}`}
                title="Mock Speech-to-Text"
              >
                <FiMic size={18} />
              </button>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type symptoms (e.g. Cough and body pain for 3 days)..."
                disabled={isAnalyzing}
                className={styles.chatInput}
              />
              <button
                type="submit"
                disabled={isAnalyzing || !text.trim()}
                className={styles.sendBtn}
              >
                <FiSend size={16} />
              </button>
            </form>

            <div style={{ padding: '0 1.5rem 1.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--cp-subtext)', fontWeight: 600 }}>Or select an example to test:</span>
              <SuggestionChips onSelect={handleAnalyze} disabled={isAnalyzing} />
            </div>
          </div>

          {/* Right sidebar: Detailed diagnostic report */}
          <AnimatePresence>
            {activeAnalysisResult ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={styles.reportCard}
              >
                <div className={styles.reportHeader} style={{ borderLeft: `4px solid ${riskColor}` }}>
                  <FiInfo style={{ color: riskColor }} size={20} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Diagnostic Breakdown</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--cp-subtext)' }}>Clinical Triage Summary</span>
                  </div>
                </div>

                <div className={styles.reportContent}>
                  {/* Extracted Symptoms */}
                  <ListBlock
                    title="Extracted Symptoms"
                    items={activeAnalysisResult.extracted_symptoms}
                    icon={FiCheckCircle}
                    color="var(--cp-primary)"
                  />

                  {/* Possible Conditions */}
                  <ListBlock
                    title="Possible Conditions"
                    items={activeAnalysisResult.possible_conditions}
                    icon={FiActivity}
                    color="var(--cp-accent)"
                  />

                  {/* Explanation */}
                  {activeAnalysisResult.condition_explanation && (
                    <div style={{ marginTop: '0.8rem' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>Condition Explanation</h4>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--cp-subtext)', lineHeight: '1.5' }}>
                        {activeAnalysisResult.condition_explanation}
                      </p>
                    </div>
                  )}

                  {/* Home & Lifestyle Advice */}
                  <ListBlock
                    title="Home Care Advice"
                    items={activeAnalysisResult.home_care_advice}
                    icon={FiCheckCircle}
                    color="var(--cp-success)"
                  />
                  <ListBlock
                    title="Warning Signs"
                    items={activeAnalysisResult.warning_signs}
                    icon={FiAlertTriangle}
                    color="var(--cp-warning)"
                  />
                  <ListBlock
                    title="Emergency Signs"
                    items={activeAnalysisResult.emergency_symptoms}
                    icon={FiAlertTriangle}
                    color="var(--cp-danger)"
                  />

                  {/* Tests */}
                  <ListBlock
                    title="Suggested Medical Tests"
                    items={activeAnalysisResult.recommended_tests}
                    icon={FiInfo}
                    color="var(--cp-accent)"
                  />

                  {/* Direct action links */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--cp-border)' }}>
                    <Link className="btn btn-primary" to="/appointments" style={{ width: '100%' }}>
                      <FiCalendar /> Book Doctor Visit
                    </Link>
                    <Link className="btn btn-secondary" to="/hospitals" style={{ width: '100%' }}>
                      <FiMapPin /> Find Nearby Hospitals
                    </Link>
                  </div>

                  <p style={{ fontSize: '0.7rem', color: 'var(--cp-subtext)', fontStyle: 'italic', marginTop: '1rem', lineHeight: '1.4', textAlign: 'center' }}>
                    {activeAnalysisResult.medical_disclaimer}
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className={styles.reportEmpty}>
                <div style={{ textAlign: 'center', color: 'var(--cp-subtext)' }}>
                  <FiActivity size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500 }}>Awaiting analysis...</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>Describe symptoms in the chat to see diagnostics.</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

export default SymptomChecker;
