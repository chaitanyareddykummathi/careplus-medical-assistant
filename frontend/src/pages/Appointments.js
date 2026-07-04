import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCalendar,
  FiClock,
  FiUser,
  FiActivity,
  FiMapPin,
  FiInfo,
  FiCheckCircle,
  FiPhone,
  FiChevronRight,
  FiMonitor,
  FiBriefcase
} from 'react-icons/fi';

import {
  bookAppointment,
  cancelAppointment,
  getApiErrorMessage,
  getAppointments,
  getHospitals,
  rescheduleAppointment,
} from '../services/api';
import AppointmentCard from '../components/AppointmentCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { Spinner } from '../components/Loader';
import styles from './CarePages.module.css';

const timeSlots = ['09:30 AM', '10:30 AM', '11:30 AM', '02:30 PM', '04:00 PM', '06:00 PM'];
const pastAppointmentMessage =
  "You can't book this appointment because the selected date and time have already passed.";
const fallbackDiseaseCategories = [
  'Fever and infection',
  'Cold, cough and breathing issues',
  'Chest pain and heart symptoms',
  'Headache, dizziness and nerve symptoms',
  'Stomach pain and digestion',
  'Bone, joint and muscle pain',
  'Skin, allergy and rashes',
  'Diabetes and hormone concerns',
  'Eye, ENT and dental concerns',
  'Mental health and sleep concerns',
];

