import React from 'react';

import styles from './FeatureCard.module.css';

function FeatureCard({ title, description, badge }) {
  return (
    <article className={styles.card}>
      <div className={styles.badge}>{badge}</div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
    </article>
  );
}

export default FeatureCard;
