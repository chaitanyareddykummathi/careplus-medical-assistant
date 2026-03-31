import React from 'react';

import styles from './Footer.module.css';

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <p className={styles.text}>
          Disclaimer: CarePlus provides AI-assisted guidance and is not a substitute for emergency
          or professional medical diagnosis.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