function getTodayValue() {
  const today = new Date();
  const timezoneOffset = today.getTimezoneOffset() * 60000;
  return new Date(today.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function parseTimeSlot(slot) {
  const match = /^(\d{1,2}):(\d{2})\s?(AM|PM)$/i.exec(slot.trim());
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return { hours, minutes };
}

function isPastAppointment(appointmentDate, timeSlot) {
  if (!appointmentDate) return false;

  const todayValue = getTodayValue();
  if (appointmentDate < todayValue) return true;
  if (appointmentDate > todayValue) return false;

  const parsed = parseTimeSlot(timeSlot);
  if (!parsed) return false;

  const now = new Date();
  const selected = new Date();
  selected.setHours(parsed.hours, parsed.minutes, 0, 0);
  return selected <= now;
}

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
    disease_category: '',
    patient_name: user?.name || '',
    reason: '',
  });
  
  // Custom states for redesign
  const [consultationType, setConsultationType] = useState('offline'); // online vs offline
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastBookedDetails, setLastBookedDetails] = useState(null);

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
  
  const diseaseCategories = useMemo(
    () =>
      selectedHospital?.disease_categories?.length
        ? selectedHospital.disease_categories
        : fallbackDiseaseCategories,
    [selectedHospital]
  );
  
  const doctorOptions = useMemo(() => {
    if (!selectedHospital) return [];
    const matchingDoctors = selectedHospital.doctors.filter((doctor) => doctor.department === form.department);
    return matchingDoctors.length > 0 ? matchingDoctors : selectedHospital.doctors;
  }, [selectedHospital, form.department]);

  const selectedDoctor = useMemo(() => {
    return doctorOptions.find((doctor) => doctor.id === form.doctor_id) || doctorOptions[0];
  }, [doctorOptions, form.doctor_id]);

  useEffect(() => {
    if (!selectedHospital) return;
    setForm((prev) => ({
      ...prev,
      department: selectedHospital.departments.includes(prev.department)
        ? prev.department
        : selectedHospital.departments[0] || '',
      disease_category: diseaseCategories.includes(prev.disease_category)
        ? prev.disease_category
        : diseaseCategories[0] || '',
    }));
  }, [selectedHospital, diseaseCategories]);

  useEffect(() => {
    if (!selectedHospital) return;
    setForm((prev) => {
      const matchingDoctor = doctorOptions.find((doctor) => doctor.id === prev.doctor_id) || doctorOptions[0];
      return { ...prev, doctor_id: matchingDoctor?.id || '' };
    });
  }, [selectedHospital, doctorOptions]);

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

    if (isPastAppointment(form.appointment_date, form.time_slot)) {
      setError(pastAppointmentMessage);
      return;
    }

    setSaving(true);
    try {
      const reason = form.reason?.trim()
        ? `${form.disease_category}: [${consultationType.toUpperCase()}] ${form.reason.trim()}`
        : `${form.disease_category}: [${consultationType.toUpperCase()}]`;
      const { disease_category, ...bookingPayload } = form;
      
      const created = await bookAppointment({ ...bookingPayload, reason });
      
      setLastBookedDetails({
        hospitalName: selectedHospital?.name,
        doctorName: selectedDoctor?.name,
        date: form.appointment_date,
        slot: form.time_slot,
        type: consultationType,
      });
      setShowSuccessModal(true);
      
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
      setSuccess('Appointment cancelled successfully.');
      await refreshAppointments();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Could not cancel appointment.'));
    }
  };

  const handleQuickReschedule = async (appointment) => {
    setError('');
    setSuccess('');
    if (isPastAppointment(appointment.appointment_date, '06:00 PM')) {
      setError(pastAppointmentMessage);
      return;
    }

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
        {/* Title banner */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Badge variant="primary" style={{ marginBottom: '0.8rem' }}>Reservation Hub</Badge>
          <h1 className={styles.title}>Book doctor appointments</h1>
          <p className={styles.subtitle}>
            Select a network hospital, state your department category, configure your preferred slot, and manage upcoming schedules.
          </p>
        </div>

        {error ? <p className="alert alertError"><FiInfo /> {error}</p> : null}
        {success ? <p className="alert alertSuccess"><FiCheckCircle /> {success}</p> : null}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Spinner size="3rem" />
          </div>
        ) : (
          <div className={styles.twoColumn}>
            {/* Booking Form Card */}
            <form className={styles.card} onSubmit={handleSubmit}>
              <h3 className={styles.cardTitle} style={{ borderBottom: '1px solid var(--cp-border)', paddingBottom: '0.8rem' }}>
                Consultation details
              </h3>

              {/* Consultation type toggle */}
              <div>
                <span className="form-label">Consultation Mode</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={() => setConsultationType('offline')}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid',
                      borderColor: consultationType === 'offline' ? 'var(--cp-primary)' : 'var(--cp-border)',
                      background: consultationType === 'offline' ? 'var(--cp-primary-light)' : 'var(--cp-white)',
                      color: consultationType === 'offline' ? 'var(--cp-primary)' : 'var(--cp-subtext)',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.25s',
                    }}
                  >
                    <FiMapPin /> In-Person Visit
                  </button>
                  <button
                    type="button"
                    onClick={() => setConsultationType('online')}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid',
                      borderColor: consultationType === 'online' ? 'var(--cp-primary)' : 'var(--cp-border)',
                      background: consultationType === 'online' ? 'var(--cp-primary-light)' : 'var(--cp-white)',
                      color: consultationType === 'online' ? 'var(--cp-primary)' : 'var(--cp-subtext)',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.25s',
                    }}
                  >
                    <FiMonitor /> Online Teleconsult
                  </button>
                </div>
              </div>

              {/* Hospital Selection */}
              <label className={styles.label}>
                Hospital / Clinic
                <select className={styles.select} name="hospital_id" onChange={handleChange} value={form.hospital_id}>
                  {hospitals.map((hospital) => (
                    <option key={hospital.id} value={hospital.id}>
                      {hospital.name} ({hospital.city})
                    </option>
                  ))}
                </select>
              </label>

              {/* Doctor Details Summary Alert */}
              {selectedHospital && (
                <div style={{ background: 'var(--cp-bg)', border: '1px solid var(--cp-border)', borderRadius: 'var(--radius-md)', padding: '1rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--cp-subtext)' }}>Clinic Location:</span>
                    <strong>{selectedHospital.address}, {selectedHospital.city}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--cp-subtext)' }}>OPD Base Fee:</span>
                    <strong>₹{selectedHospital.consultation_fee}</strong>
                  </div>
                </div>
              )}

              {/* Disease & Department select row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <label className={styles.label}>
                  Disease Category
                  <select
                    className={styles.select}
                    name="disease_category"
                    onChange={handleChange}
                    value={form.disease_category}
                  >
                    {diseaseCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.label}>
                  Clinical Department
                  <select className={styles.select} name="department" onChange={handleChange} value={form.department}>
                    {(selectedHospital?.departments || []).map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Doctor selection */}
              <label className={styles.label}>
                Available Doctors
                <select className={styles.select} name="doctor_id" onChange={handleChange} value={form.doctor_id}>
                  {doctorOptions.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} ({doctor.specialty} · {doctor.experience_years} yrs exp)
                    </option>
                  ))}
                </select>
              </label>

              {/* Date & Time slot Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <label className={styles.label}>
                  Appointment Date
                  <input
                    className={styles.input}
                    min={getTodayValue()}
                    name="appointment_date"
                    onChange={handleChange}
                    type="date"
                    value={form.appointment_date}
                  />
                </label>

                <label className={styles.label}>
                  Preferred Time Slot
                  <select className={styles.select} name="time_slot" onChange={handleChange} value={form.time_slot}>
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className={styles.label}>
                Patient Name
                <input className={styles.input} name="patient_name" onChange={handleChange} value={form.patient_name} placeholder="Full Name" />
              </label>

              <label className={styles.label}>
                Reason for appointment
                <textarea
                  className={styles.textarea}
                  name="reason"
                  onChange={handleChange}
                  placeholder="Describe your health concern briefly..."
                  value={form.reason}
                />
              </label>

              <button className={styles.actionButton} disabled={saving} type="submit">
                {saving ? 'Processing Reservation...' : 'Confirm Appointment Reservation'}
              </button>
            </form>

            {/* Upcoming Appointments List Column */}
            <div className={styles.card} style={{ alignSelf: 'start' }}>
              <h3 className={styles.cardTitle} style={{ borderBottom: '1px solid var(--cp-border)', paddingBottom: '0.8rem' }}>
                Upcoming Consultations ({appointments.filter(a => a.status !== 'cancelled').length})
              </h3>
              
              {appointments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--cp-subtext)' }}>
                  <FiCalendar size={40} style={{ opacity: 0.15, marginBottom: '0.75rem' }} />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>No consultation bookings found.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem', maxHeight: '550px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {appointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onCancel={() => handleCancel(appointment.id)}
                      onReschedule={() => handleQuickReschedule(appointment)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Success Modal */}
        <Modal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          title="Booking Confirmed!"
        >
          {lastBookedDetails && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', textAlign: 'center' }}>
              {/* Checkmark animation wrapper */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 12 }}
                style={{ color: 'var(--cp-success)' }}
              >
                <FiCheckCircle size={60} />
              </motion.div>

              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.2rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
                  Reservation Successful
                </h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--cp-subtext)' }}>
                  Your appointment slot has been recorded in the CarePlus network database.
                </p>
              </div>

              {/* Booking Summary Box */}
              <div
                style={{
                  background: 'var(--cp-bg)',
                  border: '1px solid var(--cp-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem 1.25rem',
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  fontSize: '0.875rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--cp-subtext)' }}>Doctor:</span>
                  <strong>{lastBookedDetails.doctorName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--cp-subtext)' }}>Hospital:</span>
                  <strong>{lastBookedDetails.hospitalName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--cp-subtext)' }}>Date & Slot:</span>
                  <strong>{lastBookedDetails.date} · {lastBookedDetails.slot}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--cp-subtext)' }}>Mode:</span>
                  <Badge variant={lastBookedDetails.type === 'online' ? 'teal' : 'primary'}>
                    {lastBookedDetails.type === 'online' ? 'Online Video' : 'In-Person'}
                  </Badge>
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => setShowSuccessModal(false)}
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                Done
              </button>
            </div>
          )}
        </Modal>
      </div>
    </section>
  );
}

export default Appointments;
