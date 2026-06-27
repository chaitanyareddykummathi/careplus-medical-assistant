import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { getApiErrorMessage, getHospitals, getSpecialties } from '../services/api';
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
        <p className={styles.eyebrow}>Hospital recommendation</p>
        <h1 className={styles.title}>Find hospitals by specialty</h1>
        <p className={styles.subtitle}>
          A simulated India-wide provider network for project booking flows, specialist mapping and triage handoff.
        </p>

        <div className={styles.toolbar}>
          <select
            className={styles.select}
            onChange={(event) => setSelectedSpecialty(event.target.value)}
            value={selectedSpecialty}
          >
            <option value="">All specialties</option>
            {specialties.map((specialty) => (
              <option key={specialty} value={specialty}>
                {specialty}
              </option>
            ))}
          </select>
          <input
            className={styles.input}
            list="hospital-cities"
            onChange={(event) => setCity(event.target.value)}
            placeholder="Filter by city"
            style={{ maxWidth: 260 }}
            value={city}
          />
          <datalist id="hospital-cities">
            {cities.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </div>

        {error ? <p className="alert alertError">{error}</p> : null}
        {loading ? <p className={styles.muted}>Loading hospitals...</p> : null}

        <div className={styles.grid}>
          {hospitals.map((hospital) => (
            <article className={styles.card} key={hospital.id}>
              <img alt={hospital.name} className={styles.hospitalImage} src={hospital.image_url} />
              <h2 className={styles.cardTitle}>{hospital.name}</h2>
              <p className={styles.muted}>
                {hospital.city}, {hospital.state} · {hospital.distance_km} km · Rating {hospital.rating}
              </p>
              <p className={styles.muted}>{hospital.description}</p>
              <div className={styles.metaRow}>
                {hospital.specialties.slice(0, 4).map((specialty) => (
                  <span className={styles.pill} key={specialty}>
                    {specialty}
                  </span>
                ))}
              </div>
              <p className={styles.muted}>
                Fee from Rs. {hospital.consultation_fee} · {hospital.emergency_available ? 'Emergency 24 x 7' : 'OPD only'}
              </p>
              <Link className={styles.button} to="/appointments" state={{ hospitalId: hospital.id }}>
                Book Appointment
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Hospitals;
