import React from 'react';
import { motion } from 'framer-motion';
import { FiUser, FiActivity, FiAward, FiStar, FiHeart, FiGlobe, FiDollarSign } from 'react-icons/fi';
import Badge from './Badge';

function DoctorCard({ doctor, onBook }) {
  // Generate random rating for doctor styling if not present
  const rating = doctor.rating || (4.5 + (doctor.experience_years % 5) * 0.1).toFixed(1);
  const qualification = doctor.qualification || "MBBS MD";
  const languages = doctor.languages || "English, Hindi";
  const consultationFee = doctor.consultation_fee || 1000;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}
      transition={{ duration: 0.3 }}
      style={{
        background: 'var(--cp-white)',
        border: '1px solid var(--cp-border)',
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem',
        display: 'flex',
        gap: '1rem',
        position: 'relative',
        boxShadow: 'var(--shadow-sm)',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Photo Placeholder Panel */}
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--cp-primary-light)',
          color: 'var(--cp-primary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: '1px solid rgba(37, 99, 235, 0.15)',
        }}
      >
        <FiUser size={38} />
        <span style={{ fontSize: '0.6rem', fontWeight: 'bold', marginTop: '0.2rem', textTransform: 'uppercase', opacity: 0.7 }}>MD Photo</span>
      </div>

      {/* Info panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h4
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.05rem',
                fontWeight: '800',
                margin: '0 0 0.15rem 0',
                color: 'var(--cp-text)'
              }}
            >
              {doctor.name}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <Badge variant="teal" style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                {doctor.specialty}
              </Badge>
              <span style={{ fontSize: '0.75rem', color: 'var(--cp-subtext)', fontWeight: 600 }}>{qualification}</span>
            </div>
          </div>
          <button
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--cp-subtext)',
              padding: '0.2rem',
            }}
            onClick={(e) => {
              e.preventDefault();
              e.currentTarget.style.color = '#EF4444';
            }}
          >
            <FiHeart size={18} />
          </button>
        </div>

        {/* Doctor clinical details grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.4rem',
          fontSize: '0.775rem',
          color: 'var(--cp-subtext)',
          margin: '0.2rem 0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <FiAward style={{ color: 'var(--cp-accent)' }} />
            <span>{doctor.experience_years} Years Experience</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <FiStar fill="#F59E0B" color="#F59E0B" size={13} />
            <span>{rating} Rating</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', gridColumn: 'span 2' }}>
            <FiGlobe style={{ color: 'var(--cp-success)' }} />
            <span>Languages: {languages}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', gridColumn: 'span 2' }}>
            <FiDollarSign style={{ color: 'var(--cp-primary)' }} />
            <span>Consultation Fee: <strong style={{ color: 'var(--cp-text)' }}>₹{consultationFee}</strong></span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderTop: '1px solid var(--cp-border)', paddingTop: '0.6rem', marginTop: '0.2rem' }}>
          {onBook && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onBook}
              style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
            >
              Select Doctor
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default DoctorCard;
