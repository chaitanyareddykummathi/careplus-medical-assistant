import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiMapPin, FiPhone, FiStar, FiCalendar, FiClock, FiCheck, FiUsers } from 'react-icons/fi';
import Badge from './Badge';

function HospitalCard({ hospital, recommendedDept }) {
  // 1. Calculate Open/Closed status based on current time
  const isOpen = useMemo(() => {
    const now = new Date();
    const hr = now.getHours();
    // OPD hours usually 9 AM to 7 PM
    return hr >= 9 && hr < 19;
  }, []);

  // 2. Count matching doctors in recommended department vs total doctors
  const doctorsCount = useMemo(() => {
    if (!recommendedDept) return hospital.doctors.length;
    const matching = hospital.doctors.filter(
      d => d.department.toLowerCase() === recommendedDept.toLowerCase()
    );
    return matching.length;
  }, [hospital.doctors, recommendedDept]);

  // 3. Calculate dynamic waiting times based on ratings
  const estWaitingTime = useMemo(() => {
    // Better rating = generally smoother triage operations
    const ratingDiff = 5.0 - hospital.rating;
    const minutes = Math.floor(ratingDiff * 80) + 15;
    return `${minutes} mins`;
  }, [hospital.rating]);

  // 4. Calculate next slot suggestion
  const nextSlotTime = useMemo(() => {
    const now = new Date();
    const hr = now.getHours();
    if (hr < 12) return "Today 02:30 PM";
    if (hr < 16) return "Today 04:00 PM";
    return "Tomorrow 09:30 AM";
  }, []);

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
      {/* Image & Badges */}
      <div style={{ position: 'relative', height: '200px', overflow: 'hidden' }}>
        <img
          src={hospital.image_url}
          alt={hospital.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end' }}>
          <Badge variant={hospital.emergency_available ? 'danger' : 'secondary'}>
            {hospital.emergency_available ? '24/7 Emergency ER' : 'Outpatient OPD Only'}
          </Badge>
          <Badge variant={isOpen ? 'success' : 'warning'}>
            {isOpen ? 'Open Now' : 'OPD Closed'}
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

      {/* Hospital Content */}
      <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: '800', margin: 0, lineHeight: 1.3 }}>
          {hospital.name}
        </h2>

        {/* Department / Specialty Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {recommendedDept ? (
            <Badge variant="teal" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
              Recommended: {recommendedDept}
            </Badge>
          ) : (
            hospital.departments.slice(0, 3).map((dept) => (
              <Badge key={dept} variant="primary" style={{ fontSize: '0.65rem' }}>
                {dept}
              </Badge>
            ))
          )}
        </div>

        <p style={{ color: 'var(--cp-subtext)', fontSize: '0.85rem', lineHeight: '1.4', margin: 0 }}>
          {hospital.description}
        </p>

        {/* Smart Metadata details */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.6rem',
          background: 'var(--cp-bg)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem',
          fontSize: '0.775rem',
          color: 'var(--cp-text)',
          border: '1px solid var(--cp-border)',
          margin: '0.25rem 0'
        }}>
          <div>
            <span style={{ color: 'var(--cp-subtext)', display: 'block', fontSize: '0.7rem' }}>Distance:</span>
            <strong>{hospital.distance_km} km</strong>
          </div>
          <div>
            <span style={{ color: 'var(--cp-subtext)', display: 'block', fontSize: '0.7rem' }}>Consultation Fee:</span>
            <strong>₹{hospital.consultation_fee}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--cp-subtext)', display: 'block', fontSize: '0.7rem' }}>Estimated Wait:</span>
            <strong>{estWaitingTime}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--cp-subtext)', display: 'block', fontSize: '0.7rem' }}>Next Appointment:</span>
            <strong>{nextSlotTime}</strong>
          </div>
          <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--cp-border)', paddingTop: '0.4rem', marginTop: '0.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Available Doctors: <strong>{doctorsCount}</strong></span>
            <span style={{ color: 'var(--cp-success)', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}>
              <FiCheck /> Available Today
            </span>
          </div>
        </div>

        {/* Info Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--cp-subtext)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FiMapPin style={{ color: 'var(--cp-primary)', flexShrink: 0 }} />
            <span className="text-truncate">{hospital.address}, {hospital.city}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FiClock style={{ color: 'var(--cp-primary)', flexShrink: 0 }} />
            <span>{hospital.opening_hours}</span>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ borderTop: '1px solid var(--cp-border)', paddingTop: '0.85rem', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {hospital.phone && (
            <a href={`tel:${hospital.phone}`} style={{ color: 'var(--cp-subtext)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}>
              <FiPhone /> Call Hospital
            </a>
          )}
          <Link
            className="btn btn-primary"
            to="/appointments"
            state={{
              hospitalId: hospital.id,
              department: recommendedDept || hospital.departments[0]
            }}
            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
          >
            <FiCalendar /> Book Appointment
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

export default HospitalCard;
