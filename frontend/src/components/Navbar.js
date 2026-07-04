import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { FiHome, FiActivity, FiSearch, FiCalendar, FiBookOpen, FiUser, FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import styles from './Navbar.module.css';

function Navbar({ isAuthenticated, onLogout }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className="container">
        <div className={styles.navbar}>
          {/* Logo */}
          <Link className={styles.brand} to="/" onClick={closeMenu}>
            <span className={styles.brandMark}>+</span>
            <span className={styles.brandText}>CarePlus</span>
          </Link>

          {/* Hamburger Menu Icon */}
          <button className={styles.menuToggle} onClick={toggleMenu} aria-label="Toggle Navigation menu">
            {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>

          {/* Links */}
          <nav className={`${styles.links} ${menuOpen ? styles.open : ''}`}>
            <NavLink
              className={({ isActive }) => (isActive ? `${styles.link} ${styles.activeLink}` : styles.link)}
              to="/"
              onClick={closeMenu}
            >
              <FiHome className={styles.navIcon} />
              <span>Home</span>
            </NavLink>

            {isAuthenticated ? (
              <>
                <NavLink
                  className={({ isActive }) => (isActive ? `${styles.link} ${styles.activeLink}` : styles.link)}
                  to="/dashboard"
                  onClick={closeMenu}
                >
                  <FiActivity className={styles.navIcon} />
                  <span>Dashboard</span>
                </NavLink>
                <NavLink
                  className={({ isActive }) => (isActive ? `${styles.link} ${styles.activeLink}` : styles.link)}
                  to="/symptom-checker"
                  onClick={closeMenu}
                >
                  <FiActivity className={styles.navIcon} style={{ color: 'var(--cp-accent)' }} />
                  <span>Symptom Checker</span>
                </NavLink>
                <NavLink
                  className={({ isActive }) => (isActive ? `${styles.link} ${styles.activeLink}` : styles.link)}
                  to="/hospitals"
                  onClick={closeMenu}
                >
                  <FiSearch className={styles.navIcon} />
                  <span>Hospitals</span>
                </NavLink>
                <NavLink
                  className={({ isActive }) => (isActive ? `${styles.link} ${styles.activeLink}` : styles.link)}
                  to="/appointments"
                  onClick={closeMenu}
                >
                  <FiCalendar className={styles.navIcon} />
                  <span>Appointments</span>
                </NavLink>
                <NavLink
                  className={({ isActive }) => (isActive ? `${styles.link} ${styles.activeLink}` : styles.link)}
                  to="/about"
                  onClick={closeMenu}
                >
                  <FiBookOpen className={styles.navIcon} />
                  <span>About</span>
                </NavLink>
                <NavLink
                  className={({ isActive }) => (isActive ? `${styles.link} ${styles.activeLink}` : styles.link)}
                  to="/profile"
                  onClick={closeMenu}
                >
                  <div className={styles.avatarWrapper}>
                    <FiUser size={16} />
                  </div>
                  <span>Profile</span>
                </NavLink>
                <button className={styles.logoutButton} onClick={() => { onLogout(); closeMenu(); }} type="button">
                  <FiLogOut size={16} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <NavLink
                  className={({ isActive }) => (isActive ? `${styles.link} ${styles.activeLink}` : styles.link)}
                  to="/hospitals"
                  onClick={closeMenu}
                >
                  <FiSearch className={styles.navIcon} />
                  <span>Hospitals</span>
                </NavLink>
                <NavLink
                  className={({ isActive }) => (isActive ? `${styles.link} ${styles.activeLink}` : styles.link)}
                  to="/about"
                  onClick={closeMenu}
                >
                  <FiBookOpen className={styles.navIcon} />
                  <span>About</span>
                </NavLink>
                <NavLink
                  className={({ isActive }) => (isActive ? `${styles.link} ${styles.activeLink}` : styles.link)}
                  to="/login"
                  onClick={closeMenu}
                >
                  <span>Login</span>
                </NavLink>
                <NavLink
                  className={({ isActive }) => `${styles.authButton} ${isActive ? styles.authButtonActive : ''}`}
                  to="/register"
                  onClick={closeMenu}
                >
                  <span>Register</span>
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
