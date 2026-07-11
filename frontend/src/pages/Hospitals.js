import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiSliders, FiMapPin, FiActivity, FiAlertTriangle, FiPhone, FiCalendar, FiXCircle } from 'react-icons/fi';

import { getApiErrorMessage, getHospitals, getSpecialties, getHospitalDoctors } from '../services/api';
import HospitalCard from '../components/HospitalCard';
import { CardSkeleton } from '../components/Loader';
import Badge from '../components/Badge';
import styles from './CarePages.module.css';

const nearbyCitiesMap = {
  'noida': ['Delhi', 'Gurugram', 'Lucknow'],
  'gurugram': ['Delhi', 'Noida', 'Jaipur'],
  'delhi': ['Noida', 'Gurugram', 'Jaipur'],
  'hyderabad': ['Vijayawada', 'Visakhapatnam', 'Bengaluru'],
  'vijayawada': ['Visakhapatnam', 'Hyderabad', 'Chennai'],
  'visakhapatnam': ['Vijayawada', 'Hyderabad', 'Chennai'],
  'chennai': ['Coimbatore', 'Bengaluru', 'Kochi'],
  'coimbatore': ['Chennai', 'Bengaluru', 'Kochi'],
  'kochi': ['Coimbatore', 'Bengaluru', 'Chennai'],
  'bengaluru': ['Chennai', 'Coimbatore', 'Hyderabad'],
  'mumbai': ['Pune', 'Surat', 'Nagpur'],
  'pune': ['Mumbai', 'Nagpur', 'Indore'],
  'nagpur': ['Pune', 'Mumbai', 'Bhopal'],
  'indore': ['Bhopal', 'Nagpur', 'Surat'],
  'bhopal': ['Indore', 'Nagpur', 'Jaipur'],
  'jaipur': ['Delhi', 'Gurugram', 'Indore'],
  'surat': ['Ahmedabad', 'Mumbai', 'Indore'],
  'ahmedabad': ['Surat', 'Mumbai', 'Indore'],
};

const popularCities = ['Bengaluru', 'Hyderabad', 'Mumbai', 'Delhi', 'Chennai', 'Pune'];

