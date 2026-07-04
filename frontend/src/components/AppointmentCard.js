import React from 'react';
import { motion } from 'framer-motion';
import { FiCalendar, FiClock, FiMapPin, FiUser, FiActivity } from 'react-icons/fi';
import Badge from './Badge';

function AppointmentCard({ appointment, onCancel, onReschedule }) {
  const isUpcoming = appointment.status !== 'cancelled';

  return (
    <motion.article
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3 }}
      style={{
        background: 'var(--cp-white)',
        border: '1px solid var(--cp-border)',
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.875rem',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Header info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <Badge variant={isUpcoming ? 'success' : 'danger'}>
            {appointment.status}
          </Badge>
          <span style={{ fontSize: '0.75rem', color: 'var(--cp-subtext)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            ID: #{appointment.id.slice(-6).toUpperCase()}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--cp-subtext)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <FiCalendar /> {appointment.appointment_date}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <FiClock /> {appointment.time_slot}
          </span>
        </div>
      </div>

      {/* Main Details */}
      <div>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.1rem',
            fontWeight: '700',
            margin: '0 0 0.4rem 0',
            color: 'var(--cp-text)',
          }}
        >
          {appointment.hospital_name}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--cp-subtext)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FiUser style={{ color: 'var(--cp-primary)' }} />
            <span>Doctor: <strong>{appointment.doctor_name}</strong> ({appointment.department})</span>
          </div>
          {appointment.patient_name && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FiActivity style={{ color: 'var(--cp-accent)' }} />
              <span>Patient: {appointment.patient_name}</span>
            </div>
          )}
          {appointment.reason && (
            <div style={{ marginTop: '0.25rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--cp-bg)', fontSize: '0.8rem' }}>
              Reason: {appointment.reason}
            </div>
          )}
        </div>
      </div>

      {/* Action Row */}
      {isUpcoming && (onCancel || onReschedule) && (
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            borderTop: '1px solid var(--cp-border)',
            paddingTop: '0.875rem',
            marginTop: '0.25rem',
          }}
        >
          {onReschedule && (
            <button
              onClick={onReschedule}
              style={{
                flex: 1,
                padding: '0.5rem',
                fontSize: '0.8rem',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                border: '1px solid var(--cp-border)',
                background: 'var(--cp-white)',
                color: 'var(--cp-primary)',
                fontWeight: '600',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--cp-primary-light)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--cp-white)')}
            >
              Reschedule (6 PM)
            </button>
          )}

          {onCancel && (
            <button
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '0.5rem',
                fontSize: '0.8rem',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                background: 'var(--cp-white)',
                color: 'var(--cp-danger)',
                fontWeight: '600',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--cp-danger-light)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--cp-white)')}
            >
              Cancel Appointment
            </button>
          )}
        </div>
      )}
    </motion.article>
  );
}

export default AppointmentCard;
