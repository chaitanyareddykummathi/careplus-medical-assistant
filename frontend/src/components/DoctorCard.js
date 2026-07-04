import React from 'react';
import { motion } from 'framer-motion';
import { FiUser, FiActivity, FiAward, FiStar, FiHeart } from 'react-icons/fi';
import Badge from './Badge';

function DoctorCard({ doctor, onBook, hospitalName, consultationFee }) {
  // Generate random rating for doctor styling
  const rating = (4.5 + (doctor.experience_years % 5) * 0.1).toFixed(1);
  
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
      }}
    >
      {/* Avatar/Icon Panel */}
      <div
        style={{
          width: '70px',
          height: '70px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--cp-primary-light)',
          color: 'var(--cp-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <FiUser size={36} />
      </div>

      {/* Info panel */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h4
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.05rem',
                fontWeight: '700',
                margin: '0 0 0.25rem 0',
              }}
            >
              {doctor.name}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <Badge variant="teal" style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                {doctor.specialty}
              </Badge>
              <span style={{ fontSize: '0.8rem', color: 'var(--cp-subtext)' }}>· {doctor.department}</span>
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

        {hospitalName && (
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--cp-subtext)' }}>
            Hospital: <strong>{hospitalName}</strong>
          </p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: 'var(--cp-subtext)', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <FiAward style={{ color: 'var(--cp-accent)' }} />
            <span>{doctor.experience_years} Years Experience</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <FiStar fill="#F59E0B" color="#F59E0B" size={14} />
            <span>{rating} Rating</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--cp-border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
          <div>
            {consultationFee && (
              <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--cp-text)' }}>
                Fee: ₹{consultationFee}
              </span>
            )}
          </div>
          {onBook && (
            <button
              className="btn btn-primary"
              onClick={onBook}
              style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
            >
              Book Now
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default DoctorCard;
