import React from 'react';
import { Link, NavLink } from 'react-router-dom';

import styles from './Navbar.module.css';

function Navbar({ isAuthenticated, onLogout }) {
  return (
    <header className={styles.header}>
      <div className="container">
        <div className={styles.navbar}>
          <Link className={styles.brand} to="/">
            CarePlus
          </Link>

          <nav className={styles.links}>
            <NavLink className={({ isActive }) => (isActive ? styles.activeLink : styles.link)} to="/">
              Home
            </NavLink>
            <a className={styles.link} href="/#features">
              Features
            </a>

            {isAuthenticated ? (
              <>
                <NavLink
                  className={({ isActive }) => (isActive ? styles.activeLink : styles.link)}
                  to="/dashboard"
                >
                  Dashboard
                </NavLink>
                <NavLink
                  className={({ isActive }) => (isActive ? styles.activeLink : styles.link)}
                  to="/health-profile"
                >
                  Health Profile
                </NavLink>
                <NavLink
                  className={({ isActive }) => (isActive ? styles.activeLink : styles.link)}
                  to="/symptom-checker"
                >
                  Symptom Checker
                </NavLink>
                <button className={styles.logoutButton} onClick={onLogout} type="button">
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink
                  className={({ isActive }) => (isActive ? styles.activeLink : styles.link)}
                  to="/login"
                >
                  Login
                </NavLink>
                <NavLink
                  className={({ isActive }) =>
                    isActive ? `${styles.authButton} ${styles.authButtonActive}` : styles.authButton
                  }
                  to="/register"
                >
                  Register
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
