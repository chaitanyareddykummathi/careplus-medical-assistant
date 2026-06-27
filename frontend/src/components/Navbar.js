import React from 'react';
import { Link, NavLink } from 'react-router-dom';

import styles from './Navbar.module.css';

function Navbar({ isAuthenticated, onLogout }) {
  return (
    <header className={styles.header}>
      <div className="container">
        <div className={styles.navbar}>
          <Link className={styles.brand} to="/">
            <span className={styles.brandMark}>+</span>
            CarePlus
          </Link>

          <nav className={styles.links}>
            <NavLink className={({ isActive }) => (isActive ? styles.activeLink : styles.link)} to="/">
              Home
            </NavLink>

            {isAuthenticated ? (
              <>
                <NavLink
                  className={({ isActive }) => (isActive ? styles.activeLink : styles.link)}
                  to="/symptom-checker"
                >
                  Symptom Checker
                </NavLink>
                <NavLink
                  className={({ isActive }) => (isActive ? styles.activeLink : styles.link)}
                  to="/hospitals"
                >
                  Hospitals
                </NavLink>
                <NavLink
                  className={({ isActive }) => (isActive ? styles.activeLink : styles.link)}
                  to="/appointments"
                >
                  Appointments
                </NavLink>
                <NavLink className={({ isActive }) => (isActive ? styles.activeLink : styles.link)} to="/about">
                  About
                </NavLink>
                <NavLink className={({ isActive }) => (isActive ? styles.activeLink : styles.link)} to="/profile">
                  Profile
                </NavLink>
                <button className={styles.logoutButton} onClick={onLogout} type="button">
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink
                  className={({ isActive }) => (isActive ? styles.activeLink : styles.link)}
                  to="/hospitals"
                >
                  Hospitals
                </NavLink>
                <NavLink className={({ isActive }) => (isActive ? styles.activeLink : styles.link)} to="/about">
                  About
                </NavLink>
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
