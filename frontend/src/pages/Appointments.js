import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import {
  bookAppointment,
  cancelAppointment,
  getApiErrorMessage,
  getAppointments,
  getHospitals,
  rescheduleAppointment,
} from '../services/api';
import styles from './CarePages.module.css';

const timeSlots = ['09:30 AM', '10:30 AM', '11:30 AM', '02:30 PM', '04:00 PM', '06:00 PM'];

function Appointments({ user }) {
  const location = useLocation();
  const [hospitals, setHospitals] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState({
    hospital_id: location.state?.hospitalId || '',
    department: '',
    doctor_id: '',
    appointment_date: '',
    time_slot: timeSlots[0],
    patient_name: user?.name || '',
    reason: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [hospitalData, appointmentData] = await Promise.all([getHospitals(), getAppointments()]);
        setHospitals(hospitalData);
        setAppointments(appointmentData);
        if (!form.hospital_id && hospitalData[0]) {
          setForm((prev) => ({ ...prev, hospital_id: hospitalData[0].id }));
        }
      } catch (apiError) {
        setError(getApiErrorMessage(apiError, 'Could not load booking information.'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const selectedHospital = useMemo(
    () => hospitals.find((hospital) => hospital.id === form.hospital_id),
    [hospitals, form.hospital_id]
  );

  useEffect(() => {
    if (!selectedHospital) return;
    setForm((prev) => {
      const department = selectedHospital.departments.includes(prev.department)
        ? prev.department
        : selectedHospital.departments[0] || '';
      const matchingDoctor =
        selectedHospital.doctors.find((doctor) => doctor.id === prev.doctor_id) || selectedHospital.doctors[0];
      return {
        ...prev,
        department,
        doctor_id: matchingDoctor?.id || '',
      };
    });
  }, [selectedHospital]);

  const refreshAppointments = async () => {
    setAppointments(await getAppointments());
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.appointment_date) {
      setError('Please choose an appointment date.');
      return;
    }

    setSaving(true);
    try {
      await bookAppointment(form);
      setSuccess('Appointment booked successfully.');
      await refreshAppointments();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Could not book appointment.'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (appointmentId) => {
    setError('');
    setSuccess('');
    try {
      await cancelAppointment(appointmentId);
      setSuccess('Appointment cancelled.');
      await refreshAppointments();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Could not cancel appointment.'));
    }
  };

  const handleQuickReschedule = async (appointment) => {
    setError('');
    setSuccess('');
    try {
      await rescheduleAppointment(appointment.id, {
        appointment_date: appointment.appointment_date,
        time_slot: '06:00 PM',
      });
      setSuccess('Appointment rescheduled to 06:00 PM.');
      await refreshAppointments();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Could not reschedule appointment.'));
    }
  };

  return (
    <section className={styles.page}>
      <div className="container">
        <p className={styles.eyebrow}>Appointment booking</p>
        <h1 className={styles.title}>Book and manage appointments</h1>
        <p className={styles.subtitle}>
          Select a simulated hospital, department, doctor and time slot. Booking history is stored in the backend.
        </p>

        {error ? <p className="alert alertError">{error}</p> : null}
        {success ? <p className="alert alertSuccess">{success}</p> : null}
        {loading ? <p className={styles.muted}>Loading appointments...</p> : null}

        <div className={`${styles.twoColumn} ${styles.section}`}>
          <form className={`${styles.card} ${styles.formGrid}`} onSubmit={handleSubmit}>
            <label className={styles.label}>
              Hospital
              <select className={styles.select} name="hospital_id" onChange={handleChange} value={form.hospital_id}>
                {hospitals.map((hospital) => (
                  <option key={hospital.id} value={hospital.id}>
                    {hospital.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              Department
              <select className={styles.select} name="department" onChange={handleChange} value={form.department}>
                {(selectedHospital?.departments || []).map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              Doctor
              <select className={styles.select} name="doctor_id" onChange={handleChange} value={form.doctor_id}>
                {(selectedHospital?.doctors || []).map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name} · {doctor.specialty}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              Date
              <input className={styles.input} name="appointment_date" onChange={handleChange} type="date" value={form.appointment_date} />
            </label>

            <label className={styles.label}>
              Time Slot
              <select className={styles.select} name="time_slot" onChange={handleChange} value={form.time_slot}>
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              Patient Name
              <input className={styles.input} name="patient_name" onChange={handleChange} value={form.patient_name} />
            </label>

            <label className={styles.label}>
              Reason
              <textarea className={styles.textarea} name="reason" onChange={handleChange} placeholder="Briefly describe the concern" value={form.reason} />
            </label>

            <button className={styles.button} disabled={saving} type="submit">
              {saving ? 'Booking...' : 'Book Appointment'}
            </button>
          </form>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Upcoming Appointments</h2>
            {appointments.length === 0 ? <p className={styles.muted}>No appointments yet.</p> : null}
            {appointments.map((appointment) => (
              <article className={styles.card} key={appointment.id} style={{ boxShadow: 'none', marginTop: '0.8rem' }}>
                <div className={styles.metaRow}>
                  <span
                    className={`${styles.status} ${
                      appointment.status === 'cancelled' ? styles.statusCancelled : styles.statusUpcoming
                    }`}
                  >
                    {appointment.status}
                  </span>
                  <span className={styles.pill}>{appointment.appointment_date}</span>
                  <span className={styles.pill}>{appointment.time_slot}</span>
                </div>
                <h3 className={styles.cardTitle}>{appointment.hospital_name}</h3>
                <p className={styles.muted}>
                  {appointment.doctor_name} · {appointment.department}
                </p>
                {appointment.status !== 'cancelled' ? (
                  <div className={styles.metaRow}>
                    <button className={styles.secondaryButton} onClick={() => handleQuickReschedule(appointment)} type="button">
                      Reschedule to Evening
                    </button>
                    <button className={styles.secondaryButton} onClick={() => handleCancel(appointment.id)} type="button">
                      Cancel
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Appointments;
