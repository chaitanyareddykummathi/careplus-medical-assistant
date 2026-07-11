import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiCalendar,
  FiClock,
  FiUser,
  FiActivity,
  FiMapPin,
  FiInfo,
  FiCheckCircle,
  FiChevronRight,
  FiAlertTriangle,
  FiPhone,
  FiX
} from 'react-icons/fi';

import {
  bookAppointment,
  cancelAppointment,
  getApiErrorMessage,
  getAppointments,
  getLocations,
  getLocationHospitals,
  getHospitalDoctors,
  getDoctorAvailability,
  rescheduleAppointment,
} from '../services/api';
import AppointmentCard from '../components/AppointmentCard';
import DoctorCard from '../components/DoctorCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { Spinner } from '../components/Loader';
import styles from './CarePages.module.css';

const timeSlots = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM'
];

function getTodayValue() {
  const today = new Date();
  const timezoneOffset = today.getTimezoneOffset() * 60000;
  return new Date(today.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function formatIndianDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
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

  // Wizard Steps: 1 = Location/Hospital select, 2 = Doctor select, 3 = Date & Slot select, 4 = Details/Confirm, 5 = Confirmed
  const [bookingStep, setBookingStep] = useState(1);
  const [appointments, setAppointments] = useState([]);

  // Selections
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [liveAvailabilities, setLiveAvailabilities] = useState([]);

  const [patientName, setPatientName] = useState(user?.name || '');
  const [visitReason, setVisitReason] = useState('');
  const [consultationMode, setConsultationMode] = useState('offline');

  // Rescheduling states
  const [rescheduleApt, setRescheduleApt] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState('');
  const [rescheduleLiveAvailabilities, setRescheduleLiveAvailabilities] = useState([]);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Success screen details
  const [confirmedDetails, setConfirmedDetails] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Triage details
  const [triageInfo, setTriageInfo] = useState(null);

  // 1. Fetch initial appointments & locations
  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const [locList, aptList] = await Promise.all([getLocations(), getAppointments()]);
        if (!isMounted) return;

        setLocations(locList);
        setAppointments(aptList);

        // Load triage info
        const stored = localStorage.getItem('careplus_last_symptom_result');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setTriageInfo(parsed);
            if (parsed.recommended_department) {
              setSelectedDept(parsed.recommended_department);
            }
          } catch (e) {
            console.error(e);
          }
        }

        // Handle routing state redirection triggers
        if (location.state?.hospitalId) {
          // If redirected with specific hospital, load its city
          const allHospitals = await getLocationHospitals('');
          const target = allHospitals.find(h => h.id === location.state.hospitalId);
          if (target && isMounted) {
            setSelectedLocation(target.city);
            // Fetch hospitals for that city
            const cityHosp = await getLocationHospitals(target.city);
            setHospitals(cityHosp);
            setSelectedHospitalId(target.id);
            if (location.state.department) {
              setSelectedDept(location.state.department);
            }
            if (location.state.reason) {
              setVisitReason(location.state.reason);
            }
          }
        } else if (locList.length > 0 && isMounted) {
          // Default select first location
          const defaultLoc = locList[0].id;
          setSelectedLocation(defaultLoc);
          const cityHosp = await getLocationHospitals(defaultLoc);
          setHospitals(cityHosp);
          if (cityHosp.length > 0) {
            setSelectedHospitalId(cityHosp[0].id);
          }
        }
      } catch (apiError) {
        setError(getApiErrorMessage(apiError, 'Could not load booking information.'));
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [location.state]);

  // 2. Load doctors when hospital or department changes
  useEffect(() => {
    let isMounted = true;
    async function fetchDoctors() {
      if (!selectedHospitalId || !selectedDept) {
        setDoctors([]);
        return;
      }
      try {
        const docs = await getHospitalDoctors(selectedHospitalId, selectedDept);
        if (isMounted) {
          setDoctors(docs);
          if (docs.length > 0) {
            setSelectedDoctorId(docs[0].id);
          } else {
            setSelectedDoctorId('');
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchDoctors();
    return () => {
      isMounted = false;
    };
  }, [selectedHospitalId, selectedDept]);

  // 3. Load live slot availabilities for booking
  useEffect(() => {
    let isMounted = true;
    async function loadSlots() {
      if (!selectedDoctorId || !selectedDate) {
        setLiveAvailabilities([]);
        return;
      }
      try {
        const slots = await getDoctorAvailability(selectedDoctorId, selectedDate);
        if (isMounted) {
          setLiveAvailabilities(slots);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadSlots();
    return () => {
      isMounted = false;
    };
  }, [selectedDoctorId, selectedDate]);

  // 4. Load live slot availabilities for rescheduling
  useEffect(() => {
    let isMounted = true;
    async function loadRescheduleSlots() {
      if (!rescheduleApt || !rescheduleDate) {
        setRescheduleLiveAvailabilities([]);
        return;
      }
      try {
        const slots = await getDoctorAvailability(rescheduleApt.doctor_id, rescheduleDate);
        if (isMounted) {
          setRescheduleLiveAvailabilities(slots);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadRescheduleSlots();
    return () => {
      isMounted = false;
    };
  }, [rescheduleApt, rescheduleDate]);

  // Cascading Location Handler
  const handleLocationChange = async (locName) => {
    setSelectedLocation(locName);
    setSelectedHospitalId('');
    setSelectedDoctorId('');
    setSelectedSlot('');
    setSelectedDate('');
    setDoctors([]);
    setLiveAvailabilities([]);
    
    if (locName) {
      try {
        const hospList = await getLocationHospitals(locName);
        setHospitals(hospList);
        
        // Stably select first hospital containing the department if possible
        const matchingHosp = hospList.find(h => h.departments.includes(selectedDept));
        if (matchingHosp) {
          setSelectedHospitalId(matchingHosp.id);
        } else if (hospList.length > 0) {
          setSelectedHospitalId(hospList[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      setHospitals([]);
    }
  };

  // Cascading Hospital Handler
  const handleHospitalChange = async (hospId) => {
    setSelectedHospitalId(hospId);
    setSelectedDoctorId('');
    setSelectedSlot('');
    setSelectedDate('');
    setDoctors([]);
    setLiveAvailabilities([]);

    if (hospId && selectedDept) {
      try {
        const docsList = await getHospitalDoctors(hospId, selectedDept);
        setDoctors(docsList);
        if (docsList.length > 0) {
          setSelectedDoctorId(docsList[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Cascading Department Handler
  const handleDepartmentChange = async (deptName) => {
    setSelectedDept(deptName);
    setSelectedDoctorId('');
    setSelectedSlot('');
    setSelectedDate('');
    setDoctors([]);
    setLiveAvailabilities([]);

    if (selectedHospitalId) {
      try {
        const docsList = await getHospitalDoctors(selectedHospitalId, deptName);
        setDoctors(docsList);
        if (docsList.length > 0) {
          setSelectedDoctorId(docsList[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const selectedHospital = useMemo(
    () => hospitals.find((h) => h.id === selectedHospitalId),
    [hospitals, selectedHospitalId]
  );

  const selectedDoctor = useMemo(() => {
    return doctors.find((d) => d.id === selectedDoctorId) || doctors[0];
  }, [doctors, selectedDoctorId]);

  // Check if department exists in selected location
  const locationHasDept = useMemo(() => {
    if (!selectedDept || hospitals.length === 0) return true;
    return hospitals.some(h => h.departments.includes(selectedDept));
  }, [hospitals, selectedDept]);

  // Fallback suggestion hospitals in the SAME city/location
  const alternativeHospitals = useMemo(() => {
    if (!selectedDept || !hospitals) return [];
    return hospitals.filter(h => h.id !== selectedHospitalId && h.departments.includes(selectedDept));
  }, [hospitals, selectedHospitalId, selectedDept]);

  const getSlotStatus = (slot, forReschedule = false) => {
    const activeDate = forReschedule ? rescheduleDate : selectedDate;
    const activeList = forReschedule ? rescheduleLiveAvailabilities : liveAvailabilities;

    const isPast = isPastAppointment(activeDate, slot);
    if (isPast) return { label: `${slot} (Passed)`, disabled: true };

    const match = activeList.find(a => a.time_slot === slot);
    if (match && match.is_booked) return { label: `${slot} (Booked)`, disabled: true };
    if (!match) {
      return { label: `${slot} (Unavailable)`, disabled: true };
    }

    return { label: slot, disabled: false };
  };

  const refreshAppointments = async () => {
    try {
      const data = await getAppointments();
      setAppointments(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBook = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedDate) {
      setError('Please choose a consultation date.');
      return;
    }
    if (!selectedSlot) {
      setError('Please select an available time slot.');
      return;
    }

    setSaving(true);
    try {
      const reasonStr = visitReason.trim()
        ? `[${consultationMode.toUpperCase()}] ${visitReason.trim()}`
        : `[${consultationMode.toUpperCase()}] General Outpatient Checkup`;

      const created = await bookAppointment({
        hospital_id: selectedHospitalId,
        department: selectedDept,
        doctor_id: selectedDoctorId || selectedDoctor?.id,
        appointment_date: selectedDate,
        time_slot: selectedSlot,
        patient_name: patientName,
        reason: reasonStr
      });

      setConfirmedDetails({
        id: created.id,
        doctorName: selectedDoctor?.name || 'Practitioner',
        hospitalName: selectedHospital?.name || 'CarePlus Clinic',
        department: selectedDept,
        date: selectedDate,
        slot: selectedSlot,
        mode: consultationMode
      });

      setBookingStep(5); // Show Confirmation Step
      setSuccess('Appointment reserved successfully.');
      await refreshAppointments();
      
      // Reset selections
      setSelectedDate('');
      setSelectedSlot('');
      setVisitReason('');
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Could not complete appointment reservation.'));
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

  const openRescheduleModal = (appointment) => {
    setRescheduleApt(appointment);
    setRescheduleDate(appointment.appointment_date);
    setRescheduleSlot(appointment.time_slot);
    setIsRescheduling(true);
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!rescheduleDate) {
      setError('Please select a reschedule date.');
      return;
    }
    if (!rescheduleSlot) {
      setError('Please select an available time slot.');
      return;
    }

    setSaving(true);
    try {
      await rescheduleAppointment(rescheduleApt.id, {
        appointment_date: rescheduleDate,
        time_slot: rescheduleSlot
      });
      setSuccess('Appointment rescheduled successfully.');
      setIsRescheduling(false);
      setRescheduleApt(null);
      await refreshAppointments();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to complete rescheduling.'));
    } finally {
      setSaving(false);
    }
  };

  const categorizedAppointments = useMemo(() => {
    return appointments.map((apt) => {
      const isPast = isPastAppointment(apt.appointment_date, apt.time_slot);
      let status = apt.status;
      if (isPast && (status === 'upcoming' || status === 'rescheduled')) {
        status = 'completed';
      }
      return { ...apt, status };
    });
  }, [appointments]);

  const upcomingAppointments = useMemo(() => {
    return categorizedAppointments.filter((apt) => apt.status === 'upcoming' || apt.status === 'rescheduled');
  }, [categorizedAppointments]);

  const completedAppointments = useMemo(() => {
    return categorizedAppointments.filter((apt) => apt.status === 'completed');
  }, [categorizedAppointments]);

  const cancelledAppointments = useMemo(() => {
    return categorizedAppointments.filter((apt) => apt.status === 'cancelled');
  }, [categorizedAppointments]);

  return (
    <section className={styles.page}>
      <div className="container">
        {/* Title banner */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Badge variant="primary" style={{ marginBottom: '0.8rem' }}>Reservation Hub</Badge>
          <h1 className={styles.title}>Book Doctor Appointments</h1>
          <p className={styles.subtitle}>
            Select location, choose clinic, select clinical specialist, and manage upcoming schedules in real-time.
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
            {/* Booking Wizard Section */}
            <div className={styles.card} style={{ minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
              
              {/* Wizard Steps Progress */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--cp-border)',
                paddingBottom: '1rem',
                marginBottom: '1rem'
              }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--cp-primary)', textTransform: 'uppercase' }}>
                  Booking Wizard (Step {bookingStep}/5)
                </span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {[1, 2, 3, 4].map(s => (
                    <div key={s} style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: bookingStep === s ? 'var(--cp-primary)' : bookingStep > s ? 'var(--cp-success)' : 'var(--cp-border)',
                      transition: 'background 0.3s'
                    }} />
                  ))}
                </div>
              </div>

              {/* Booking Step 1: Select Location, Hospital, Department */}
              {bookingStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                  <h3 className={styles.cardTitle}>Step 1: Choose Location & Clinic</h3>

                  {triageInfo && (
                    <div style={{ background: 'var(--cp-primary-light)', padding: '0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', border: '1px dashed var(--cp-primary)' }}>
                      <FiInfo style={{ marginRight: '0.35rem' }} />
                      Recommended Specialty: <strong>{triageInfo.recommended_department}</strong> is locked based on AI triage.
                    </div>
                  )}

                  {/* 1. Location Selector */}
                  <label className={styles.label}>
                    Select Location / City
                    <select
                      className={styles.select}
                      value={selectedLocation}
                      onChange={(e) => handleLocationChange(e.target.value)}
                    >
                      <option value="">Choose a Location</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </label>

                  {/* Department Warning if missing */}
                  {!locationHasDept && selectedLocation && (
                    <div style={{
                      background: 'var(--cp-danger-light)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      color: 'var(--cp-danger)',
                      fontSize: '0.85rem'
                    }}>
                      <FiAlertTriangle style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
                      <strong>No {selectedDept} specialists are available in {selectedLocation}.</strong>
                      <p style={{ margin: '0.25rem 0 0 0', color: 'var(--cp-text)', fontSize: '0.8rem' }}>
                        Please select a different location/city or choose another clinic department.
                      </p>
                    </div>
                  )}

                  {/* 2. Hospital Selector */}
                  <label className={styles.label}>
                    Select Hospital / Clinic
                    <select
                      className={styles.select}
                      value={selectedHospitalId}
                      onChange={(e) => handleHospitalChange(e.target.value)}
                      disabled={!selectedLocation}
                    >
                      <option value="">-- Choose Clinic --</option>
                      {hospitals.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </label>

                  {/* 3. Department Selector */}
                  <label className={styles.label}>
                    Clinical Department / Category
                    <select
                      className={styles.select}
                      value={selectedDept}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                      disabled={Boolean(triageInfo?.recommended_department)}
                    >
                      {selectedHospital?.departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      )) || (
                        <option value="">-- Select Department --</option>
                      )}
                    </select>
                  </label>

                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => setBookingStep(2)}
                    disabled={!selectedHospitalId || !selectedDept || !locationHasDept}
                  >
                    Continue to Doctors <FiChevronRight />
                  </button>
                </div>
              )}

              {/* Booking Step 2: Select Doctor (with alternative suggest fallback) */}
              {bookingStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                  <h3 className={styles.cardTitle}>Step 2: Select Clinical Specialist</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--cp-subtext)' }}>
                    Practitioners in <strong>{selectedDept}</strong> at <strong>{selectedHospital?.name}</strong>:
                  </span>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', overflowY: 'auto', maxHeight: '330px', paddingRight: '0.25rem' }}>
                    {doctors.length === 0 ? (
                      <div style={{
                        background: 'var(--cp-warning-light)',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1.25rem',
                        color: 'var(--cp-text)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}>
                        <h4 style={{ margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--cp-warning-dark)' }}>
                          <FiAlertTriangle /> No Doctors Available
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.4 }}>
                          There are currently no <strong>{selectedDept}</strong> doctors available at <strong>{selectedHospital?.name}</strong>.
                        </p>
                        
                        {alternativeHospitals.length > 0 ? (
                          <div style={{ marginTop: '0.5rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>
                              Alternative clinics in {selectedLocation} with {selectedDept} specialists:
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {alternativeHospitals.map(alt => (
                                <button
                                  key={alt.id}
                                  type="button"
                                  onClick={() => handleHospitalChange(alt.id)}
                                  className="btn btn-secondary"
                                  style={{
                                    textAlign: 'left',
                                    fontSize: '0.8rem',
                                    padding: '0.5rem 1rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}
                                >
                                  <span>{alt.name}</span>
                                  <span style={{ color: 'var(--cp-primary)', fontWeight: 700 }}>Switch Clinic &rarr;</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p style={{ margin: 0, fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--cp-subtext)' }}>
                            No other clinics in {selectedLocation} support the {selectedDept} department.
                          </p>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setBookingStep(1)}>
                            Change Location/Clinic
                          </button>
                        </div>
                      </div>
                    ) : (
                      doctors.map(doc => (
                        <DoctorCard
                          key={doc.id}
                          doctor={doc}
                          onBook={() => {
                            setSelectedDoctorId(doc.id);
                            setBookingStep(3);
                          }}
                        />
                      ))
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setBookingStep(1)}
                    style={{ marginTop: 'auto' }}
                  >
                    Back to Step 1
                  </button>
                </div>
              )}

              {/* Booking Step 3: Date & Slot Select (real-time availability check) */}
              {bookingStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                  <h3 className={styles.cardTitle}>Step 3: Choose Date & Available Slot</h3>
                  
                  {selectedDoctor && (
                    <div style={{ background: 'var(--cp-bg)', border: '1px solid var(--cp-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem', fontSize: '0.8rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <FiUser style={{ color: 'var(--cp-primary)' }} />
                      <div>
                        Selected Doctor: <strong>{selectedDoctor.name}</strong> ({selectedDoctor.specialty})
                      </div>
                    </div>
                  )}

                  <label className={styles.label}>
                    Choose Appointment Date
                    <input
                      type="date"
                      className={styles.input}
                      min={getTodayValue()}
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setSelectedSlot('');
                      }}
                    />
                  </label>

                  {selectedDate && (
                    <div>
                      <span className="form-label" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--cp-text)', display: 'block', marginBottom: '0.5rem' }}>
                        Preferred Time Slot (Live Availability)
                      </span>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))',
                        gap: '0.5rem',
                        maxHeight: '180px',
                        overflowY: 'auto'
                      }}>
                        {timeSlots.map(slot => {
                          const { disabled } = getSlotStatus(slot);
                          const isCurrentSelected = selectedSlot === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={disabled}
                              onClick={() => setSelectedSlot(slot)}
                              style={{
                                padding: '0.5rem',
                                fontSize: '0.75rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid',
                                borderColor: isCurrentSelected ? 'var(--cp-primary)' : 'var(--cp-border)',
                                background: isCurrentSelected ? 'var(--cp-primary-light)' : disabled ? 'var(--cp-bg)' : 'var(--cp-white)',
                                color: isCurrentSelected ? 'var(--cp-primary)' : disabled ? '#cbd5e1' : 'var(--cp-text)',
                                cursor: disabled ? 'not-allowed' : 'pointer',
                                fontWeight: '700',
                                opacity: disabled ? 0.6 : 1,
                                transition: 'all 0.2s'
                              }}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: 'auto', display: 'flex', gap: '1rem' }}>
                    <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setBookingStep(2)}>
                      Back
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      disabled={!selectedDate || !selectedSlot}
                      onClick={() => setBookingStep(4)}
                    >
                      Next Step <FiChevronRight />
                    </button>
                  </div>
                </div>
              )}

              {/* Booking Step 4: Confirm Patient Vitals & Details */}
              {bookingStep === 4 && (
                <form onSubmit={handleBook} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                  <h3 className={styles.cardTitle}>Step 4: Confirm Patient Details</h3>

                  <div style={{
                    background: 'var(--cp-bg)',
                    border: '1px solid var(--cp-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem',
                    fontSize: '0.8rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem'
                  }}>
                    <div>Location: <strong>{selectedLocation}</strong></div>
                    <div>Hospital: <strong>{selectedHospital?.name}</strong></div>
                    <div>Doctor: <strong>{selectedDoctor?.name}</strong> ({selectedDoctor?.specialty})</div>
                    <div>Schedule: <strong>{selectedDate} · {selectedSlot}</strong></div>
                  </div>

                  <div>
                    <span className="form-label" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--cp-text)', display: 'block', marginBottom: '0.4rem' }}>
                      Consultation Mode:
                    </span>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="consultationMode"
                          checked={consultationMode === 'offline'}
                          onChange={() => setConsultationMode('offline')}
                        />
                        In-Person Clinic Visit
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="consultationMode"
                          checked={consultationMode === 'online'}
                          onChange={() => setConsultationMode('online')}
                        />
                        Online Teleconsultation
                      </label>
                    </div>
                  </div>

                  <label className={styles.label}>
                    Patient Name
                    <input
                      type="text"
                      className={styles.input}
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Enter patient full name"
                      required
                    />
                  </label>

                  <label className={styles.label}>
                    Reason for Consultation
                    <textarea
                      className={styles.textarea}
                      value={visitReason}
                      onChange={(e) => setVisitReason(e.target.value)}
                      placeholder="Briefly state symptoms or health concerns..."
                      required
                    />
                  </label>

                  <div style={{ marginTop: 'auto', display: 'flex', gap: '1rem' }}>
                    <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setBookingStep(3)}>
                      Back
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      disabled={saving || !patientName.trim() || !visitReason.trim()}
                    >
                      {saving ? 'Processing...' : 'Confirm Booking'}
                    </button>
                  </div>
                </form>
              )}

              {/* Booking Step 5: Success Screen */}
              {bookingStep === 5 && confirmedDetails && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', textAlign: 'center', flex: 1, justifyContent: 'center' }}>
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 10 }}
                    style={{ color: 'var(--cp-success)' }}
                  >
                    <FiCheckCircle size={64} />
                  </motion.div>

                  <div>
                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.4rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--cp-success)' }}>
                      Appointment Confirmed!
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--cp-subtext)' }}>
                      Booking registered successfully. Carry your symptoms card to the triage.
                    </p>
                  </div>

                  <div style={{
                    background: 'var(--cp-bg)',
                    border: '1px solid var(--cp-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem',
                    width: '100%',
                    textAlign: 'left',
                    fontSize: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    <div>Booking ID: <strong style={{ color: 'var(--cp-primary)' }}>#CP{String(confirmedDetails.id).toUpperCase().slice(-6)}</strong></div>
                    <div>Clinic: <strong>{confirmedDetails.hospitalName}</strong></div>
                    <div>Doctor: <strong>{confirmedDetails.doctorName}</strong> ({confirmedDetails.department})</div>
                    <div>Date & Time: <strong>{formatIndianDate(confirmedDetails.date)} · {confirmedDetails.slot}</strong></div>
                    <div>Consultation: <strong>{confirmedDetails.mode === 'online' ? 'Online Teleconsult' : 'In-Person OPD'}</strong></div>
                    <div style={{ borderTop: '1px solid var(--cp-border)', paddingTop: '0.5rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--cp-subtext)' }}>
                      <strong>Instructions:</strong> Please arrive 15 minutes before your scheduled slot. Bring previous medical reports.
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: 'auto' }}
                    onClick={() => {
                      setBookingStep(1);
                      setConfirmedDetails(null);
                    }}
                  >
                    Book Another Appointment
                  </button>
                </div>
              )}

            </div>

            {/* Right side: Manage Appointments Column */}
            <div className={styles.card} style={{ alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h3 className={styles.cardTitle} style={{ borderBottom: '1px solid var(--cp-border)', paddingBottom: '0.8rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Upcoming Consultations</span>
                  <Badge variant="success">{upcomingAppointments.length}</Badge>
                </h3>
                {upcomingAppointments.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--cp-subtext)', margin: '0.5rem 0', textAlign: 'center', padding: '1rem 0' }}>No upcoming appointments scheduled.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                    {upcomingAppointments.map((appointment) => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        onCancel={() => handleCancel(appointment.id)}
                        onReschedule={() => openRescheduleModal(appointment)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className={styles.cardTitle} style={{ borderBottom: '1px solid var(--cp-border)', paddingBottom: '0.8rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Completed History</span>
                  <Badge variant="teal">{completedAppointments.length}</Badge>
                </h3>
                {completedAppointments.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--cp-subtext)', margin: '0.5rem 0', textAlign: 'center', padding: '1rem 0' }}>No completed appointments in history.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                    {completedAppointments.map((appointment) => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className={styles.cardTitle} style={{ borderBottom: '1px solid var(--cp-border)', paddingBottom: '0.8rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Cancelled Log</span>
                  <Badge variant="danger">{cancelledAppointments.length}</Badge>
                </h3>
                {cancelledAppointments.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--cp-subtext)', margin: '0.5rem 0', textAlign: 'center', padding: '1rem 0' }}>No cancelled appointments.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                    {cancelledAppointments.map((appointment) => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rescheduling Modal Popup */}
        <Modal
          isOpen={isRescheduling}
          onClose={() => {
            setIsRescheduling(false);
            setRescheduleApt(null);
          }}
          title="Reschedule Appointment"
        >
          {rescheduleApt && (
            <form onSubmit={handleRescheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{
                background: 'var(--cp-bg)',
                border: '1px solid var(--cp-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem',
                fontSize: '0.85rem'
              }}>
                <div>Doctor: <strong>{rescheduleApt.doctor_name}</strong></div>
                <div>Hospital: <strong>{rescheduleApt.hospital_name}</strong></div>
                <div>Current Slot: <strong>{formatIndianDate(rescheduleApt.appointment_date)} · {rescheduleApt.time_slot}</strong></div>
              </div>

              <label className={styles.label}>
                Select New Reschedule Date
                <input
                  type="date"
                  className={styles.input}
                  min={getTodayValue()}
                  value={rescheduleDate}
                  onChange={(e) => {
                    setRescheduleDate(e.target.value);
                    setRescheduleSlot('');
                  }}
                  required
                />
              </label>

              {rescheduleDate && (
                <div>
                  <span className="form-label" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--cp-text)', display: 'block', marginBottom: '0.5rem' }}>
                    Choose New Time Slot
                  </span>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))',
                    gap: '0.5rem',
                    maxHeight: '180px',
                    overflowY: 'auto'
                  }}>
                    {timeSlots.map(slot => {
                      const { disabled } = getSlotStatus(slot, true);
                      const isCurrentSelected = rescheduleSlot === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={disabled}
                          onClick={() => setRescheduleSlot(slot)}
                          style={{
                            padding: '0.5rem',
                            fontSize: '0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid',
                            borderColor: isCurrentSelected ? 'var(--cp-primary)' : 'var(--cp-border)',
                            background: isCurrentSelected ? 'var(--cp-primary-light)' : disabled ? 'var(--cp-bg)' : 'var(--cp-white)',
                            color: isCurrentSelected ? 'var(--cp-primary)' : disabled ? '#cbd5e1' : 'var(--cp-text)',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            fontWeight: '700',
                            opacity: disabled ? 0.6 : 1,
                            transition: 'all 0.2s'
                          }}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setIsRescheduling(false);
                    setRescheduleApt(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={saving || !rescheduleDate || !rescheduleSlot}
                >
                  {saving ? 'Saving...' : 'Confirm Reschedule'}
                </button>
              </div>
            </form>
          )}
        </Modal>

      </div>
    </section>
  );
}

export default Appointments;
