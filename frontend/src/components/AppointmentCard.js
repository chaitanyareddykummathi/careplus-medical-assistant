import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiCalendar, FiClock, FiMapPin, FiUser, FiActivity } from 'react-icons/fi';
import Badge from './Badge';

function AppointmentCard({ appointment, onCancel, onReschedule }) {
  const isUpcoming = appointment.status === 'upcoming' || appointment.status === 'rescheduled';

  // Format date visually for Indian standards (DD/MM/YYYY)
  const formattedDate = useMemo(() => {
    const dStr = appointment.appointment_date;
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dStr;
  }, [appointment.appointment_date]);

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
        position: 'relative'
      }}
    >
      {/* Header info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <Badge variant={isUpcoming ? 'success' : 'danger'}>
            {appointment.status}
          </Badge>
          <span style={{ fontSize: '0.75rem', color: 'var(--cp-subtext)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            ID: #{String(appointment.id || '').slice(-6).toUpperCase()}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--cp-subtext)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <FiCalendar /> {formattedDate}
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
          {appointment.doctor_name}
        </h3>
        <span
          style={{
            display: 'block',
            fontSize: '0.8rem',
            color: 'var(--cp-subtext)',
            fontWeight: 500,
            marginBottom: '0.2rem',
          }}
        >
          {appointment.specialty} · {appointment.department}
        </span>
        <span
          style={{
            display: 'block',
            fontSize: '0.8rem',
            color: 'var(--cp-subtext)',
            fontWeight: 500,
          }}
        >
          Patient: <strong>{appointment.patient_name}</strong>
        </span>
      </div>

      {/* Location Row */}
      <div
        style={{
          borderTop: '1px solid var(--cp-border)',
          borderBottom: '1px solid var(--cp-border)',
          padding: '0.65rem 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem',
          fontSize: '0.8rem',
          color: 'var(--cp-text)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <FiActivity style={{ color: 'var(--cp-primary)' }} />
          <span>{appointment.hospital_name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--cp-subtext)' }}>
          <FiMapPin style={{ color: 'var(--cp-primary)' }} />
          <span className="text-truncate">{appointment.hospital_address}</span>
        </div>
      </div>

      {/* Reason row */}
      {appointment.reason && (
        <p
          style={{
            margin: 0,
            fontSize: '0.8rem',
            color: 'var(--cp-subtext)',
            lineHeight: 1.4,
            fontStyle: 'italic',
          }}
        >
          Reason: {appointment.reason}
        </p>
      )}

      {/* Actions */}
      {isUpcoming && (onReschedule || onCancel) && (
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
              Reschedule Appointment
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