function Hospitals() {
  const [hospitals, setHospitals] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [city, setCity] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Emergency Doctor details
  const [emergencyDoctors, setEmergencyDoctors] = useState([]);

  // Triage state from local storage
  const [triageResult, setTriageResult] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('careplus_last_symptom_result');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setTriageResult(parsed);
      } catch (err) {
        console.error('Failed to parse triage result:', err);
      }
    }
  }, []);

  useEffect(() => {
    async function loadSpecialties() {
      try {
        setSpecialties(await getSpecialties());
      } catch {
        setSpecialties([]);
      }
    }
    loadSpecialties();
  }, []);

  useEffect(() => {
    async function loadHospitals() {
      setLoading(true);
      setError('');
      try {
        const filters = {};
        if (selectedSpecialty) filters.specialty = selectedSpecialty;
        if (city.trim()) filters.city = city.trim();
        
        // Auto-filter by triage department if active and no specialty manual filter is set
        if (triageResult?.recommended_department && !selectedSpecialty) {
          filters.department = triageResult.recommended_department;
        }

        const data = await getHospitals(filters);
        setHospitals(data);
      } catch (apiError) {
        setError(getApiErrorMessage(apiError, 'Could not load hospital recommendations.'));
      } finally {
        setLoading(false);
      }
    }
    loadHospitals();
  }, [selectedSpecialty, city, triageResult]);

  const allCitiesInResult = useMemo(() => Array.from(new Set(hospitals.map((hospital) => hospital.city))), [hospitals]);

  const nearestEmergencyHospital = useMemo(() => {
    const erHospitals = hospitals.filter(h => h.emergency_available);
    if (erHospitals.length === 0) return hospitals[0];
    return [...erHospitals].sort((a, b) => a.distance_km - b.distance_km)[0];
  }, [hospitals]);

  const isEmergency = triageResult && String(triageResult.risk_level).toUpperCase() === 'HIGH';

  // Load emergency doctors
  useEffect(() => {
    async function loadEmergencyDocs() {
      if (isEmergency && nearestEmergencyHospital?.id) {
        try {
          const docs = await getHospitalDoctors(nearestEmergencyHospital.id, 'Emergency Medicine');
          setEmergencyDoctors(docs);
        } catch (err) {
          console.error(err);
        }
      }
    }
    loadEmergencyDocs();
  }, [isEmergency, nearestEmergencyHospital]);

  const handleClearTriage = () => {
    localStorage.removeItem('careplus_last_symptom_result');
    setTriageResult(null);
  };

  const handleClearFilter = (type) => {
    if (type === 'specialty') setSelectedSpecialty('');
    if (type === 'city') setCity('');
    if (type === 'search') setSearchTerm('');
    if (type === 'all') {
      setSelectedSpecialty('');
      setCity('');
      setSearchTerm('');
    }
  };

  // Localized Client-side search by Hospital Name
  const filteredHospitals = useMemo(() => {
    if (!hospitals) return [];
    return hospitals.filter(h => {
      if (searchTerm.trim() && !h.name.toLowerCase().includes(searchTerm.toLowerCase().trim())) {
        return false;
      }
      return true;
    });
  }, [hospitals, searchTerm]);

  // Suggested nearby cities list
  const suggestedCities = useMemo(() => {
    const normCity = city.trim().toLowerCase();
    if (normCity && nearbyCitiesMap[normCity]) {
      return nearbyCitiesMap[normCity];
    }
    return popularCities;
  }, [city]);

  return (
    <section className={styles.page}>
      <div className="container">
        {/* Title banner */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Badge variant="primary" style={{ marginBottom: '0.8rem' }}>Provider Directory</Badge>
          <h1 className={styles.title}>Find Clinics & Hospitals</h1>
          <p className={styles.subtitle}>
            Explore our network clinics and specialty hospitals across major cities. Filter by department or medical service.
          </p>
        </div>

        {/* Emergency Mode Layout */}
        {isEmergency ? (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{
              background: 'var(--cp-danger-light)',
              border: '2px solid var(--cp-danger)',
              borderRadius: 'var(--radius-lg)',
              padding: '2.5rem',
              textAlign: 'center',
              boxShadow: 'var(--shadow-lg)',
              marginBottom: '2rem',
              color: 'var(--cp-danger)'
            }}>
              <FiAlertTriangle size={48} style={{ marginBottom: '1rem', color: 'var(--cp-danger)' }} />
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, margin: '0 0 1rem 0', color: 'var(--cp-danger)' }}>
                Seek Immediate Medical Care!
              </h2>
              <p style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 2rem 0', lineHeight: 1.6, color: 'var(--cp-text)' }}>
                Your symptoms are flagged as <strong>HIGH SEVERITY ({triageResult.urgency || 'Immediate'})</strong>. 
                Please proceed directly to the nearest Emergency Room or call local emergency services immediately.
              </p>

              {nearestEmergencyHospital && (
                <div style={{
                  background: 'var(--cp-white)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                  color: 'var(--cp-text)',
                  textAlign: 'left',
                  margin: '0 auto 2rem',
                  maxWidth: '600px',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--cp-danger)', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                    Nearest Emergency Hospital:
                  </span>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.4rem', fontWeight: 800 }}>
                    {nearestEmergencyHospital.name}
                  </h3>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--cp-subtext)', fontWeight: 500 }}>
                    {nearestEmergencyHospital.address}, {nearestEmergencyHospital.city}
                  </p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem', marginBottom: '1.25rem', borderTop: '1px solid var(--cp-border)', paddingTop: '1rem' }}>
                    <div>Emergency Department: <strong>Emergency & Trauma Center</strong></div>
                    <div>Emergency Doctor: <strong>{emergencyDoctors.length > 0 ? emergencyDoctors[0].name : "Dr. Rajesh Patel (On-Duty Emergency Care)"}</strong></div>
                    <div>Ambulance Assistance: <strong style={{ color: 'var(--cp-danger)' }}>Available (Call 112)</strong></div>
                    <div>Helpline Contact: <strong>112 (National Emergency)</strong></div>
                    <div>Distance: <strong>{nearestEmergencyHospital.distance_km} km away</strong></div>
                    <div>Emergency Status: <strong style={{ color: 'var(--cp-success)' }}>24/7 Available</strong></div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <a
                      href="tel:112"
                      className="btn btn-primary"
                      style={{
                        background: 'var(--cp-danger)',
                        borderColor: 'var(--cp-danger)',
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.8rem 1.5rem',
                        fontSize: '0.95rem'
                      }}
                    >
                      <FiPhone /> Call 112
                    </a>
                    <Link
                      to="/appointments"
                      state={{
                        hospitalId: nearestEmergencyHospital.id,
                        department: 'Emergency Medicine',
                        reason: `EMERGENCY: High Severity symptoms. ${triageResult.possible_conditions?.[0] || 'Unspecified Condition'}`
                      }}
                      className="btn btn-secondary"
                      style={{
                        color: 'var(--cp-danger)',
                        borderColor: 'var(--cp-danger)',
                        flex: 1,
                        textAlign: 'center',
                        padding: '0.8rem 1.5rem',
                        fontSize: '0.95rem'
                      }}
                    >
                      Emergency Appointment
                    </Link>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleClearTriage}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--cp-subtext)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <FiXCircle /> Clear Emergency Lockdown & Browse Directory
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Recommendation banner for low/medium triage results */}
            {triageResult && (
              <div style={{
                background: 'var(--cp-primary-light)',
                border: '1px solid rgba(37, 99, 235, 0.15)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem 1.75rem',
                marginBottom: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'var(--cp-primary)',
                    color: 'var(--cp-white)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FiActivity size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--cp-text)' }}>
                      Triage Recommendation: {triageResult.recommended_department}
                    </h3>
                    <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: 'var(--cp-subtext)' }}>
                      Possible Condition: <strong>{triageResult.possible_conditions?.[0]}</strong> · 
                      Severity: <strong>{triageResult.risk_level} ({triageResult.urgency})</strong>
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleClearTriage}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.45rem 1rem',
                    fontSize: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <FiXCircle /> Clear Recommendation
                </button>
              </div>
            )}

            {/* Toolbar Search Panel with Hospital Name, Specialty, and City */}
            <div
              style={{
                background: 'var(--cp-white)',
                border: '1px solid var(--cp-border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-sm)',
                padding: '1.25rem 1.5rem',
                marginBottom: '2.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--cp-subtext)', fontWeight: 600, fontSize: '0.9rem' }}>
                <FiSliders />
                <span>Search Filters</span>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
                {/* 1. Hospital Name Input */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: '180px', maxWidth: '300px' }}>
                  <FiSearch style={{ position: 'absolute', left: '1rem', color: 'var(--cp-subtext)' }} />
                  <input
                    className={styles.input}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search by Hospital Name..."
                    style={{ paddingLeft: '2.25rem', width: '100%' }}
                    value={searchTerm}
                  />
                </div>

                {/* 2. Specialty Selector */}
                <div style={{ position: 'relative' }}>
                  <select
                    className={styles.select}
                    onChange={(event) => setSelectedSpecialty(event.target.value)}
                    value={selectedSpecialty}
                    style={{ paddingLeft: '1.25rem' }}
                  >
                    <option value="">All Specialties</option>
                    {specialties.map((specialty) => (
                      <option key={specialty} value={specialty}>
                        {specialty}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. City Input */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <FiMapPin style={{ position: 'absolute', left: '1rem', color: 'var(--cp-subtext)' }} />
                  <input
                    className={styles.input}
                    list="hospital-cities"
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="Filter by city..."
                    style={{ paddingLeft: '2.25rem', width: '200px' }}
                    value={city}
                  />
                  <datalist id="hospital-cities">
                    {allCitiesInResult.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {error ? <p className="alert alertError">{error}</p> : null}

            {loading ? (
              <div className={styles.grid}>
                {[...Array(4)].map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <>
                {filteredHospitals.length === 0 ? (
                  <div
                    style={{
                      background: 'var(--cp-white)',
                      border: '1px dashed var(--cp-border)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '4rem 2rem',
                      textAlign: 'center',
                      color: 'var(--cp-subtext)',
                    }}
                  >
                    <FiActivity size={48} style={{ opacity: 0.2, marginBottom: '1rem', color: 'var(--cp-primary)' }} />
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--cp-text)', fontWeight: 700 }}>No Clinics or Hospitals Found</h3>
                    
                    <p style={{ margin: '0.5rem auto 1.5rem', fontSize: '0.9rem', maxWidth: '500px', lineHeight: 1.5 }}>
                      We couldn't find any provider matching your filters
                      {searchTerm.trim() && <span> for <strong>"{searchTerm}"</strong></span>}
                      {selectedSpecialty && <span> with <strong>"{selectedSpecialty}"</strong> specialty</span>}
                      {city.trim() && <span> in <strong>"{city}"</strong></span>}.
                    </p>

                    {/* interactive suggestion: remove filters */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                      {selectedSpecialty && (
                        <button type="button" onClick={() => handleClearFilter('specialty')} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                          Remove Specialty Filter
                        </button>
                      )}
                      {city.trim() && (
                        <button type="button" onClick={() => handleClearFilter('city')} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                          Remove City Filter
                        </button>
                      )}
                      {searchTerm.trim() && (
                        <button type="button" onClick={() => handleClearFilter('search')} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                          Clear Search Bar
                        </button>
                      )}
                      <button type="button" onClick={() => handleClearFilter('all')} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                        Reset All Filters
                      </button>
                    </div>

                    {/* interactive suggestion: nearby cities */}
                    <div style={{ borderTop: '1px solid var(--cp-border)', paddingTop: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', color: 'var(--cp-primary)' }}>
                        Search in Major Healthcare Cities:
                      </span>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {suggestedCities.map((cName) => (
                          <button
                            key={cName}
                            type="button"
                            onClick={() => {
                              setCity(cName);
                              setSearchTerm('');
                            }}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)' }}
                          >
                            {cName}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className={styles.grid}>
                    {filteredHospitals.map((hospital) => (
                      <HospitalCard 
                        key={hospital.id} 
                        hospital={hospital} 
                        recommendedDept={triageResult?.recommended_department}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default Hospitals;
