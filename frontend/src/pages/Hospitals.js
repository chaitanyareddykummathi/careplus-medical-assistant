import React, { useEffect, useMemo, useState } from 'react';
import { FiSearch, FiSliders, FiMapPin, FiActivity } from 'react-icons/fi';

import { getApiErrorMessage, getHospitals, getSpecialties } from '../services/api';
import HospitalCard from '../components/HospitalCard';
import { CardSkeleton } from '../components/Loader';
import Badge from '../components/Badge';
import styles from './CarePages.module.css';

function Hospitals() {
  const [hospitals, setHospitals] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        setHospitals(await getHospitals(filters));
      } catch (apiError) {
        setError(getApiErrorMessage(apiError, 'Could not load hospital recommendations.'));
      } finally {
        setLoading(false);
      }
    }
    loadHospitals();
  }, [selectedSpecialty, city]);

  const cities = useMemo(() => Array.from(new Set(hospitals.map((hospital) => hospital.city))), [hospitals]);

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

        {/* Toolbar Search Panel */}
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
            {/* Specialty filter */}
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

            {/* City input */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <FiMapPin style={{ position: 'absolute', left: '1rem', color: 'var(--cp-subtext)' }} />
              <input
                className={styles.input}
                list="hospital-cities"
                onChange={(event) => setCity(event.target.value)}
                placeholder="Filter by city..."
                style={{ paddingLeft: '2.25rem', width: '220px' }}
                value={city}
              />
              <datalist id="hospital-cities">
                {cities.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
          </div>
        </div>

        {error ? <p className="alert alertError">{error}</p> : null}

        {loading ? (
          // Shimmer loading cards
          <div className={styles.grid}>
            {[...Array(4)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            {hospitals.length === 0 ? (
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
                <FiActivity size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--cp-text)', fontWeight: 700 }}>No Hospitals Found</h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>Try modifying your city filters or specialty categories.</p>
              </div>
            ) : (
              <div className={styles.grid}>
                {hospitals.map((hospital) => (
                  <HospitalCard key={hospital.id} hospital={hospital} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default Hospitals;
