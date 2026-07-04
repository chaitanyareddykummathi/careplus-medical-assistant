import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiMapPin, FiPhone, FiStar, FiCalendar, FiClock } from 'react-icons/fi';
import Badge from './Badge';

function HospitalCard({ hospital }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, boxShadow: 'var(--shadow-hover)' }}
      transition={{ duration: 0.4 }}
      style={{
        background: 'var(--cp-white)',
        border: '1px solid var(--cp-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Hospital Image & Badges */}
      <div style={{ position: 'relative', height: '200px', overflow: 'hidden' }}>
        <img
          src={hospital.image_url}
          alt={hospital.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
          className="hospital-img"
        />
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
          <Badge variant={hospital.emergency_available ? 'danger' : 'secondary'}>
            {hospital.emergency_available ? '24/7 Emergency' : 'OPD Only'}
          </Badge>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: '1rem',
            left: '1rem',
            background: 'rgba(15, 23, 42, 0.75)',
            color: '#fff',
            padding: '0.35rem 0.7rem',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8rem',
            fontWeight: '600',
            backdropFilter: 'blur(4px)',
          }}
        >
          <FiStar fill="#F59E0B" color="#F59E0B" size={14} />
          <span>{hospital.rating} Rating</span>
        </div>
      </div>

      {/* Hospital Details */}
      <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.25rem',
            fontWeight: '700',
            margin: '0 0 0.5rem 0',
            lineHeight: '1.4',
          }}
        >
          {hospital.name}
        </h2>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {hospital.specialties.slice(0, 3).map((spec) => (
            <Badge key={spec} variant="teal" style={{ fontSize: '0.65rem' }}>
              {spec}
            </Badge>
          ))}
        </div>

        <p style={{ color: 'var(--cp-subtext)', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 1rem 0', flex: 1 }}>
          {hospital.description}
        </p>

        {/* Info Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--cp-subtext)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiMapPin style={{ color: 'var(--cp-primary)' }} />
            <span>{hospital.address}, {hospital.city} ({hospital.distance_km} km away)</span>
          </div>
          {hospital.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FiPhone style={{ color: 'var(--cp-primary)' }} />
              <span>{hospital.phone}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiClock style={{ color: 'var(--cp-primary)' }} />
            <span>{hospital.opening_hours}</span>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid var(--cp-border)',
            paddingTop: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            marginTop: 'auto',
          }}
        >
          <Link
            className="btn btn-primary"
            to="/appointments"
            state={{ hospitalId: hospital.id }}
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}
          >
            <FiCalendar /> Book OPD
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

export default HospitalCard;
