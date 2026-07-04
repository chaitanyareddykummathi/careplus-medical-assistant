import React from 'react';
import { motion } from 'framer-motion';
import styles from './FeatureCard.module.css';

function FeatureCard({ title, description, icon: Icon, badge, color = 'primary' }) {
  const getAccentColor = () => {
    switch (color) {
      case 'accent': return 'var(--cp-accent)';
      case 'success': return 'var(--cp-success)';
      case 'warning': return 'var(--cp-warning)';
      case 'danger': return 'var(--cp-danger)';
      default: return 'var(--cp-primary)';
    }
  };

  return (
    <motion.article
      className={styles.card}
      whileHover={{ y: -8, boxShadow: 'var(--shadow-hover)' }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className={styles.header}>
        {Icon ? (
          <div className={styles.iconWrapper} style={{ '--accent-color': getAccentColor() }}>
            <Icon size={24} className={styles.icon} />
          </div>
        ) : null}
        {badge ? <span className={styles.badge}>{badge}</span> : null}
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
    </motion.article>
  );
}

export default FeatureCard;
