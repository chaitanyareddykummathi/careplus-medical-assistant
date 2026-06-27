import React from 'react';

import styles from './CarePages.module.css';

function About() {
  return (
    <section className={styles.page}>
      <div className="container">
        <p className={styles.eyebrow}>About CarePlus</p>
        <h1 className={styles.title}>AI-assisted triage for a practical healthcare project</h1>
        <p className={styles.subtitle}>
          CarePlus combines authentication, health profile context, deterministic NLP triage, simulated hospital
          recommendation and appointment booking into one maintainable full-stack application.
        </p>

        <div className={`${styles.grid} ${styles.section}`}>
          {[
            ['Clinical caution', 'Outputs are structured as triage guidance and always include a medical disclaimer.'],
            ['Project realism', 'Hospitals, doctors and appointment slots are simulated without relying on paid APIs.'],
            ['Maintainability', 'Backend services, schemas and routes are separated so each feature is easy to understand.'],
          ].map(([title, text]) => (
            <article className={styles.card} key={title}>
              <h2 className={styles.cardTitle}>{title}</h2>
              <p className={styles.muted}>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default About;
